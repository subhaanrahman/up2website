import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  createSignedImageUpload,
  ensureStoragePathPrefix,
  getPublicStorageUrl,
} from "../_shared/image-upload.ts";

const initSchema = z.object({
  action: z.literal('init'),
  file_name: z.string().min(1),
  content_type: z.enum(ALLOWED_IMAGE_TYPES),
  file_size: z.number().int().min(1).max(MAX_IMAGE_SIZE_BYTES),
});

const completeSchema = z.object({
  action: z.literal('complete'),
  path: z.string().min(1),
});

const bodySchema = z.discriminatedUnion('action', [initSchema, completeSchema]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse(401, 'Missing authorization', { requestId });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return errorResponse(401, 'Unauthorized', { requestId });
    }

    const allowed = await checkRateLimit('post-image-upload', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'Invalid input', { requestId, details: parsed.error.flatten().fieldErrors });
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    if (parsed.data.action === 'init') {
      const signed = await createSignedImageUpload({
        serviceClient,
        bucket: 'post-images',
        ownerId: user.id,
        segments: ['posts'],
        fileName: parsed.data.file_name,
        contentType: parsed.data.content_type,
        fileSize: parsed.data.file_size,
      });

      return successResponse({ upload_url: signed.uploadUrl, path: signed.path }, requestId);
    }

    ensureStoragePathPrefix(parsed.data.path, `${user.id}/posts`);
    const publicUrl = await getPublicStorageUrl(serviceClient, 'post-images', parsed.data.path);
    return successResponse({ success: true, url: publicUrl }, requestId);
  } catch (err) {
    edgeLog('error', 'post-image-upload error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
