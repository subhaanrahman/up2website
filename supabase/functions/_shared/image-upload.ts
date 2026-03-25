import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export function validateImageUploadPayload(params: {
  fileName: string;
  contentType: string;
  fileSize: number;
  allowedTypes?: readonly string[];
}): string {
  const allowedTypes = params.allowedTypes ?? ALLOWED_IMAGE_TYPES;

  if (!allowedTypes.includes(params.contentType)) {
    throw new Error(`File must be one of: ${allowedTypes.join(', ')}`);
  }

  if (!Number.isFinite(params.fileSize) || params.fileSize <= 0 || params.fileSize > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('Image must be smaller than 5MB');
  }

  const extFromName = params.fileName.includes('.')
    ? params.fileName.split('.').pop()
    : params.contentType.split('/').pop();
  const safeExt = (extFromName || 'jpg').toLowerCase();
  if (!/^[a-z0-9]+$/.test(safeExt)) {
    throw new Error('Unsupported file extension');
  }

  return safeExt;
}

export function buildImmutableImagePath(ownerId: string, segments: string[], ext: string): string {
  return [ownerId, ...segments, `${Date.now()}-${crypto.randomUUID()}.${ext}`].join('/');
}

export function buildVersionedAvatarPath(ownerId: string, segments: string[], ext: string): string {
  return [ownerId, ...segments, `avatar-${Date.now()}-${crypto.randomUUID()}.${ext}`].join('/');
}

export async function createSignedImageUpload(params: {
  serviceClient: SupabaseClient;
  bucket: string;
  ownerId: string;
  segments: string[];
  fileName: string;
  contentType: string;
  fileSize: number;
  versioned?: boolean;
  allowedTypes?: readonly string[];
}): Promise<{ uploadUrl: string; path: string }> {
  const ext = validateImageUploadPayload({
    fileName: params.fileName,
    contentType: params.contentType,
    fileSize: params.fileSize,
    allowedTypes: params.allowedTypes,
  });

  const path = params.versioned
    ? buildVersionedAvatarPath(params.ownerId, params.segments, ext)
    : buildImmutableImagePath(params.ownerId, params.segments, ext);

  const { data, error } = await params.serviceClient.storage
    .from(params.bucket)
    .createSignedUploadUrl(path);

  if (error || !data?.signedUrl) {
    throw new Error('Failed to prepare upload');
  }

  return {
    uploadUrl: data.signedUrl,
    path,
  };
}

export async function getPublicStorageUrl(
  serviceClient: SupabaseClient,
  bucket: string,
  path: string,
): Promise<string> {
  const { data } = serviceClient.storage.from(bucket).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error('Failed to resolve public URL');
  }
  return data.publicUrl;
}

export function ensureStoragePathPrefix(path: string, requiredPrefix: string): void {
  if (!path.startsWith(`${requiredPrefix}/`) && path !== requiredPrefix) {
    throw new Error('Invalid upload path');
  }
}

export async function removeStorageObjectsUnderPrefix(params: {
  serviceClient: SupabaseClient;
  bucket: string;
  prefix: string;
  excludePaths?: string[];
}): Promise<void> {
  const { data, error } = await params.serviceClient.storage
    .from(params.bucket)
    .list(params.prefix, { limit: 100 });

  if (error || !data?.length) return;

  const exclude = new Set(params.excludePaths ?? []);
  const paths = data
    .map((entry) => `${params.prefix}/${entry.name}`)
    .filter((path) => !exclude.has(path));

  if (paths.length === 0) return;
  await params.serviceClient.storage.from(params.bucket).remove(paths);
}
