import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import BottomNav from './BottomNav';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', user_metadata: { display_name: 'Test' }, email: 'test@example.com' },
    signOut: vi.fn(),
  }),
}));

vi.mock('@/contexts/ActiveProfileContext', () => ({
  useActiveProfile: () => ({
    activeProfile: { id: 'u1', type: 'personal' },
    switchProfile: vi.fn(),
    organiserProfiles: [],
    isOrganiser: false,
  }),
}));

vi.mock('@/hooks/useUnreadMessages', () => ({
  useUnreadMessageBadgeCount: () => 0,
}));

vi.mock('@/hooks/useProfileQuery', () => ({
  useProfile: () => ({ data: { displayName: 'Test User', avatarUrl: null } }),
}));

describe('BottomNav', () => {
  it('renders nav links with correct hrefs', () => {
    renderWithProviders(<BottomNav />);

    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));

    expect(hrefs).toContain('/');
    expect(hrefs).toContain('/search');
    expect(hrefs).toContain('/events');
    expect(hrefs).toContain('/messages');
    expect(hrefs).toContain('/profile');
    expect(links.length).toBeGreaterThanOrEqual(5);
  });
});
