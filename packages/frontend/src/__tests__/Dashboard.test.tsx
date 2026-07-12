import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '@/components/Dashboard';
import { useAuthStore } from '@/stores/auth.store';

vi.mock('@/stores/auth.store');

const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuthStore.mockReturnValue({
    user: { firstName: 'Jenny', email: 'jenny@ttb.gov' },
    isAuthenticated: true,
    logout: vi.fn(),
  });
});

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );

describe('Dashboard', () => {
  it('renders a welcome heading', () => {
    renderDashboard();
    expect(
      screen.getByRole('heading', { name: /welcome/i }),
    ).toBeInTheDocument();
  });

  it('has a link to single label verification', () => {
    renderDashboard();
    expect(screen.getByText(/single label verification/i)).toBeInTheDocument();
  });

  it('has a link to batch upload', () => {
    renderDashboard();
    expect(screen.getByText(/batch upload/i)).toBeInTheDocument();
  });

  it('shows how-it-works section', () => {
    renderDashboard();
    expect(screen.getByText(/how it works/i)).toBeInTheDocument();
  });

  it('shows verification status guide', () => {
    renderDashboard();
    expect(screen.getByText(/verification status guide/i)).toBeInTheDocument();
  });
});
