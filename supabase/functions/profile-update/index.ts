import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

const profileUpdateSchema = z.object({
  action: z.literal('update'),
  display_name: z.string().trim().max(100).optional(),
  username: z.string().regex(/^[a-zA-Z0-9_-]{3,30}$/, 'Username must be 3-30 alphanumeric characters, hyphens or underscores').optional(),
  bio: z.preprocess((val) => (val === "" ? null : val), z.string().trim().max(500).optional().nullable()),
  city: z.string().trim().max(100).optional().nullable(),
  page_classification: z.enum(['DJ', 'Promoter', 'Artist']).optional().nullable(),
  profile_tier: z.enum(['personal', 'professional']).optional(),
  avatar_url: z.string().url().max(500).optional(),
  instagram_handle: z.string().trim().max(30).regex(/^[a-zA-Z0-9._]*$/, 'Invalid Instagram handle').optional().nullable(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse(401, 'Missing authorization', { requestId });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse(401, 'Unauthorized', { requestId });
    }

    // Rate limit
    const allowed = await checkRateLimit('profile-update', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();

    // Validate input
    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'Invalid input', { requestId, details: parsed.error.flatten().fieldErrors });
    }

    const { action, ...fields } = parsed.data;

    // Map UI page_classification to DB enum
    const classificationMap: Record<string, string> = {
      'Personal': 'personal',
      'Venue': 'venue',
      'Promoter': 'organizer',
      'Artist': 'organizer',
      'DJ': 'organizer',
      'Brand': 'organizer',
      'Organization': 'organizer',
    };

    // Build update object from validated fields only
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        if (key === 'page_classification' && typeof value === 'string') {
          updates[key] = value; // Store the original UI value for display
        } else {
          updates[key] = value;
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse(400, 'No valid fields provided', { requestId });
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (error) {
      return errorResponse(500, error.message, { requestId });
    }

    // Sync to auth.users: display_name column in Auth dashboard shows @username
    if ('username' in updates || 'display_name' in updates) {
      const serviceClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('display_name, username')
        .eq('user_id', user.id)
        .single();
      if (profile) {
        const meta = {
          ...user.user_metadata,
          display_name: profile.username ? `@${profile.username}` : profile.display_name,
          username: profile.username,
        };
        await serviceClient.auth.admin.updateUserById(user.id, { user_metadata: meta });
      }
    }

    return successResponse({ success: true }, requestId);
  } catch (err) {
    edgeLog('error', 'Internal error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal error', { requestId });
  }
});
