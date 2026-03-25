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
  bio: z.preprocess((val) => (val === "" ? null : val), z.string().trim().max(500).optional().nullable()),
  city: z.string().trim().max(100).optional().nullable(),
  instagram_handle: z.string().trim().max(30).regex(/^[a-zA-Z0-9._]*$/, 'Invalid Instagram handle').optional().nullable(),
  category: z.enum(CATEGORIES).optional(),
  opening_hours: z.record(z.string(), z.string()).optional().nullable(),
});

function parseBearerAccessToken(authHeader: string | null): string | null {
  if (!authHeader?.toLowerCase().startsWith('bearer ')) return null;
  const t = authHeader.slice(7).trim();
  return t.length > 0 ? t : null;
}

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
          apikey: anonKey,
        },
      },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const accessToken = parseBearerAccessToken(authHeader);
    if (accessToken) {
      const { error: sessionErr } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: '',
      });
      if (sessionErr) {
        edgeLog('warn', 'organiser-profile-update: setSession', { requestId, message: sessionErr.message });
      }
    }

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

    const patch: Record<string, unknown> = {};
    if (updates.display_name !== undefined) patch.display_name = updates.display_name;
    if (updates.username !== undefined) patch.username = updates.username;
    if (updates.bio !== undefined) patch.bio = updates.bio;
    if (updates.city !== undefined) patch.city = updates.city;
    if (updates.instagram_handle !== undefined) patch.instagram_handle = updates.instagram_handle;
    if (updates.category !== undefined) patch.category = updates.category;
    if (updates.opening_hours !== undefined) patch.opening_hours = updates.opening_hours;

    const { data: rpcRows, error } = await supabase.rpc('update_organiser_profile', {
      p_profile_id: profile_id,
      p_patch: patch,
    });

    if (error) {
      const msg = error.message || '';
      if (error.code === 'P0002' || /profile not found/i.test(msg)) {
        return errorResponse(404, 'Profile not found', { requestId });
      }
      if (error.code === '42501' || /forbidden/i.test(msg)) {
        return errorResponse(403, 'Only the organiser owner can update this profile', { requestId });
      }
      if (error.code === '28000' || /not authenticated/i.test(msg)) {
        return errorResponse(401, 'Unauthorized', { requestId });
      }
      if (error.code === '22023' || /invalid category/i.test(msg)) {
        return errorResponse(400, msg, { requestId });
      }
      if (error.code === '23505' || /username already taken/i.test(msg)) {
        return errorResponse(409, 'Username already taken', { requestId });
      }
      edgeLog('warn', 'organiser-profile-update: rpc failed', { requestId, code: error.code, message: msg });
      return errorResponse(500, msg, { requestId });
    }

    const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
    if (!row?.id) {
      return errorResponse(500, 'Profile update returned no data', { requestId });
    }

    return successResponse({ success: true, profile: row }, requestId);
  } catch (err) {
    edgeLog('error', 'Internal error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal error', { requestId });
  }
});
