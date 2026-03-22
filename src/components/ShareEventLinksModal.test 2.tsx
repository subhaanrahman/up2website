import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ShareEventLinksModal from './ShareEventLinksModal';

const mockApi = vi.hoisted(() => ({
  trackShare: vi.fn(),
}));

vi.mock('@/api', () => ({
  referralsApi: { trackShare: mockApi.trackShare },
}));

beforeEach(() => {
  mockApi.trackShare.mockReset();
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  });
});

describe('ShareEventLinksModal', () => {
  it('tracks share when copying the event link', async () => {
    render(
      <ShareEventLinksModal
        open
        onOpenChange={() => {}}
        eventId="evt_1"
        eventTitle="Test Event"
      />
    );

    const button = screen.getByText('Event Link');
    fireEvent.click(button);

    await Promise.resolve();
    expect(mockApi.trackShare).toHaveBeenCalledWith('evt_1', 'event_link');
  });
});
