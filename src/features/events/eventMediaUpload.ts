import { uploadEventMediaImage, type SignedImageUploadDeps } from '@/features/media';

export type UploadEventMediaDeps = SignedImageUploadDeps;

export interface UploadEventMediaParams {
  eventId: string;
  file: File;
  sortOrder: number;
}

export async function uploadEventMediaFile(
  { eventId, file, sortOrder }: UploadEventMediaParams,
  deps: UploadEventMediaDeps = {},
) {
  return uploadEventMediaImage(eventId, file, sortOrder, deps);
}
