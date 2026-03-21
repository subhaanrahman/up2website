import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

const insertSchema = z.object({
  action: z.literal('insert'),
  event_id: z.string().uuid(),
  url: z.string().url(),
  sort_order: z.number().int().min(0).default(0),
});

const deleteSchema = z.object({
  action: z.literal('delete'),
  media_id: z.string().uuid(),
});

const bodySchema = z.discriminatedUnion('action', [insertSchema, deleteSchema]);

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

    if (data.action === 'insert') {
      // Verify caller is host or organiser owner/member for this event
      const { data: event } = await serviceClient
        .from('events')
        .select('host_id, organiser_profile_id')
        .eq('id', data.event_id)
        .maybeSingle();

      if (!event) {
        return errorResponse(404, 'Event not found', { requestId });
      }

      let authorized = event.host_id === user.id;
      if (!authorized && event.organiser_profile_id) {
        const [ownerCheck, memberCheck] = await Promise.all([
          serviceClient.from('organiser_profiles').select('owner_id').eq('id', event.organiser_profile_id).maybeSingle(),
          serviceClient.from('organiser_members').select('id').eq('organiser_profile_id', event.organiser_profile_id).eq('user_id', user.id).eq('status', 'accepted').maybeSingle(),
        ]);
        authorized = ownerCheck.data?.owner_id === user.id || !!memberCheck.data;
      }

      if (!authorized) {
        return errorResponse(403, 'Not authorized to manage media for this event', { requestId });
      }

      const { error: insertErr } = await serviceClient.from('event_media').insert({
        event_id: data.event_id,
        url: data.url,
        uploaded_by: user.id,
        sort_order: data.sort_order,
      });

      if (insertErr) {
        edgeLog('error', 'Failed to insert media', { requestId, error: String(insertErr) });
        return errorResponse(500, 'Failed to insert media', { requestId });
      }

      edgeLog('info', 'Event media inserted', { requestId, eventId: data.event_id });
      return successResponse({ success: true }, requestId);
    }

    if (data.action === 'delete') {
      // Look up the media to find its event, then verify authorization
      const { data: media } = await serviceClient
        .from('event_media')
        .select('event_id, url')
        .eq('id', data.media_id)
        .maybeSingle();

      if (!media) {
        return errorResponse(404, 'Media not found', { requestId });
      }

      const { data: event } = await serviceClient
        .from('events')
        .select('host_id, organiser_profile_id')
        .eq('id', media.event_id)
        .maybeSingle();

      if (!event) {
        return errorResponse(404, 'Event not found', { requestId });
      }

      let authorized = event.host_id === user.id;
      if (!authorized && event.organiser_profile_id) {
        const [ownerCheck, memberCheck] = await Promise.all([
          serviceClient.from('organiser_profiles').select('owner_id').eq('id', event.organiser_profile_id).maybeSingle(),
          serviceClient.from('organiser_members').select('id').eq('organiser_profile_id', event.organiser_profile_id).eq('user_id', user.id).eq('status', 'accepted').maybeSingle(),
        ]);
        authorized = ownerCheck.data?.owner_id === user.id || !!memberCheck.data;
      }

      if (!authorized) {
        return errorResponse(403, 'Not authorized to manage media for this event', { requestId });
      }

      let storagePath: string | null = null;
      try {
        const urlObj = new URL(media.url);
        const match = urlObj.pathname.match(/event-media\/(.+)$/);
        storagePath = match?.[1] ?? null;
      } catch {
        storagePath = null;
      }

      if (storagePath) {
        const { error: storageErr } = await serviceClient.storage
          .from('event-media')
          .remove([storagePath]);
        if (storageErr) {
          edgeLog('warn', 'Failed to delete media storage object', {
            requestId,
            mediaId: data.media_id,
            error: String(storageErr),
          });
        }
      }

      const { error: delErr } = await serviceClient.from('event_media').delete().eq('id', data.media_id);

      if (delErr) {
        edgeLog('error', 'Failed to delete media', { requestId, error: String(delErr) });
        return errorResponse(500, 'Failed to delete media', { requestId });
      }

      edgeLog('info', 'Event media deleted', { requestId, mediaId: data.media_id });
      return successResponse({ success: true }, requestId);
    }

    return errorResponse(400, 'Unknown action', { requestId });
  } catch (err) {
    edgeLog('error', 'event-media-manage error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
