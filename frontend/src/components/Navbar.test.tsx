import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Navbar from './Navbar';
import { authService } from '../services/auth.service';

vi.mock('../services/auth.service', () => ({
  authService: {
    getCurrentUser: vi.fn(),
    isAuthenticated: vi.fn(),
    logout: vi.fn(),
  },
}));

describe('Navbar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display "Login" and "Register" when user is NOT authenticated', () => {
    (authService.isAuthenticated as any).mockReturnValue(false);
    (authService.getCurrentUser as any).mockReturnValue(null);

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getByText('Yoga Studio')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
    expect(screen.queryByText('Sessions')).not.toBeInTheDocument();
  });

  it('should call logout() on "Logout" button click', async () => {
    (authService.isAuthenticated as any).mockReturnValue(true);
    (authService.getCurrentUser as any).mockReturnValue({ id: 1, admin: false });
    
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    const logoutButton = screen.getByRole('button', { name: /logout/i });
    await user.click(logoutButton);

    expect(authService.logout).toHaveBeenCalledTimes(1);
  });

  it('should display "Sessions", "Profile", and "Logout" for a standard authenticated user', () => {
    (authService.isAuthenticated as any).mockReturnValue(true);
    (authService.getCurrentUser as any).mockReturnValue({ id: 1, email: 'user@test.com', admin: false });

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getByText('Sessions')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
    expect(screen.queryByText('Create Session')).not.toBeInTheDocument();
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
  });

  it('should display "Create Session" when an admin user is authenticated', () => {
    (authService.isAuthenticated as any).mockReturnValue(true);
    (authService.getCurrentUser as any).mockReturnValue({ id: 1, email: 'admin@test.com', admin: true });

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getByText('Create Session')).toBeInTheDocument();
  });
});