import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { generateAndUploadInitialsAvatar } from "../_shared/avatar.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

const CATEGORIES = ['Venue', 'Event'] as const;

const createSchema = z.object({
  display_name: z.string().trim().min(1).max(100),
  username: z.string().regex(/^[a-z0-9_]{3,30}$/, 'Username must be 3-30 lowercase alphanumeric or underscores'),
  bio: z.string().trim().max(500).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  instagram_handle: z.string().trim().max(30).regex(/^[a-zA-Z0-9._]*$/, 'Invalid Instagram handle').optional().nullable(),
  category: z.enum(CATEGORIES).default('Venue'),
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

    const allowed = await checkRateLimit('organiser-profile-create', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'Invalid input', { requestId, details: parsed.error.flatten().fieldErrors });
    }

    // Use service role to insert (DML revoked from authenticated)
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Generate initials avatar for the organiser profile
    let avatarUrl: string | null = null;
    try {
      // Use a unique key based on the organiser username to avoid collisions with personal avatars
      const tempId = `org-${parsed.data.username}`;
      avatarUrl = await generateAndUploadInitialsAvatar(
        serviceClient,
        tempId,
        parsed.data.display_name,
      );
    } catch (avatarErr) {
      edgeLog('error', 'Organiser avatar generation failed (non-fatal)', { requestId, error: String(avatarErr) });
    }

    const { data, error } = await serviceClient
      .from('organiser_profiles')
      .insert({
        owner_id: user.id,
        display_name: parsed.data.display_name,
        username: parsed.data.username,
        bio: parsed.data.bio || null,
        city: parsed.data.city || null,
        instagram_handle: parsed.data.instagram_handle || null,
        category: parsed.data.category,
        avatar_url: avatarUrl,
      })
      .select('id, display_name, username, category, avatar_url')
      .single();

    if (error) {
      if (error.code === '23505') {
        return errorResponse(409, 'Username already taken', { requestId });
      }
      return errorResponse(500, error.message, { requestId });
    }

    return successResponse({ success: true, profile: data }, requestId);
  } catch (err) {
    edgeLog('error', 'Internal error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal error', { requestId });
  }
});
