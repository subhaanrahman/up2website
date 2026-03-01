import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const reserveSchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
  quantity: z.number().int().min(1).max(20).default(1),
  amount_cents: z.number().int().min(0),
  currency: z.string().length(3).default('zar'),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limit
    const allowed = await checkRateLimit('orders-reserve', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    // Validate input
    const body = await req.json();
    const parsed = reserveSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { event_id, quantity, amount_cents, currency } = parsed.data;

    // Use service role for order management (no client write policies)
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify event exists and check capacity
    const { data: event, error: eventError } = await serviceClient
      .from('events')
      .select('id, max_guests, title')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check capacity: count confirmed RSVPs + active reservations
    if (event.max_guests) {
      const { count: rsvpCount } = await serviceClient
        .from('rsvps')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event_id)
        .eq('status', 'going');

      const { count: reservedCount } = await serviceClient
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event_id)
        .in('status', ['reserved', 'confirmed'])
        .gt('expires_at', new Date().toISOString());

      const totalOccupied = (rsvpCount ?? 0) + (reservedCount ?? 0);
      if (totalOccupied + quantity > event.max_guests) {
        return new Response(JSON.stringify({ error: 'Not enough capacity for this event' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Check for existing active reservation by this user for this event
    const { data: existingOrder } = await serviceClient
      .from('orders')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_id', event_id)
      .eq('status', 'reserved')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existingOrder) {
      return new Response(JSON.stringify({ error: 'You already have an active reservation for this event', order_id: existingOrder.id }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create reservation (15-minute hold)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { data: order, error: insertError } = await serviceClient
      .from('orders')
      .insert({
        user_id: user.id,
        event_id,
        quantity,
        amount_cents,
        currency,
        status: 'reserved',
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Order insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create reservation' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(order), {
      status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
