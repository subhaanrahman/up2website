import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import TicketEventCard from './TicketEventCard';

vi.mock('@/lib/eventFlyerUtils', () => ({
  getEventFlyer: (id: string) => `https://example.com/flyer/${id}.jpg`,
}));

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('TicketEventCard', () => {
  it('renders title and date', () => {
    renderWithRouter(
      <TicketEventCard
        rsvpId="r1"
        eventId="e1"
        title="Summer Party"
        eventDate="2026-06-15T20:00:00"
        isPast={false}
        ticketStatus="purchased"
      />,
    );
    expect(screen.getByText('Summer Party')).toBeInTheDocument();
    expect(screen.getByText(/Mon Jun 15 • 8pm/i)).toBeInTheDocument();
  });

  it('renders venue when provided', () => {
    renderWithRouter(
      <TicketEventCard
        rsvpId="r1"
        eventId="e1"
        title="Summer Party"
        eventDate="2026-06-15T20:00:00"
        venue="The Ritz"
        isPast={false}
        ticketStatus="purchased"
      />,
    );
    expect(screen.getByText(/Mon Jun 15 • 8pm • The Ritz/i)).toBeInTheDocument();
  });

  it('shows TBD when no eventDate', () => {
    renderWithRouter(
      <TicketEventCard rsvpId="r1" eventId="e1" isPast={false} ticketStatus="going" />,
    );
    expect(screen.getByText('TBD')).toBeInTheDocument();
  });

  it('calls onTransferClick when transfer button clicked', async () => {
    const onTransferClick = vi.fn();
    renderWithRouter(
      <TicketEventCard
        rsvpId="r1"
        eventId="e1"
        title="Event"
        isPast={false}
        ticketStatus="purchased"
        onTransferClick={onTransferClick}
      />,
    );
    const transferBtn = screen.getByTitle('Transfer ticket');
    await userEvent.click(transferBtn);
    expect(onTransferClick).toHaveBeenCalledTimes(1);
  });

  it('shows transfer pending badge when hasPendingTransfer', () => {
    renderWithRouter(
      <TicketEventCard
        rsvpId="r1"
        eventId="e1"
        title="Event"
        isPast={false}
        ticketStatus="purchased"
        hasPendingTransfer
      />,
    );
    expect(screen.getByText('Transfer pending')).toBeInTheDocument();
  });
});
