import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OtpStep from './OtpStep';

const mockVerifyOtp = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ verifyOtp: mockVerifyOtp }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe('OtpStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyOtp.mockResolvedValue({ error: null });
  });

  it('renders OTP input and phone number', () => {
    const onVerified = vi.fn();
    render(<OtpStep phone="+61412345678" onVerified={onVerified} onBack={vi.fn()} />);

    expect(screen.getByText(/61412345678/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
  });

  it('calls onVerified when valid OTP submitted', async () => {
    const onVerified = vi.fn();
    mockVerifyOtp.mockResolvedValue({ error: null });

    render(<OtpStep phone="+61412345678" onVerified={onVerified} onBack={vi.fn()} />);

    const input = screen.getByPlaceholderText('000000');
    await userEvent.type(input, '123456');
    const verifyBtn = screen.getByRole('button', { name: /verify/i });
    await userEvent.click(verifyBtn);

    await vi.waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith('+61412345678', '123456');
      expect(onVerified).toHaveBeenCalled();
    });
  });

  it('calls onBack when back clicked', async () => {
    const onBack = vi.fn();
    render(<OtpStep phone="+61412345678" onVerified={vi.fn()} onBack={onBack} />);

    const backBtn = screen.getByRole('button', { name: /use a different number/i });
    await userEvent.click(backBtn);
    expect(onBack).toHaveBeenCalled();
  });
});
