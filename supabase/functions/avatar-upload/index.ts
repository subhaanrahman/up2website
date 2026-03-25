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
  removeStorageObjectsUnderPrefix,
} from "../_shared/image-upload.ts";

const avatarActorSchema = z.enum(['personal', 'organiser']);

const initSchema = z.object({
  action: z.literal('init'),
  actor_type: avatarActorSchema,
  organiser_profile_id: z.string().uuid().optional(),
  file_name: z.string().min(1),
  content_type: z.enum(ALLOWED_IMAGE_TYPES),
  file_size: z.number().int().min(1).max(MAX_IMAGE_SIZE_BYTES),
});

const completeSchema = z.object({
  action: z.literal('complete'),
  actor_type: avatarActorSchema,
  organiser_profile_id: z.string().uuid().optional(),
  path: z.string().min(1),
});

const bodySchema = z.discriminatedUnion('action', [initSchema, completeSchema]);

async function resolveAvatarTarget(
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
  actorType: z.infer<typeof avatarActorSchema>,
  organiserProfileId?: string,
) {
  if (actorType === 'personal') {
    return {
      pathPrefix: `${userId}/personal/${userId}`,
      async updateAvatar(publicUrl: string) {
        const { error } = await serviceClient
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('user_id', userId);
        if (error) throw error;
      },
    };
  }

  if (!organiserProfileId) {
    throw new Error('organiser_profile_id is required');
  }

  const { data: organiserProfile, error } = await serviceClient
    .from('organiser_profiles')
    .select('id, owner_id')
    .eq('id', organiserProfileId)
    .maybeSingle();

  if (error) throw error;
  if (!organiserProfile || organiserProfile.owner_id !== userId) {
    throw new Error('Not authorized to update this organiser avatar');
  }

  return {
    pathPrefix: `${userId}/organiser/${organiserProfileId}`,
    async updateAvatar(publicUrl: string) {
      const { error: updateError } = await serviceClient
        .from('organiser_profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', organiserProfileId);
      if (updateError) throw updateError;
    },
  };
}

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

    const allowed = await checkRateLimit('avatar-upload', user.id, getClientIp(req));
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

    const data = parsed.data;
    const target = await resolveAvatarTarget(
      serviceClient,
      user.id,
      data.actor_type,
      'organiser_profile_id' in data ? data.organiser_profile_id : undefined,
    );

    if (data.action === 'init') {
      const segments =
        data.actor_type === 'personal'
          ? ['personal', user.id]
          : ['organiser', data.organiser_profile_id!];

      const signed = await createSignedImageUpload({
        serviceClient,
        bucket: 'avatars',
        ownerId: user.id,
        segments,
        fileName: data.file_name,
        contentType: data.content_type,
        fileSize: data.file_size,
        versioned: true,
      });

      return successResponse({
        upload_url: signed.uploadUrl,
        path: signed.path,
      }, requestId);
    }

    ensureStoragePathPrefix(data.path, target.pathPrefix);

    const publicUrl = await getPublicStorageUrl(serviceClient, 'avatars', data.path);
    await removeStorageObjectsUnderPrefix({
      serviceClient,
      bucket: 'avatars',
      prefix: target.pathPrefix,
      excludePaths: [data.path],
    });
    await target.updateAvatar(publicUrl);

    return successResponse({ avatar_url: publicUrl }, requestId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /not authorized/i.test(message) ? 403 : /required|invalid/i.test(message) ? 400 : 500;
    edgeLog('error', 'avatar-upload error', { requestId, error: message });
    return errorResponse(status, status === 500 ? 'Internal server error' : message, { requestId });
  }
});
