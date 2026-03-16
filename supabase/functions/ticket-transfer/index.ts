import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

const ticketSchema = z.object({
  ticket_id: z.string().uuid(),
  recipient_username: z.string().min(1),
});

const eventSchema = z.object({
  event_id: z.string().uuid(),
  recipient_user_id: z.string().uuid(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      edgeLog('warn', 'Missing auth header', { requestId });
      return errorResponse(401, 'Not authenticated', { requestId });
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return errorResponse(401, 'Invalid token', { requestId });
    }

    const body = await req.json();

    const ticketParsed = ticketSchema.safeParse(body);
    const eventParsed = eventSchema.safeParse(body);

    if (ticketParsed.success) {
      return await handleTicketTransfer(serviceClient, user.id, ticketParsed.data, requestId);
    }

    if (eventParsed.success) {
      return await handleEventTransfer(serviceClient, user.id, eventParsed.data, requestId);
    }

    return errorResponse(400, 'Invalid input: provide either {ticket_id, recipient_username} or {event_id, recipient_user_id}', { requestId });
  } catch (err) {
    edgeLog('error', 'Unexpected error in ticket-transfer', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});

async function handleTicketTransfer(
  serviceClient: any,
  userId: string,
  input: { ticket_id: string; recipient_username: string },
  requestId: string,
): Promise<Response> {
  const { ticket_id, recipient_username } = input;

  const { data: ticket, error: ticketError } = await serviceClient
    .from('tickets')
    .select('id, user_id, status, event_id')
    .eq('id', ticket_id)
    .single();

  if (ticketError || !ticket) {
    edgeLog('warn', 'Ticket not found', { requestId, ticket_id });
    return errorResponse(404, 'Ticket not found', { requestId });
  }

  if (ticket.user_id !== userId) {
    return errorResponse(403, 'You do not own this ticket', { requestId });
  }

  if (ticket.status !== 'valid') {
    return errorResponse(400, 'Only valid tickets can be transferred', { requestId });
  }

  const { data: recipient, error: recipientError } = await serviceClient
    .from('profiles')
    .select('user_id')
    .eq('username', recipient_username)
    .single();

  if (recipientError || !recipient) {
    return errorResponse(404, 'Recipient not found', { requestId });
  }

  if (recipient.user_id === userId) {
    return errorResponse(400, 'Cannot transfer to yourself', { requestId });
  }

  const { error: updateError } = await serviceClient
    .from('tickets')
    .update({ user_id: recipient.user_id })
    .eq('id', ticket_id);

  if (updateError) {
    edgeLog('error', 'Ticket transfer DB update failed', { requestId, ticket_id, error: String(updateError) });
    return errorResponse(500, 'Transfer failed', { requestId });
  }

  await serviceClient
    .from('rsvps')
    .upsert({ event_id: ticket.event_id, user_id: recipient.user_id, status: 'going' }, { onConflict: 'event_id,user_id' });

  await serviceClient.from('notifications').insert({
    user_id: recipient.user_id,
    type: 'ticket_transfer',
    title: 'Ticket Received',
    message: 'You received a ticket transfer!',
    link: '/events',
  });

  edgeLog('info', 'Ticket transferred', { requestId, ticket_id, from: userId, to: recipient.user_id });
  return successResponse({ success: true, to_user_id: recipient.user_id }, requestId);
}

async function handleEventTransfer(
  serviceClient: any,
  userId: string,
  input: { event_id: string; recipient_user_id: string },
  requestId: string,
): Promise<Response> {
  const { event_id, recipient_user_id } = input;

  if (recipient_user_id === userId) {
    return errorResponse(400, 'Cannot transfer to yourself', { requestId });
  }

  const { data: connection } = await serviceClient
    .from('connections')
    .select('id')
    .eq('status', 'accepted')
    .or(`and(requester_id.eq.${userId},addressee_id.eq.${recipient_user_id}),and(requester_id.eq.${recipient_user_id},addressee_id.eq.${userId})`)
    .limit(1)
    .maybeSingle();

  if (!connection) {
    return errorResponse(403, 'You can only transfer to a friend', { requestId });
  }

  const { data: ticket } = await serviceClient
    .from('tickets')
    .select('id, status')
    .eq('event_id', event_id)
    .eq('user_id', userId)
    .eq('status', 'valid')
    .limit(1)
    .maybeSingle();

  if (ticket) {
    edgeLog('info', 'Transferring ticket for event', { requestId, event_id, ticket_id: ticket.id });
    const { error: updateError } = await serviceClient
      .from('tickets')
      .update({ user_id: recipient_user_id })
      .eq('id', ticket.id);

    if (updateError) {
      edgeLog('error', 'Ticket transfer failed', { requestId, error: String(updateError) });
      return errorResponse(500, 'Transfer failed', { requestId });
    }
  }

  const { data: rsvp } = await serviceClient
    .from('rsvps')
    .select('id, status, guest_count')
    .eq('event_id', event_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!rsvp && !ticket) {
    return errorResponse(404, 'You do not have an RSVP or ticket for this event', { requestId });
  }

  if (rsvp) {
    await serviceClient.from('rsvps').delete().eq('id', rsvp.id);
  }

  await serviceClient
    .from('rsvps')
    .upsert(
      { event_id, user_id: recipient_user_id, status: rsvp?.status || 'going', guest_count: rsvp?.guest_count || 1 },
      { onConflict: 'event_id,user_id' },
    );

  await serviceClient.from('notifications').insert({
    user_id: recipient_user_id,
    type: 'ticket_transfer',
    title: 'Ticket Received',
    message: 'You received a ticket transfer!',
    link: '/events',
  });

  edgeLog('info', 'Event transfer complete', { requestId, event_id, from: userId, to: recipient_user_id, had_ticket: !!ticket });
  return successResponse({ success: true, to_user_id: recipient_user_id }, requestId);
}
