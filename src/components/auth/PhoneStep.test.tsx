import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhoneStep from './PhoneStep';

const mockCheckPhone = vi.fn();
const mockSendOtp = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    checkPhone: mockCheckPhone,
    sendOtp: mockSendOtp,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/components/PhoneInput', () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input
      data-testid="phone-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Phone number"
    />
  ),
}));

describe('PhoneStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckPhone.mockResolvedValue({ exists: false, error: null });
    mockSendOtp.mockResolvedValue({ error: null });
  });

  it('renders phone input', () => {
    const onPhoneChecked = vi.fn();
    render(<PhoneStep onPhoneChecked={onPhoneChecked} />);
    expect(screen.getByTestId('phone-input')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });

  it('calls onPhoneChecked with phone and exists when new user', async () => {
    const onPhoneChecked = vi.fn();
    mockCheckPhone.mockResolvedValue({ exists: false, error: null });

    render(<PhoneStep onPhoneChecked={onPhoneChecked} />);

    const input = screen.getByTestId('phone-input');
    await userEvent.type(input, '+61412345678');
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(onPhoneChecked).toHaveBeenCalledWith('+61412345678', false);
    });
  });
});
