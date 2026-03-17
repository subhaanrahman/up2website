import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrderFlow } from './useOrderFlow';

vi.mock('@/infrastructure/api-client', () => ({
  callEdgeFunction: vi.fn(),
}));

import { callEdgeFunction } from '@/infrastructure/api-client';

const mockCallEdgeFunction = callEdgeFunction as ReturnType<typeof vi.fn>;

describe('useOrderFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reserve sets order on success', async () => {
    const mockOrder = {
      id: 'ord_1',
      amount_cents: 5000,
      currency: 'aud',
      status: 'reserved',
      expires_at: '2026-01-01T00:00:00Z',
    };
    mockCallEdgeFunction.mockResolvedValueOnce(mockOrder);

    const { result } = renderHook(() => useOrderFlow());

    await act(async () => {
      await result.current.reserve({
        event_id: 'evt_1',
        ticket_tier_id: 'tier_1',
        quantity: 1,
      });
    });

    expect(result.current.order).toEqual(mockOrder);
    expect(result.current.error).toBeNull();
  });

  it('reserve sets error on failure', async () => {
    mockCallEdgeFunction.mockRejectedValueOnce(new Error('Sold out'));

    const { result } = renderHook(() => useOrderFlow());

    await act(async () => {
      await result.current.reserve({
        event_id: 'evt_1',
        ticket_tier_id: 'tier_1',
        quantity: 1,
      });
    });

    expect(result.current.order).toBeNull();
    expect(result.current.error).toBe('Sold out');
  });

  it('reset clears order, clientSecret and error', async () => {
    mockCallEdgeFunction.mockResolvedValueOnce({
      id: 'ord_1',
      amount_cents: 5000,
      currency: 'aud',
      status: 'reserved',
      expires_at: '2026-01-01T00:00:00Z',
    });

    const { result } = renderHook(() => useOrderFlow());

    await act(async () => {
      await result.current.reserve({
        event_id: 'evt_1',
        ticket_tier_id: 'tier_1',
        quantity: 1,
      });
    });

    expect(result.current.order).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.order).toBeNull();
    expect(result.current.clientSecret).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
