import { callEdgeFunction } from '@/infrastructure/api-client';

export interface SignedImageUploadDeps {
  callEdge?: typeof callEdgeFunction;
  fetchFn?: typeof fetch;
}

interface SignedUploadInitResponse {
  upload_url: string;
  path: string;
}

async function uploadViaSignedUrl<TComplete>(
  functionName: string,
  initBody: Record<string, unknown>,
  completeBody: Record<string, unknown>,
  file: File,
  deps: SignedImageUploadDeps = {},
): Promise<TComplete> {
  const callEdge = deps.callEdge ?? callEdgeFunction;
  const fetchFn = deps.fetchFn ?? fetch;

  const init = await callEdge<SignedUploadInitResponse>(functionName, {
    body: {
      action: 'init',
      file_name: file.name,
      content_type: file.type,
      file_size: file.size,
      ...initBody,
    },
  });

  const uploadRes = await fetchFn(init.upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error('Upload failed. Please try again.');
  }

  return callEdge<TComplete>(functionName, {
    body: {
      action: 'complete',
      path: init.path,
      ...completeBody,
    },
  });
}

export function uploadAvatarImage(
  file: File,
  deps?: SignedImageUploadDeps,
): Promise<{ avatar_url: string }> {
  return uploadViaSignedUrl<{ avatar_url: string }>(
    'avatar-upload',
    { actor_type: 'personal' },
    { actor_type: 'personal' },
    file,
    deps,
  );
}

export function uploadOrganiserAvatarImage(
  organiserProfileId: string,
  file: File,
  deps?: SignedImageUploadDeps,
): Promise<{ avatar_url: string }> {
  return uploadViaSignedUrl<{ avatar_url: string }>(
    'avatar-upload',
    { actor_type: 'organiser', organiser_profile_id: organiserProfileId },
    { actor_type: 'organiser', organiser_profile_id: organiserProfileId },
    file,
    deps,
  );
}

export function uploadPostImage(
  file: File,
  deps?: SignedImageUploadDeps,
): Promise<{ success: boolean; url: string }> {
  return uploadViaSignedUrl<{ success: boolean; url: string }>(
    'post-image-upload',
    {},
    {},
    file,
    deps,
  );
}

export function uploadEventFlyerImage(
  file: File,
  deps?: SignedImageUploadDeps,
): Promise<{ success: boolean; url: string }> {
  return uploadViaSignedUrl<{ success: boolean; url: string }>(
    'event-flyer-upload',
    {},
    {},
    file,
    deps,
  );
}

export function uploadEventMediaImage(
  eventId: string,
  file: File,
  sortOrder: number,
  deps?: SignedImageUploadDeps,
): Promise<{ success: boolean; url: string }> {
  return uploadViaSignedUrl<{ success: boolean; url: string }>(
    'event-media-upload',
    {
      event_id: eventId,
      sort_order: sortOrder,
    },
    {
      event_id: eventId,
      sort_order: sortOrder,
    },
    file,
    deps,
  );
}
