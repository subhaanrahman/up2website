import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import EventCard from './EventCard';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/features/events/repositories/eventsRepository', () => ({
  eventsRepository: {
    isEventSaved: vi.fn().mockResolvedValue(null),
    saveEvent: vi.fn().mockResolvedValue(undefined),
    unsaveEvent: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('EventCard', () => {
  it('renders title, date, location', () => {
    renderWithProviders(
      <EventCard
        id="ev1"
        title="Summer Party"
        date="June 15, 2026"
        time="7:00 PM"
        location="Sydney Opera House"
        image="/img.jpg"
        attendees={50}
        category="music"
      />,
    );

    expect(screen.getByText('Summer Party')).toBeInTheDocument();
    expect(screen.getByText(/June 15, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Sydney Opera House/)).toBeInTheDocument();
    expect(screen.getByText(/50 attending/)).toBeInTheDocument();
    expect(screen.getByText('music')).toBeInTheDocument();
  });

  it('renders friends going when provided', () => {
    renderWithProviders(
      <EventCard
        id="ev1"
        title="Gig"
        date="Jul 1"
        time="8pm"
        location="Melbourne"
        image="/img.jpg"
        attendees={20}
        category="concert"
        friendsGoing={[
          { avatarUrl: null, displayName: 'Alice' },
          { avatarUrl: null, displayName: 'Bob' },
        ]}
      />,
    );

    expect(screen.getByText('2 friends going')).toBeInTheDocument();
  });
});
