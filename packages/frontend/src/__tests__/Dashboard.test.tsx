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
  mockUseAuthStore.mockReturnValue({ user: { firstName: 'Jenny' }, isAuthenticated: true, logout: vi.fn() });
});

const renderDashboard = () => render(<MemoryRouter><Dashboard /></MemoryRouter>);

describe('Dashboard', () => {
  it('renders welcome heading', () => {
    renderDashboard();
    expect(screen.getByRole('heading', { name: /welcome/i })).toBeInTheDocument();
  });

  it('has a card for single label verification', () => {
    renderDashboard();
    // Use the unique h3 heading inside the card
    expect(screen.getByRole('heading', { name: /single label verification/i })).toBeInTheDocument();
  });

  it('has a card for batch upload', () => {
    renderDashboard();
    expect(screen.getByRole('heading', { name: /batch upload/i })).toBeInTheDocument();
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
