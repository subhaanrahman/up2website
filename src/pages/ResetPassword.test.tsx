import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ResetPassword from './ResetPassword';

const mockOnAuthStateChange = vi.fn();
const mockGetSession = vi.fn();
const mockUpdateUser = vi.fn();

vi.mock('@/infrastructure/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        mockOnAuthStateChange.mockImplementation(() => {
          return {
            data: {
              subscription: {
                unsubscribe: vi.fn(),
              },
            },
          };
        });
        return {
          data: {
            subscription: { unsubscribe: vi.fn() },
          },
        };
      },
      getSession: () => mockGetSession(),
      updateUser: (opts: { password: string }) => mockUpdateUser(opts),
    },
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock useNavigate for the effect's redirect
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...mod,
    useNavigate: () => mockNavigate,
  };
});

describe('ResetPassword', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockUpdateUser.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  function setLocationHash(hash: string) {
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: {
        ...originalLocation,
        hash,
      },
    });
  }

  it('shows loading state when no recovery hash', () => {
    setLocationHash('');
    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.getByText(/verifying/i)).toBeInTheDocument();
  });

  it('redirects to /auth when no recovery hash after timeout', async () => {
    vi.useFakeTimers();
    setLocationHash('');
    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );
    await vi.advanceTimersByTimeAsync(3000);
    expect(mockNavigate).toHaveBeenCalledWith('/auth', { replace: true });
    vi.useRealTimers();
  });

  it('shows reset password form when recovery ready (session + hash)', async () => {
    setLocationHash('#type=recovery');
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'u1' } } },
      error: null,
    });

    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /new password/i })).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText(/create a strong password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to sign in/i })).toBeInTheDocument();
  });

  it('calls updateUser and navigates on successful submit', async () => {
    setLocationHash('#type=recovery');
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'u1' } } },
      error: null,
    });

    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /new password/i })).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/create a strong password/i);
    await userEvent.type(input, 'Newpass123!');
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'Newpass123!' });
      expect(mockNavigate).toHaveBeenCalledWith('/auth', { replace: true });
    });
  });

  it('keeps reset button disabled until password has 8+ characters', async () => {
    setLocationHash('#type=recovery');
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'u1' } } },
      error: null,
    });

    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /new password/i })).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/create a strong password/i);
    const resetBtn = screen.getByRole('button', { name: /reset password/i });
    expect(resetBtn).toBeDisabled();

    await userEvent.type(input, 'short');
    expect(resetBtn).toBeDisabled();

    await userEvent.clear(input);
    await userEvent.type(input, 'Validpass1!');
    expect(resetBtn).toBeEnabled();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });
});
