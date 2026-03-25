import { describe, expect, it, vi } from 'vitest';
import {
  uploadAvatarImage,
  uploadEventFlyerImage,
  uploadEventMediaImage,
  uploadOrganiserAvatarImage,
  uploadPostImage,
} from './imageUploadService';

describe('imageUploadService', () => {
  it('uploads post images via init/complete flow', async () => {
    const callEdge = vi.fn()
      .mockResolvedValueOnce({
        upload_url: 'https://signed.example.com/upload',
        path: 'user/posts/file.jpg',
      })
      .mockResolvedValueOnce({ success: true, url: 'https://public.example.com/file.jpg' });
    const fetchFn = vi.fn().mockResolvedValue({ ok: true });
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });

    const result = await uploadPostImage(file, { callEdge, fetchFn });

    expect(callEdge).toHaveBeenNthCalledWith(1, 'post-image-upload', {
      body: {
        action: 'init',
        file_name: 'photo.jpg',
        content_type: 'image/jpeg',
        file_size: file.size,
      },
    });
    expect(fetchFn).toHaveBeenCalledWith('https://signed.example.com/upload', {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: file,
    });
    expect(callEdge).toHaveBeenNthCalledWith(2, 'post-image-upload', {
      body: {
        action: 'complete',
        path: 'user/posts/file.jpg',
      },
    });
    expect(result).toEqual({ success: true, url: 'https://public.example.com/file.jpg' });
  });

  it('supports personal and organiser avatar uploads', async () => {
    const file = new File(['data'], 'avatar.png', { type: 'image/png' });
    const fetchFn = vi.fn().mockResolvedValue({ ok: true });

    const personalEdge = vi.fn()
      .mockResolvedValueOnce({ upload_url: 'https://signed.example.com/personal', path: 'u1/personal/u1/avatar.png' })
      .mockResolvedValueOnce({ avatar_url: 'https://public.example.com/personal.png' });

    await expect(uploadAvatarImage(file, { callEdge: personalEdge, fetchFn })).resolves.toEqual({
      avatar_url: 'https://public.example.com/personal.png',
    });

    const organiserEdge = vi.fn()
      .mockResolvedValueOnce({ upload_url: 'https://signed.example.com/org', path: 'u1/organiser/org-1/avatar.png' })
      .mockResolvedValueOnce({ avatar_url: 'https://public.example.com/org.png' });

    await expect(uploadOrganiserAvatarImage('org-1', file, { callEdge: organiserEdge, fetchFn })).resolves.toEqual({
      avatar_url: 'https://public.example.com/org.png',
    });
  });

  it('supports event flyer and event media uploads', async () => {
    const file = new File(['data'], 'flyer.webp', { type: 'image/webp' });
    const fetchFn = vi.fn().mockResolvedValue({ ok: true });

    const flyerEdge = vi.fn()
      .mockResolvedValueOnce({ upload_url: 'https://signed.example.com/flyer', path: 'u1/event-flyers/flyer.webp' })
      .mockResolvedValueOnce({ success: true, url: 'https://public.example.com/flyer.webp' });
    const mediaEdge = vi.fn()
      .mockResolvedValueOnce({ upload_url: 'https://signed.example.com/gallery', path: 'u1/events/e1/gallery/file.webp' })
      .mockResolvedValueOnce({ success: true, url: 'https://public.example.com/gallery.webp' });

    await expect(uploadEventFlyerImage(file, { callEdge: flyerEdge, fetchFn })).resolves.toEqual({
      success: true,
      url: 'https://public.example.com/flyer.webp',
    });
    await expect(uploadEventMediaImage('e1', file, 3, { callEdge: mediaEdge, fetchFn })).resolves.toEqual({
      success: true,
      url: 'https://public.example.com/gallery.webp',
    });
  });
});
