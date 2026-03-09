import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const schema = z.object({
  ticket_id: z.string().uuid(),
  recipient_username: z.string().min(1),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Service role client for cross-user operations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Auth client to get current user
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { ticket_id, recipient_username } = parsed.data;

    // Verify ticket belongs to current user and is valid
    const { data: ticket, error: ticketError } = await serviceClient
      .from('tickets')
      .select('id, user_id, status, event_id')
      .eq('id', ticket_id)
      .single();

    if (ticketError || !ticket) {
      return new Response(JSON.stringify({ error: 'Ticket not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (ticket.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'You do not own this ticket' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (ticket.status !== 'valid') {
      return new Response(JSON.stringify({ error: 'Only valid tickets can be transferred' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find recipient by username
    const { data: recipient, error: recipientError } = await serviceClient
      .from('profiles')
      .select('user_id')
      .eq('username', recipient_username)
      .single();

    if (recipientError || !recipient) {
      return new Response(JSON.stringify({ error: 'Recipient not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (recipient.user_id === user.id) {
      return new Response(JSON.stringify({ error: 'Cannot transfer to yourself' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Transfer: update ticket owner
    const { error: updateError } = await serviceClient
      .from('tickets')
      .update({ user_id: recipient.user_id })
      .eq('id', ticket_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Transfer failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Also create an RSVP for the new owner if they don't have one
    await serviceClient
      .from('rsvps')
      .upsert({
        event_id: ticket.event_id,
        user_id: recipient.user_id,
        status: 'going',
      }, { onConflict: 'event_id,user_id' });

    // Send notification to recipient
    await serviceClient.from('notifications').insert({
      user_id: recipient.user_id,
      type: 'ticket_transfer',
      title: 'Ticket Received',
      message: `You received a ticket transfer!`,
      link: `/events`,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
