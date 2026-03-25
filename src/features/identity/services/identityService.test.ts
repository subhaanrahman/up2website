import { describe, it, expect, vi, beforeEach } from 'vitest';
import { identityService } from './identityService';

const mockGetProfile = vi.fn();
vi.mock('../repositories/identityRepository', () => ({
  identityRepository: { getProfile: (...args: unknown[]) => mockGetProfile(...args) },
}));

vi.mock('@/api', () => ({
  profileApi: { update: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@/features/media', () => ({
  uploadAvatarImage: vi.fn().mockResolvedValue({ avatar_url: 'https://example.com/avatar.png' }),
}));

vi.mock('@/infrastructure/supabase', () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: { access_token: 'x' } } }) },
    from: () => ({
      update: () => ({ eq: () => ({ then: (cb: (r: { error: null }) => unknown) => Promise.resolve(cb({ error: null })) }) }),
    }),
  },
}));

vi.mock('@/infrastructure/logger', () => ({ createLogger: () => ({ info: vi.fn() }) }));

describe('identityService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getProfileOrNull', () => {
    it('returns profile from repository', async () => {
      const mockProfile = { userId: 'u1', displayName: 'Test' };
      mockGetProfile.mockResolvedValue(mockProfile);

      const result = await identityService.getProfileOrNull('u1');
      expect(result).toEqual(mockProfile);
      expect(mockGetProfile).toHaveBeenCalledWith('u1');
    });

    it('returns null when repository returns null', async () => {
      mockGetProfile.mockResolvedValue(null);
      const result = await identityService.getProfileOrNull('u1');
      expect(result).toBeNull();
    });
  });

  describe('uploadAvatar', () => {
    it('throws for non-image file', async () => {
      const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
      await expect(identityService.uploadAvatar(file)).rejects.toThrow('File must be an image');
    });

    it('throws for file over 5MB', async () => {
      const file = new File([new Uint8Array(6 * 1024 * 1024)], 'big.png', { type: 'image/png' });
      await expect(identityService.uploadAvatar(file)).rejects.toThrow('smaller than 5MB');
    });
  });
});
