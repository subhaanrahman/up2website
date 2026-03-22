import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";
import { isEventMediaManager } from "../_shared/event-media-auth.ts";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const initSchema = z.object({
  action: z.literal('init'),
  event_id: z.string().uuid(),
  file_name: z.string().min(1),
  content_type: z.enum(ALLOWED_IMAGE_TYPES),
  file_size: z.number().int().min(1).max(MAX_FILE_SIZE_BYTES),
  sort_order: z.number().int().min(0).default(0),
});

const completeSchema = z.object({
  action: z.literal('complete'),
  event_id: z.string().uuid(),
  path: z.string().min(1),
  sort_order: z.number().int().min(0).default(0),
});

const bodySchema = z.discriminatedUnion('action', [initSchema, completeSchema]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse(401, 'Not authenticated', { requestId });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse(401, 'Invalid token', { requestId });
    }

    const allowed = await checkRateLimit('event-media-upload', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'Invalid input', { requestId, details: parsed.error.flatten().fieldErrors });
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const data = parsed.data;

    const { data: event } = await serviceClient
      .from('events')
      .select('id, host_id, organiser_profile_id')
      .eq('id', data.event_id)
      .maybeSingle();

    if (!event) {
      return errorResponse(404, 'Event not found', { requestId });
    }

    let organiserOwnerId: string | null = null;
    let isMember = false;

    if (event.organiser_profile_id) {
      const [ownerCheck, memberCheck] = await Promise.all([
        serviceClient.from('organiser_profiles').select('owner_id').eq('id', event.organiser_profile_id).maybeSingle(),
        serviceClient.from('organiser_members').select('id').eq('organiser_profile_id', event.organiser_profile_id).eq('user_id', user.id).eq('status', 'accepted').maybeSingle(),
      ]);
      organiserOwnerId = ownerCheck.data?.owner_id ?? null;
      isMember = !!memberCheck.data;
    }

    if (!isEventMediaManager({
      userId: user.id,
      hostId: event.host_id,
      organiserOwnerId,
      isOrganiserMember: isMember,
    })) {
      return errorResponse(403, 'Not authorized to manage media for this event', { requestId });
    }

    if (data.action === 'init') {
      const ext = data.file_name.includes('.')
        ? data.file_name.split('.').pop()
        : data.content_type.split('/').pop();
      const safeExt = (ext || 'jpg').toLowerCase();
      const path = `${user.id}/${data.event_id}/${crypto.randomUUID()}.${safeExt}`;

      const { data: signed, error: signedErr } = await serviceClient.storage
        .from('event-media')
        .createSignedUploadUrl(path);

      if (signedErr || !signed?.signedUrl) {
        edgeLog('error', 'Signed upload URL failed', { requestId, error: String(signedErr) });
        return errorResponse(500, 'Failed to prepare upload', { requestId });
      }

      return successResponse({
        upload_url: signed.signedUrl,
        path,
        sort_order: data.sort_order,
      }, requestId);
    }

    // complete
    if (!data.path.includes(`/${data.event_id}/`)) {
      return errorResponse(400, 'Invalid upload path', { requestId });
    }

    const { data: publicUrlData } = serviceClient.storage
      .from('event-media')
      .getPublicUrl(data.path);

    const publicUrl = publicUrlData?.publicUrl;
    if (!publicUrl) {
      return errorResponse(500, 'Failed to resolve public URL', { requestId });
    }

    const { error: insertErr } = await serviceClient.from('event_media').insert({
      event_id: data.event_id,
      url: publicUrl,
      uploaded_by: user.id,
      sort_order: data.sort_order,
    });

    if (insertErr) {
      edgeLog('error', 'Failed to insert media', { requestId, error: String(insertErr) });
      return errorResponse(500, 'Failed to insert media', { requestId });
    }

    return successResponse({ success: true, url: publicUrl }, requestId);
  } catch (err) {
    edgeLog('error', 'event-media-upload error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
