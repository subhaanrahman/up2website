import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

/** GIPHY rating: g = general (broadest safe default for feeds). */
const RATING = "g";

type GiphyImageBlock = { url?: string };
type GiphyGif = {
  id?: string;
  images?: {
    fixed_height_small?: GiphyImageBlock;
    downsized_small?: GiphyImageBlock;
    original?: GiphyImageBlock;
    downsized_large?: GiphyImageBlock;
  };
};

type GiphyListResponse = {
  data?: GiphyGif[];
  pagination?: { total_count?: number; count?: number; offset?: number };
  meta?: { status?: number; msg?: string };
};

function mapGif(g: GiphyGif): { id: string; preview_url: string; gif_url: string } | null {
  const id = g.id;
  if (!id) return null;
  const preview =
    g.images?.fixed_height_small?.url ??
    g.images?.downsized_small?.url ??
    g.images?.original?.url;
  const gifUrl = g.images?.original?.url ?? g.images?.downsized_large?.url ?? preview;
  if (!preview || !gifUrl) return null;
  return { id, preview_url: preview, gif_url: gifUrl };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    const body = await req.json().catch(() => ({}));
    const query = typeof body.query === "string" ? body.query : undefined;
    const rawOffset = body.offset;
    const offset =
      typeof rawOffset === "number" && rawOffset >= 0 && Number.isFinite(rawOffset)
        ? Math.floor(rawOffset)
        : 0;
    const limit =
      typeof body.limit === "number" && body.limit > 0 && body.limit <= 50 ? Math.floor(body.limit) : 20;

    const apiKey = Deno.env.get("GIPHY_API_KEY");
    const configured = Boolean(apiKey);

    if (!apiKey) {
      return successResponse({ results: [], next_offset: null, configured: false }, requestId);
    }

    const isTrending = !query || query === "trending";
    const url = isTrending
      ? `https://api.giphy.com/v1/gifs/trending?api_key=${encodeURIComponent(apiKey)}&limit=${limit}&offset=${offset}&rating=${RATING}`
      : `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&rating=${RATING}`;

    const res = await fetch(url);
    const data = (await res.json()) as GiphyListResponse & { message?: string };

    if (!res.ok) {
      edgeLog("warn", "gif-search GIPHY upstream error", {
        requestId,
        status: res.status,
        msg: data?.message ?? data?.meta?.msg,
      });
      return successResponse({ results: [], next_offset: null, configured: true }, requestId);
    }

    const raw = data.data || [];
    const results = raw.map(mapGif).filter((x): x is NonNullable<typeof x> => x !== null);

    const pag = data.pagination;
    const total = typeof pag?.total_count === "number" ? pag.total_count : 0;
    const returned = typeof pag?.count === "number" ? pag.count : results.length;
    const off = typeof pag?.offset === "number" ? pag.offset : offset;
    const nextStart = off + returned;

    let next_offset: number | null = null;
    if (results.length > 0) {
      if (total > 0) {
        if (nextStart < total) next_offset = nextStart;
      } else if (returned >= limit) {
        next_offset = nextStart;
      }
    }

    return successResponse(
      {
        results,
        next_offset,
        configured: true,
      },
      requestId,
    );
  } catch (err) {
    edgeLog("error", "gif-search error", { requestId, error: String(err) });
    return errorResponse(500, "Internal server error", { requestId });
  }
});
