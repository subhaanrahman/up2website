import { describe, it, expect, vi } from 'vitest';
import { uploadEventMediaFile } from './eventMediaUpload';

describe('uploadEventMediaFile', () => {
  it('uploads via edge function init/complete flow', async () => {
    const callEdge = vi.fn()
      .mockResolvedValueOnce({
        upload_url: 'https://signed.example.com/upload',
        path: 'user/event/file.jpg',
        sort_order: 2,
      })
      .mockResolvedValueOnce({ success: true, url: 'https://public.example.com/file.jpg' });

    const fetchFn = vi.fn().mockResolvedValue({ ok: true });

    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });

    const result = await uploadEventMediaFile(
      { eventId: 'event-1', file, sortOrder: 2 },
      { callEdge, fetchFn },
    );

    expect(callEdge).toHaveBeenCalledTimes(2);
    expect(callEdge).toHaveBeenNthCalledWith(1, 'event-media-upload', {
      body: {
        action: 'init',
        event_id: 'event-1',
        file_name: 'photo.jpg',
        content_type: 'image/jpeg',
        file_size: file.size,
        sort_order: 2,
      },
    });
    expect(fetchFn).toHaveBeenCalledWith('https://signed.example.com/upload', {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: file,
    });
    expect(callEdge).toHaveBeenNthCalledWith(2, 'event-media-upload', {
      body: {
        action: 'complete',
        event_id: 'event-1',
        path: 'user/event/file.jpg',
        sort_order: 2,
      },
    });
    expect(result).toEqual({ success: true, url: 'https://public.example.com/file.jpg' });
  });

  it('throws when upload fails', async () => {
    const callEdge = vi.fn().mockResolvedValueOnce({
      upload_url: 'https://signed.example.com/upload',
      path: 'user/event/file.jpg',
      sort_order: 1,
    });
    const fetchFn = vi.fn().mockResolvedValue({ ok: false });
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });

    await expect(
      uploadEventMediaFile({ eventId: 'event-1', file, sortOrder: 1 }, { callEdge, fetchFn }),
    ).rejects.toThrow('Upload failed');

    expect(callEdge).toHaveBeenCalledTimes(1);
  });
});
