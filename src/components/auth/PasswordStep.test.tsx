import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordStep from './PasswordStep';

const mockLogin = vi.fn();
const onSuccess = vi.fn();
const onBack = vi.fn();
const onForgotPassword = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe('PasswordStep', () => {
  const phone = '+61412345678';

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin.mockResolvedValue({ error: null });
  });

  it('renders password input and phone number', () => {
    render(
      <PasswordStep
        phone={phone}
        onSuccess={onSuccess}
        onBack={onBack}
        onForgotPassword={onForgotPassword}
      />
    );

    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    expect(screen.getByText(/61412345678/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /forgot password/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /different number/i })).toBeInTheDocument();
  });

  it('calls onSuccess when login succeeds', async () => {
    mockLogin.mockResolvedValue({ error: null });

    render(
      <PasswordStep
        phone={phone}
        onSuccess={onSuccess}
        onBack={onBack}
        onForgotPassword={onForgotPassword}
      />
    );

    const input = screen.getByPlaceholderText(/enter your password/i);
    await userEvent.type(input, 'mypassword123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(mockLogin).toHaveBeenCalledWith(phone, 'mypassword123');
    expect(onSuccess).toHaveBeenCalled();
  });

  it('calls onBack when Different number clicked', async () => {
    render(
      <PasswordStep
        phone={phone}
        onSuccess={onSuccess}
        onBack={onBack}
        onForgotPassword={onForgotPassword}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /different number/i }));

    expect(onBack).toHaveBeenCalled();
  });

  it('calls onForgotPassword when Forgot password clicked', async () => {
    render(
      <PasswordStep
        phone={phone}
        onSuccess={onSuccess}
        onBack={onBack}
        onForgotPassword={onForgotPassword}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /forgot password/i }));

    expect(onForgotPassword).toHaveBeenCalled();
  });

  it('shows error when login fails', async () => {
    mockLogin.mockResolvedValue({ error: new Error('Invalid password') });

    render(
      <PasswordStep
        phone={phone}
        onSuccess={onSuccess}
        onBack={onBack}
        onForgotPassword={onForgotPassword}
      />
    );

    const input = screen.getByPlaceholderText(/enter your password/i);
    await userEvent.type(input, 'wrongpassword');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText('Invalid password')).toBeInTheDocument();
  });

  it('disables sign in button when password empty', () => {
    render(
      <PasswordStep
        phone={phone}
        onSuccess={onSuccess}
        onBack={onBack}
        onForgotPassword={onForgotPassword}
      />
    );

    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
  });

  it('renders Try code again when onTryOtpAgain provided', () => {
    render(
      <PasswordStep
        phone={phone}
        onSuccess={onSuccess}
        onBack={onBack}
        onTryOtpAgain={vi.fn()}
        onForgotPassword={onForgotPassword}
      />
    );

    expect(screen.getByRole('button', { name: /try code again/i })).toBeInTheDocument();
  });
});
