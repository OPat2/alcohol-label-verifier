import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  mockUseAuthStore.mockReturnValue({
    login: mockLogin,
    isAuthenticated: false,
    isLoading: false,
  });
});

const renderLogin = () =>
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );

describe('LoginPage', () => {
  it('renders email and password fields', () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders sign in button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows demo credentials section', () => {
    renderLogin();
    expect(screen.getByText(/demo/i)).toBeInTheDocument();
  });

  it('calls login with entered credentials', async () => {
    mockLogin.mockResolvedValue(undefined);
    renderLogin();

    await userEvent.type(screen.getByLabelText(/email/i), 'agent@ttb.gov');
    await userEvent.type(screen.getByLabelText(/password/i), 'demo123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('agent@ttb.gov', 'demo123');
    });
  });

  it('shows error message on login failure', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));
    renderLogin();

    await userEvent.type(screen.getByLabelText(/email/i), 'wrong@test.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('disables form while loading', () => {
    mockUseAuthStore.mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      isLoading: true,
    });
    renderLogin();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
  });
});
