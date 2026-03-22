import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GuestlistApprovalList, { GuestlistEntry } from './GuestlistApprovalList';

describe('GuestlistApprovalList', () => {
  it('renders approve/decline for pending RSVPs and triggers callbacks', () => {
    const onApprove = vi.fn();
    const onDecline = vi.fn();
    const onSelectUser = vi.fn();

    const rsvps: GuestlistEntry[] = [
      {
        id: 'r1',
        user_id: 'u1',
        status: 'pending',
        created_at: '2026-03-19T10:00:00Z',
        profile: { display_name: 'Pat', email: 'pat@example.com' },
      },
    ];

    render(
      <GuestlistApprovalList
        rsvps={rsvps}
        onApprove={onApprove}
        onDecline={onDecline}
        onSelectUser={onSelectUser}
      />
    );

    fireEvent.click(screen.getByText('Approve'));
    fireEvent.click(screen.getByText('Decline'));

    expect(onApprove).toHaveBeenCalledWith('r1');
    expect(onDecline).toHaveBeenCalledWith('r1');
  });
});
