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
    if (!anonKey?.trim()) {
      edgeLog('error', 'organiser-profile-create: SUPABASE_ANON_KEY missing', { requestId });
      return errorResponse(500, 'Missing SUPABASE_ANON_KEY in Edge Function secrets.', { requestId });
    }

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
        edgeLog('warn', 'organiser-profile-create: setSession', { requestId, message: sessionErr.message });
      }
    }

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

    // Avatar: storage policy requires first path segment = auth.uid(); use uid/org-{username}/… to avoid clobbering personal initials.
    let avatarUrl: string | null = null;
    try {
      const pathPrefix = `${user.id}/organiser/org-${parsed.data.username}`;
      avatarUrl = await generateAndUploadInitialsAvatar(
        supabase,
        pathPrefix,
        parsed.data.display_name,
      );
    } catch (avatarErr) {
      edgeLog('error', 'Organiser avatar generation failed (non-fatal)', { requestId, error: String(avatarErr) });
    }

    // INSERT revoked from authenticated; use SECURITY DEFINER RPC (migration 20260324150000) so PostgREST role is irrelevant.
    const { data: rpcRows, error } = await supabase.rpc('create_organiser_profile', {
      p_display_name: parsed.data.display_name,
      p_username: parsed.data.username,
      p_bio: parsed.data.bio ?? null,
      p_city: parsed.data.city ?? null,
      p_instagram_handle: parsed.data.instagram_handle ?? null,
      p_category: parsed.data.category,
      p_avatar_url: avatarUrl,
    });

    if (error) {
      if (error.code === '23505') {
        return errorResponse(409, 'Username already taken', { requestId });
      }
      if (error.code === '28000' || /not authenticated/i.test(error.message ?? '')) {
        return errorResponse(401, 'Unauthorized', { requestId });
      }
      if (error.code === '22023') {
        return errorResponse(400, error.message, { requestId });
      }
      return errorResponse(500, error.message, { requestId });
    }

    const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
    if (!row?.id) {
      edgeLog('error', 'organiser-profile-create: empty rpc row', { requestId });
      return errorResponse(500, 'Profile creation returned no data', { requestId });
    }

    return successResponse({ success: true, profile: row }, requestId);
  } catch (err) {
    edgeLog('error', 'Internal error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal error', { requestId });
  }
});
