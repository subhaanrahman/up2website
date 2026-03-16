import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

const dmSchema = z.object({
  type: z.literal('dm'),
  thread_id: z.string().uuid(),
  content: z.string().min(1).max(5000),
});

const groupSchema = z.object({
  type: z.literal('group'),
  group_chat_id: z.string().uuid(),
  sender_name: z.string().min(1).max(100),
  content: z.string().min(1).max(5000),
});

const eventBoardSchema = z.object({
  type: z.literal('event-board'),
  event_id: z.string().uuid(),
  content: z.string().min(1).max(5000),
});

const bodySchema = z.discriminatedUnion('type', [dmSchema, groupSchema, eventBoardSchema]);

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

    if (data.type === 'dm') {
      // Verify caller is a participant in the thread
      const { data: thread } = await serviceClient
        .from('dm_threads')
        .select('user_id, organiser_profile_id')
        .eq('id', data.thread_id)
        .maybeSingle();

      if (!thread) {
        return errorResponse(404, 'Thread not found', { requestId });
      }

      // User must be the user_id on the thread, or own/be a member of the organiser profile
      let authorized = thread.user_id === user.id;
      if (!authorized && thread.organiser_profile_id) {
        const [ownerCheck, memberCheck] = await Promise.all([
          serviceClient.from('organiser_profiles').select('owner_id').eq('id', thread.organiser_profile_id).maybeSingle(),
          serviceClient.from('organiser_members').select('id').eq('organiser_profile_id', thread.organiser_profile_id).eq('user_id', user.id).eq('status', 'accepted').maybeSingle(),
        ]);
        authorized = ownerCheck.data?.owner_id === user.id || !!memberCheck.data;
      }

      if (!authorized) {
        return errorResponse(403, 'Not a participant in this thread', { requestId });
      }

      const { error: insertErr } = await serviceClient.from('dm_messages').insert({
        thread_id: data.thread_id,
        sender_id: user.id,
        content: data.content,
      });

      if (insertErr) {
        edgeLog('error', 'Failed to send DM', { requestId, error: String(insertErr) });
        return errorResponse(500, 'Failed to send message', { requestId });
      }

      edgeLog('info', 'DM sent', { requestId, threadId: data.thread_id });
      return successResponse({ success: true }, requestId);
    }

    if (data.type === 'group') {
      // Verify caller is a member of the group chat
      const { data: membership } = await serviceClient
        .from('group_chat_members')
        .select('user_id')
        .eq('group_chat_id', data.group_chat_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!membership) {
        return errorResponse(403, 'Not a member of this group chat', { requestId });
      }

      const { error: insertErr } = await serviceClient.from('group_chat_messages').insert({
        group_chat_id: data.group_chat_id,
        sender_id: user.id,
        sender_name: data.sender_name,
        content: data.content,
        is_from_current_user: true,
      });

      if (insertErr) {
        edgeLog('error', 'Failed to send group message', { requestId, error: String(insertErr) });
        return errorResponse(500, 'Failed to send message', { requestId });
      }

      edgeLog('info', 'Group message sent', { requestId, groupChatId: data.group_chat_id });
      return successResponse({ success: true }, requestId);
    }

    if (data.type === 'event-board') {
      const { error: insertErr } = await serviceClient.from('event_messages').insert({
        event_id: data.event_id,
        user_id: user.id,
        content: data.content,
      });

      if (insertErr) {
        edgeLog('error', 'Failed to send event message', { requestId, error: String(insertErr) });
        return errorResponse(500, 'Failed to send message', { requestId });
      }

      edgeLog('info', 'Event board message sent', { requestId, eventId: data.event_id });
      return successResponse({ success: true }, requestId);
    }

    return errorResponse(400, 'Unknown message type', { requestId });
  } catch (err) {
    edgeLog('error', 'message-send error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
