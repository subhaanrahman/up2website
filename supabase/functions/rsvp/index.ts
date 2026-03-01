import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action, event_id, status } = body;

    if (!event_id) {
      return new Response(JSON.stringify({ error: 'event_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'join') {
      // Check if event exists
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, max_guests')
        .eq('id', event_id)
        .single();

      if (eventError || !event) {
        return new Response(JSON.stringify({ error: 'Event not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check capacity
      if (event.max_guests) {
        const { count } = await supabase
          .from('rsvps')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', event_id)
          .eq('status', 'going');

        if (count && count >= event.max_guests) {
          return new Response(JSON.stringify({ error: 'Event is at capacity' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Upsert RSVP
      const { data, error } = await supabase
        .from('rsvps')
        .upsert(
          { event_id, user_id: user.id, status: status || 'going' },
          { onConflict: 'event_id,user_id' }
        )
        .select()
        .single();

      if (error) {
        // Fallback: insert if upsert fails
        const { data: insertData, error: insertError } = await supabase
          .from('rsvps')
          .insert({ event_id, user_id: user.id, status: status || 'going' })
          .select()
          .single();

        if (insertError) {
          return new Response(JSON.stringify({ error: insertError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify(insertData), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'leave') {
      const { error } = await supabase
        .from('rsvps')
        .delete()
        .eq('event_id', event_id)
        .eq('user_id', user.id);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      return new Response(JSON.stringify({ error: 'action must be "join" or "leave"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
