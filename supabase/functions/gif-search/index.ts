import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query, limit = 20 } = await req.json();
    const apiKey = Deno.env.get("TENOR_API_KEY");
    
    if (!apiKey) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const endpoint = query && query !== "trending"
      ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${apiKey}&client_key=up2app&limit=${limit}&media_filter=gif,tinygif`
      : `https://tenor.googleapis.com/v2/featured?key=${apiKey}&client_key=up2app&limit=${limit}&media_filter=gif,tinygif`;

    const res = await fetch(endpoint);
    const data = await res.json();

    return new Response(JSON.stringify({ results: data.results || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
