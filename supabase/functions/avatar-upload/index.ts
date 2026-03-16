import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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

    // Auth with user's token
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return errorResponse(401, 'Unauthorized', { requestId });
    }

    // Rate limit
    const allowed = await checkRateLimit('avatar-upload', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return errorResponse(400, 'No file provided', { requestId });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResponse(400, 'File must be a JPEG, PNG, WebP, or GIF image', { requestId });
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return errorResponse(400, 'Image must be smaller than 5MB', { requestId });
    }

    // Use service role for storage upload (bypasses storage RLS)
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    // Path-based versioning: each upload gets a unique path so the CDN
    // caches indefinitely until a new version is uploaded.
    const safeName = `${user.id}/avatar-${Date.now()}.${ext}`;

    // Delete previous avatar files for this user (best-effort cleanup)
    try {
      const { data: existing } = await serviceClient.storage
        .from('avatars')
        .list(user.id, { limit: 20 });
      if (existing && existing.length > 0) {
        const toRemove = existing.map((f) => `${user.id}/${f.name}`);
        await serviceClient.storage.from('avatars').remove(toRemove);
      }
    } catch {
      // Non-fatal — old files stay but don't break anything
    }

    // Upload to storage
    const { error: uploadError } = await serviceClient.storage
      .from('avatars')
      .upload(safeName, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      edgeLog('error', 'Storage upload error', { requestId, error: String(uploadError) });
      return errorResponse(500, 'Failed to upload file', { requestId });
    }

    // Get public URL — clean, no query-string cache-buster
    const { data: { publicUrl } } = serviceClient.storage
      .from('avatars')
      .getPublicUrl(safeName);

    // Update profile with new avatar URL
    const { error: profileError } = await serviceClient
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('user_id', user.id);

    if (profileError) {
      edgeLog('error', 'Profile update error', { requestId, error: String(profileError) });
      return errorResponse(500, 'Failed to update profile', { requestId });
    }

    return successResponse({ avatar_url: publicUrl }, requestId);
  } catch (err) {
    edgeLog('error', 'Unexpected error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
