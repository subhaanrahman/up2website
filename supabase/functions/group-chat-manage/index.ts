import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

const addMembersSchema = z.object({
  action: z.literal('add-members'),
  chat_id: z.string().uuid(),
  user_ids: z.array(z.string().uuid()).min(1).max(50),
});

const removeMemberSchema = z.object({
  action: z.literal('remove-member'),
  chat_id: z.string().uuid(),
  user_id: z.string().uuid(),
});

const renameSchema = z.object({
  action: z.literal('rename'),
  chat_id: z.string().uuid(),
  name: z.string().min(1).max(100),
});

const leaveSchema = z.object({
  action: z.literal('leave'),
  chat_id: z.string().uuid(),
});

const bodySchema = z.discriminatedUnion('action', [
  addMembersSchema,
  removeMemberSchema,
  renameSchema,
  leaveSchema,
]);

async function isMember(serviceClient: any, chatId: string, userId: string): Promise<boolean> {
  const { data } = await serviceClient
    .from('group_chat_members')
    .select('user_id')
    .eq('group_chat_id', chatId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

async function getMemberCount(serviceClient: any, chatId: string): Promise<number> {
  const { count } = await serviceClient
    .from('group_chat_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('group_chat_id', chatId);
  return count ?? 0;
}

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

    // Verify caller is a member of the chat
    if (!(await isMember(serviceClient, data.chat_id, user.id))) {
      return errorResponse(403, 'You are not a member of this chat', { requestId });
    }

    if (data.action === 'add-members') {
      const { error: insertErr } = await serviceClient
        .from('group_chat_members')
        .insert(data.user_ids.map(uid => ({ group_chat_id: data.chat_id, user_id: uid })));

      if (insertErr) {
        edgeLog('error', 'Failed to add members', { requestId, error: String(insertErr) });
        return errorResponse(500, 'Failed to add members', { requestId });
      }

      const newCount = await getMemberCount(serviceClient, data.chat_id);
      await serviceClient.from('group_chats').update({ member_count: newCount }).eq('id', data.chat_id);

      edgeLog('info', 'Members added to group chat', { requestId, chatId: data.chat_id, added: data.user_ids.length });
      return successResponse({ success: true, member_count: newCount }, requestId);
    }

    if (data.action === 'remove-member') {
      const { error: delErr } = await serviceClient
        .from('group_chat_members')
        .delete()
        .eq('group_chat_id', data.chat_id)
        .eq('user_id', data.user_id);

      if (delErr) {
        edgeLog('error', 'Failed to remove member', { requestId, error: String(delErr) });
        return errorResponse(500, 'Failed to remove member', { requestId });
      }

      const newCount = await getMemberCount(serviceClient, data.chat_id);
      await serviceClient.from('group_chats').update({ member_count: newCount }).eq('id', data.chat_id);

      edgeLog('info', 'Member removed from group chat', { requestId, chatId: data.chat_id, removedUserId: data.user_id });
      return successResponse({ success: true, member_count: newCount }, requestId);
    }

    if (data.action === 'rename') {
      const { error: updErr } = await serviceClient
        .from('group_chats')
        .update({ name: data.name })
        .eq('id', data.chat_id);

      if (updErr) {
        edgeLog('error', 'Failed to rename chat', { requestId, error: String(updErr) });
        return errorResponse(500, 'Failed to rename chat', { requestId });
      }

      edgeLog('info', 'Group chat renamed', { requestId, chatId: data.chat_id });
      return successResponse({ success: true }, requestId);
    }

    if (data.action === 'leave') {
      const { error: delErr } = await serviceClient
        .from('group_chat_members')
        .delete()
        .eq('group_chat_id', data.chat_id)
        .eq('user_id', user.id);

      if (delErr) {
        edgeLog('error', 'Failed to leave chat', { requestId, error: String(delErr) });
        return errorResponse(500, 'Failed to leave chat', { requestId });
      }

      const newCount = await getMemberCount(serviceClient, data.chat_id);
      await serviceClient.from('group_chats').update({ member_count: newCount }).eq('id', data.chat_id);

      edgeLog('info', 'User left group chat', { requestId, chatId: data.chat_id, userId: user.id });
      return successResponse({ success: true, member_count: newCount }, requestId);
    }

    return errorResponse(400, 'Unknown action', { requestId });
  } catch (err) {
    edgeLog('error', 'group-chat-manage error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
