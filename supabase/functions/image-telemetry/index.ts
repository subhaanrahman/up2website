import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

const eventSchema = z.object({
  asset_type: z.string().max(32),
  bucket: z.string().max(128).nullable().optional(),
  preset: z.string().max(64),
  surface: z.string().max(128).nullable().optional(),
  delivery_mode: z.string().max(32),
  load_status: z.enum(['loaded', 'error']),
  fallback_used: z.boolean(),
  cache_hint: z.enum(['cached', 'network', 'unknown']),
  image_path: z.string().max(512).nullable().optional(),
  page_path: z.string().max(256).nullable().optional(),
});

const bodySchema = z.object({
  events: z.array(eventSchema).min(1).max(20),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'Invalid input', { requestId, details: parsed.error.flatten().fieldErrors });
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const rows = parsed.data.events.map((event) => ({
      asset_type: event.asset_type,
      bucket: event.bucket ?? null,
      preset: event.preset,
      surface: event.surface ?? null,
      delivery_mode: event.delivery_mode,
      load_status: event.load_status,
      fallback_used: event.fallback_used,
      cache_hint: event.cache_hint,
      image_path: event.image_path ?? null,
      page_path: event.page_path ?? null,
    }));

    const { error } = await serviceClient
      .from('image_telemetry_events')
      .insert(rows);

    if (error) {
      edgeLog('error', 'image-telemetry insert failed', { requestId, error: String(error) });
      return errorResponse(500, 'Failed to record telemetry', { requestId });
    }

    return successResponse({ success: true }, requestId);
  } catch (err) {
    edgeLog('error', 'image-telemetry error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
