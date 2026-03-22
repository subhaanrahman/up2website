import { callEdgeFunction } from '@/infrastructure/api-client';

export interface UploadEventMediaDeps {
  callEdge?: typeof callEdgeFunction;
  fetchFn?: typeof fetch;
}

export interface UploadEventMediaParams {
  eventId: string;
  file: File;
  sortOrder: number;
}

export async function uploadEventMediaFile(
  { eventId, file, sortOrder }: UploadEventMediaParams,
  deps: UploadEventMediaDeps = {},
) {
  const callEdge = deps.callEdge ?? callEdgeFunction;
  const fetchFn = deps.fetchFn ?? fetch;

  const { upload_url, path, sort_order } = await callEdge<{
    upload_url: string;
    path: string;
    sort_order: number;
  }>('event-media-upload', {
    body: {
      action: 'init',
      event_id: eventId,
      file_name: file.name,
      content_type: file.type,
      file_size: file.size,
      sort_order: sortOrder,
    },
  });

  const uploadRes = await fetchFn(upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error('Upload failed. Please try again.');
  }

  return callEdge('event-media-upload', {
    body: {
      action: 'complete',
      event_id: eventId,
      path,
      sort_order,
    },
  }) as Promise<{ success: boolean; url: string }>;
}
