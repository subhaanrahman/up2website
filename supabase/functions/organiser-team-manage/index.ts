import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

const inviteSchema = z.object({
  action: z.literal('invite'),
  organiser_profile_id: z.string().uuid(),
  target_user_id: z.string().uuid(),
  role: z.string().min(1).max(50),
});

const removeSchema = z.object({
  action: z.literal('remove'),
  member_id: z.string().uuid(),
});

const updateRoleSchema = z.object({
  action: z.literal('update-role'),
  member_id: z.string().uuid(),
  role: z.string().min(1).max(50),
});

const bodySchema = z.discriminatedUnion('action', [inviteSchema, removeSchema, updateRoleSchema]);

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

    if (data.action === 'invite') {
      // Verify caller is owner of the organiser profile
      const { data: org } = await serviceClient
        .from('organiser_profiles')
        .select('owner_id')
        .eq('id', data.organiser_profile_id)
        .single();

      if (!org || org.owner_id !== user.id) {
        return errorResponse(403, 'Only the owner can manage team members', { requestId });
      }

      const { error: insertErr } = await serviceClient
        .from('organiser_members')
        .insert({
          organiser_profile_id: data.organiser_profile_id,
          user_id: data.target_user_id,
          role: data.role,
          status: 'pending',
          invited_by: user.id,
        });

      if (insertErr) {
        if (insertErr.code === '23505') {
          return errorResponse(409, 'User is already a team member', { requestId });
        }
        edgeLog('error', 'Failed to invite member', { requestId, error: String(insertErr) });
        return errorResponse(500, 'Failed to invite member', { requestId });
      }

      edgeLog('info', 'Team member invited', { requestId, organiserProfileId: data.organiser_profile_id, targetUserId: data.target_user_id });
      return successResponse({ success: true }, requestId);
    }

    if (data.action === 'remove') {
      // Look up member to verify ownership
      const { data: member } = await serviceClient
        .from('organiser_members')
        .select('organiser_profile_id')
        .eq('id', data.member_id)
        .single();

      if (!member) {
        return errorResponse(404, 'Member not found', { requestId });
      }

      const { data: org } = await serviceClient
        .from('organiser_profiles')
        .select('owner_id')
        .eq('id', member.organiser_profile_id)
        .single();

      if (!org || org.owner_id !== user.id) {
        return errorResponse(403, 'Only the owner can remove team members', { requestId });
      }

      const { error: delErr } = await serviceClient
        .from('organiser_members')
        .delete()
        .eq('id', data.member_id);

      if (delErr) {
        edgeLog('error', 'Failed to remove member', { requestId, error: String(delErr) });
        return errorResponse(500, 'Failed to remove member', { requestId });
      }

      edgeLog('info', 'Team member removed', { requestId, memberId: data.member_id });
      return successResponse({ success: true }, requestId);
    }

    if (data.action === 'update-role') {
      const { data: member } = await serviceClient
        .from('organiser_members')
        .select('organiser_profile_id')
        .eq('id', data.member_id)
        .single();

      if (!member) {
        return errorResponse(404, 'Member not found', { requestId });
      }

      const { data: org } = await serviceClient
        .from('organiser_profiles')
        .select('owner_id')
        .eq('id', member.organiser_profile_id)
        .single();

      if (!org || org.owner_id !== user.id) {
        return errorResponse(403, 'Only the owner can update roles', { requestId });
      }

      const { error: updErr } = await serviceClient
        .from('organiser_members')
        .update({ role: data.role })
        .eq('id', data.member_id);

      if (updErr) {
        edgeLog('error', 'Failed to update role', { requestId, error: String(updErr) });
        return errorResponse(500, 'Failed to update role', { requestId });
      }

      edgeLog('info', 'Team member role updated', { requestId, memberId: data.member_id, newRole: data.role });
      return successResponse({ success: true }, requestId);
    }

    return errorResponse(400, 'Unknown action', { requestId });
  } catch (err) {
    edgeLog('error', 'organiser-team-manage error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
