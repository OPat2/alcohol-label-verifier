import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '@/components/LoginPage';
import { useAuthStore } from '@/stores/auth.store';

vi.mock('@/stores/auth.store');

const mockLogin = vi.fn();
const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuthStore.mockReturnValue({ login: mockLogin, isAuthenticated: false, isLoading: false });
});

const renderLogin = () =>
  render(<MemoryRouter><LoginPage /></MemoryRouter>);

describe('LoginPage', () => {
  it('renders email and password inputs', () => {
    renderLogin();
    // Use role + name for specificity — avoids collision with demo text
    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('renders sign in button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows demo credentials section', () => {
    renderLogin();
    expect(screen.getByText(/demo credentials/i)).toBeInTheDocument();
  });

  it('calls login with pre-filled demo credentials on submit', async () => {
    mockLogin.mockResolvedValue(undefined);
    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('agent@ttb.gov', 'password123');
    });
  });

  it('shows error alert on login failure', async () => {
    mockLogin.mockRejectedValue(new Error('Bad credentials'));
    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('disables submit button while loading', () => {
    mockUseAuthStore.mockReturnValue({ login: mockLogin, isAuthenticated: false, isLoading: true });
    renderLogin();
    // Button text changes to "Signing in…" when loading
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
  });
});
