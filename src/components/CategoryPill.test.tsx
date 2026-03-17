import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CategoryPill from './CategoryPill';

describe('CategoryPill', () => {
  it('renders label', () => {
    render(<CategoryPill label="Music" />);
    expect(screen.getByRole('button', { name: /music/i })).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(<CategoryPill label="Nightlife" icon="🎉" />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveTextContent('🎉');
    expect(btn).toHaveTextContent('Nightlife');
  });

  it('applies active styles when active=true', () => {
    render(<CategoryPill label="All" active />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('bg-primary');
  });

  it('applies inactive styles when active=false', () => {
    render(<CategoryPill label="All" active={false} />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('bg-card');
    expect(btn).not.toHaveClass('bg-primary');
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<CategoryPill label="Sports" onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is a button element', () => {
    render(<CategoryPill label="Food" />);
    expect(screen.getByRole('button')).toBeInstanceOf(HTMLButtonElement);
  });
});
