import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    const { query, limit = 20 } = await req.json();
    const apiKey = Deno.env.get("TENOR_API_KEY");

    if (!apiKey) {
      return successResponse({ results: [] }, requestId);
    }

    const endpoint = query && query !== "trending"
      ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${apiKey}&client_key=up2app&limit=${limit}&media_filter=gif,tinygif`
      : `https://tenor.googleapis.com/v2/featured?key=${apiKey}&client_key=up2app&limit=${limit}&media_filter=gif,tinygif`;

    const res = await fetch(endpoint);
    const data = await res.json();

    return successResponse({ results: data.results || [] }, requestId);
  } catch (err) {
    edgeLog('error', 'gif-search error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
