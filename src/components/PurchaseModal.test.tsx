import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@/components/ui/tooltip';
import PurchaseModal from './PurchaseModal';

vi.mock('@/infrastructure/api-client', () => ({
  callEdgeFunction: vi.fn(),
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

const mockTiers = [
  { id: 't1', name: 'General', priceCents: 2000, availableQuantity: 50, sortOrder: 0 },
  { id: 't2', name: 'VIP', priceCents: 5000, availableQuantity: 10, sortOrder: 1 },
];

describe('PurchaseModal', () => {
  it('renders event info and tiers', () => {
    const onCheckout = vi.fn();
    renderWithProviders(
      <PurchaseModal
        open
        onOpenChange={vi.fn()}
        eventTitle="Summer Party"
        eventDate="June 15, 2026"
        eventLocation="Sydney"
        ticketTiers={mockTiers}
        onCheckout={onCheckout}
      />,
    );

    expect(screen.getByText(/get tickets/i)).toBeInTheDocument();
    expect(screen.getByText('Summer Party')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('VIP')).toBeInTheDocument();
  });

  it('calls onCheckout with tier and quantity when Continue clicked', async () => {
    const onCheckout = vi.fn();
    renderWithProviders(
      <PurchaseModal
        open
        onOpenChange={vi.fn()}
        eventTitle="Event"
        eventDate="2026-06-15"
        eventLocation="Sydney"
        ticketTiers={mockTiers}
        onCheckout={onCheckout}
      />,
    );

    await userEvent.click(screen.getByText('General'));
    await userEvent.click(screen.getByRole('button', { name: /checkout/i }));
    expect(onCheckout).toHaveBeenCalledWith('t1', 1, undefined);
  });

  it('increments quantity when plus clicked', async () => {
    const onCheckout = vi.fn();
    renderWithProviders(
      <PurchaseModal
        open
        onOpenChange={vi.fn()}
        eventTitle="Event"
        eventDate="2026-06-15"
        eventLocation="Sydney"
        ticketTiers={mockTiers}
        onCheckout={onCheckout}
      />,
    );

    await userEvent.click(screen.getByText('General'));
    const buttons = screen.getAllByRole('button');
    const plusBtn = buttons.find(b => !b.hasAttribute('disabled') && b.closest('.gap-3'));
    if (plusBtn) await userEvent.click(plusBtn);
    await userEvent.click(screen.getByRole('button', { name: /checkout/i }));
    expect(onCheckout).toHaveBeenCalledWith('t1', 2, undefined);
  });
});
