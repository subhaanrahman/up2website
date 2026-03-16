import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

const CATEGORIES = ['Venue', 'Event'] as const;

const updateSchema = z.object({
  profile_id: z.string().uuid(),
  display_name: z.string().trim().min(1).max(100).optional(),
  username: z.string().regex(/^[a-z0-9_]{3,30}$/, 'Username must be 3-30 lowercase alphanumeric or underscores').optional(),
  bio: z.string().trim().max(500).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  instagram_handle: z.string().trim().max(30).regex(/^[a-zA-Z0-9._]*$/, 'Invalid Instagram handle').optional().nullable(),
  category: z.enum(CATEGORIES).optional(),
  opening_hours: z.record(z.string(), z.string()).optional().nullable(),
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

    const allowed = await checkRateLimit('organiser-profile-update', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'Invalid input', { requestId, details: parsed.error.flatten().fieldErrors });
    }

    const { profile_id, ...updates } = parsed.data;

    // Use service role to update
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify ownership
    const { data: existing, error: fetchErr } = await serviceClient
      .from('organiser_profiles')
      .select('id, owner_id')
      .eq('id', profile_id)
      .single();

    if (fetchErr || !existing) {
      return errorResponse(404, 'Profile not found', { requestId });
    }

    if (existing.owner_id !== user.id) {
      return errorResponse(403, 'Forbidden', { requestId });
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (updates.display_name !== undefined) updateData.display_name = updates.display_name;
    if (updates.username !== undefined) updateData.username = updates.username;
    if (updates.bio !== undefined) updateData.bio = updates.bio || null;
    if (updates.city !== undefined) updateData.city = updates.city || null;
    if (updates.instagram_handle !== undefined) updateData.instagram_handle = updates.instagram_handle || null;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.opening_hours !== undefined) updateData.opening_hours = updates.opening_hours;
    
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await serviceClient
      .from('organiser_profiles')
      .update(updateData)
      .eq('id', profile_id)
      .select('id, display_name, username, category')
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
