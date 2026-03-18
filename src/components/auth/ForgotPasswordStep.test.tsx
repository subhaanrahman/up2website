import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ForgotPasswordStep from './ForgotPasswordStep';

const mockSendOtp = vi.fn();
const mockForgotPasswordCheck = vi.fn();
const mockForgotPasswordReset = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    sendOtp: mockSendOtp,
    forgotPasswordCheck: mockForgotPasswordCheck,
    forgotPasswordReset: mockForgotPasswordReset,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe('ForgotPasswordStep', () => {
  const phone = '+61412345678';
  const onSuccess = vi.fn();
  const onBack = vi.fn();
  const validPassword = 'Newpass123!';
  const mockToken = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendOtp.mockResolvedValue({ error: null });
    mockForgotPasswordCheck.mockResolvedValue({
      result: { hasVerifiedEmail: false, resetToken: mockToken },
      error: null,
    });
    mockForgotPasswordReset.mockResolvedValue({ error: null });
  });

  it('renders reset password UI with Send code initially', () => {
    render(<ForgotPasswordStep phone={phone} onSuccess={onSuccess} onBack={onBack} />);

    expect(screen.getByText(/reset password/i)).toBeInTheDocument();
    expect(screen.getByText(/61412345678/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send code/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to sign in/i })).toBeInTheDocument();
  });

  it('calls sendOtp when Send code clicked', async () => {
    render(<ForgotPasswordStep phone={phone} onSuccess={onSuccess} onBack={onBack} />);

    await userEvent.click(screen.getByRole('button', { name: /send code/i }));

    await waitFor(() => {
      expect(mockSendOtp).toHaveBeenCalledWith(phone);
    });
  });

  it('shows OTP and Continue after code sent (not password form yet)', async () => {
    render(<ForgotPasswordStep phone={phone} onSuccess={onSuccess} onBack={onBack} />);

    await userEvent.click(screen.getByRole('button', { name: /send code/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    });
    expect(screen.queryByPlaceholderText(/create a strong password/i)).not.toBeInTheDocument();
  });

  it('calls forgotPasswordCheck on Continue, then shows password form on success', async () => {
    render(<ForgotPasswordStep phone={phone} onSuccess={onSuccess} onBack={onBack} />);

    await userEvent.click(screen.getByRole('button', { name: /send code/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
    });

    await userEvent.type(screen.getByPlaceholderText('000000'), '123456');
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(mockForgotPasswordCheck).toHaveBeenCalledWith(phone, '123456');
    });

    await waitFor(() => {
      expect(screen.getByText(/set new password/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/create a strong password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
    });
  });

  it('calls forgotPasswordReset with token and password on second screen submit', async () => {
    render(<ForgotPasswordStep phone={phone} onSuccess={onSuccess} onBack={onBack} />);

    await userEvent.click(screen.getByRole('button', { name: /send code/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
    });

    await userEvent.type(screen.getByPlaceholderText('000000'), '123456');
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/create a strong password/i)).toBeInTheDocument();
    });

    await userEvent.type(screen.getByPlaceholderText(/create a strong password/i), validPassword);
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(mockForgotPasswordReset).toHaveBeenCalledWith(mockToken, validPassword);
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('calls onBack when Back to sign in clicked', async () => {
    render(<ForgotPasswordStep phone={phone} onSuccess={onSuccess} onBack={onBack} />);

    await userEvent.click(screen.getByRole('button', { name: /back to sign in/i }));

    expect(onBack).toHaveBeenCalled();
  });

  it('shows error and stays on verify when forgotPasswordCheck fails', async () => {
    mockForgotPasswordCheck.mockResolvedValue({
      result: null,
      error: new Error('Invalid or expired verification code'),
    });

    render(<ForgotPasswordStep phone={phone} onSuccess={onSuccess} onBack={onBack} />);

    await userEvent.click(screen.getByRole('button', { name: /send code/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
    });

    await userEvent.type(screen.getByPlaceholderText('000000'), '123456');
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid or expired/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    });
  });

  it('shows error when forgotPasswordReset fails', async () => {
    mockForgotPasswordReset.mockResolvedValue({ error: new Error('Failed to update password') });

    render(<ForgotPasswordStep phone={phone} onSuccess={onSuccess} onBack={onBack} />);

    await userEvent.click(screen.getByRole('button', { name: /send code/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
    });

    await userEvent.type(screen.getByPlaceholderText('000000'), '123456');
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/create a strong password/i)).toBeInTheDocument();
    });

    await userEvent.type(screen.getByPlaceholderText(/create a strong password/i), validPassword);
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to update password/i)).toBeInTheDocument();
    });
  });

  it('validates OTP length before Continue', async () => {
    render(<ForgotPasswordStep phone={phone} onSuccess={onSuccess} onBack={onBack} />);

    await userEvent.click(screen.getByRole('button', { name: /send code/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
    });

    await userEvent.type(screen.getByPlaceholderText('000000'), '12345');
    const continueBtn = screen.getByRole('button', { name: /continue/i });
    expect(continueBtn).toBeDisabled();

    await userEvent.clear(screen.getByPlaceholderText('000000'));
    await userEvent.type(screen.getByPlaceholderText('000000'), '123456');
    expect(continueBtn).toBeEnabled();
  });

  it('validates password rules on new-password step', async () => {
    render(<ForgotPasswordStep phone={phone} onSuccess={onSuccess} onBack={onBack} />);

    await userEvent.click(screen.getByRole('button', { name: /send code/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
    });

    await userEvent.type(screen.getByPlaceholderText('000000'), '123456');
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/create a strong password/i)).toBeInTheDocument();
    });

    const resetBtn = screen.getByRole('button', { name: /reset password/i });
    expect(resetBtn).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText(/create a strong password/i), 'short');
    expect(resetBtn).toBeDisabled();

    await userEvent.clear(screen.getByPlaceholderText(/create a strong password/i));
    await userEvent.type(screen.getByPlaceholderText(/create a strong password/i), validPassword);
    expect(resetBtn).toBeEnabled();
  });

  it('Back from password screen returns to verify and clears token', async () => {
    render(<ForgotPasswordStep phone={phone} onSuccess={onSuccess} onBack={onBack} />);

    await userEvent.click(screen.getByRole('button', { name: /send code/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
    });

    await userEvent.type(screen.getByPlaceholderText('000000'), '123456');
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/create a strong password/i)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /back/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/create a strong password/i)).not.toBeInTheDocument();
    });
  });
});
