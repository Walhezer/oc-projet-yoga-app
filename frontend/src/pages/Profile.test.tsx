import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import Profile from './Profile';
import api from '../services/api';
import { authService } from '../services/auth.service';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    delete: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../services/auth.service', () => ({
  authService: {
    getCurrentUser: vi.fn(),
    getToken: vi.fn(),
    logout: vi.fn(),
    updateCurrentUser: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Profile Component', () => {
  const mockUser = {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@test.com',
    admin: false,
    createdAt: '2026-01-01T10:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.stubEnv('DEV', true);
    
    (authService.getCurrentUser as any).mockReturnValue({ id: 1, admin: false });
    (authService.getToken as any).mockReturnValue('fake-token');
    (api.get as any).mockResolvedValue({ data: mockUser });
    
    window.confirm = vi.fn().mockReturnValue(true);
    window.alert = vi.fn();
  });

  describe('Rendering & Fetching', () => {
    it('should display loading state initially', () => {
      (api.get as any).mockReturnValue(new Promise(() => {}));
      render(<MemoryRouter><Profile /></MemoryRouter>);
      expect(screen.getByText('Loading profile...')).toBeInTheDocument();
    });

    it('should remain in loading state if no user is found in authService', () => {
      (authService.getCurrentUser as any).mockReturnValue(null);
      render(<MemoryRouter><Profile /></MemoryRouter>);
      
      expect(screen.getByText('Loading profile...')).toBeInTheDocument();
      expect(api.get).not.toHaveBeenCalled();
    });

    it('should display user info on successful fetch', async () => {
      render(<MemoryRouter><Profile /></MemoryRouter>);
      
      await waitFor(() => expect(screen.getByText('John')).toBeInTheDocument());
      expect(screen.getByText('Doe')).toBeInTheDocument();
      expect(screen.getByText('john@test.com')).toBeInTheDocument();
      expect(screen.getByText('User')).toBeInTheDocument(); // Badge non-admin
      expect(screen.getByText(/January 1, 2026/i)).toBeInTheDocument(); // Date formatée
    });

    it('should display Administrator badge if user is admin', async () => {
      (api.get as any).mockResolvedValue({ data: { ...mockUser, admin: true } });
      render(<MemoryRouter><Profile /></MemoryRouter>);
      
      await waitFor(() => expect(screen.getByText('Administrator')).toBeInTheDocument());
    });

    it('should display "N/A" if createdAt is missing', async () => {
      (api.get as any).mockResolvedValue({ data: { ...mockUser, createdAt: null } });
      render(<MemoryRouter><Profile /></MemoryRouter>);
      
      await waitFor(() => expect(screen.getByText('N/A')).toBeInTheDocument());
    });

    it('should display error if fetch fails', async () => {
      (api.get as any).mockRejectedValue(new Error('Network Error'));
      render(<MemoryRouter><Profile /></MemoryRouter>);
      
      await waitFor(() => expect(screen.getByText('Failed to load user information')).toBeInTheDocument());
    });

    it('should ignore aborted fetch requests', async () => {
      const isCancelSpy = vi.spyOn(axios, 'isCancel').mockReturnValue(true);
      (api.get as any).mockRejectedValue(new Error('Canceled'));
      
      render(<MemoryRouter><Profile /></MemoryRouter>);
      await new Promise(r => setTimeout(r, 50));
      
      expect(screen.queryByText('Failed to load user information')).not.toBeInTheDocument();
      isCancelSpy.mockRestore();
    });
  });

  describe('Delete Account', () => {
    it('should call delete API, logout and navigate to login on confirmation', async () => {
      const user = userEvent.setup();
      (api.delete as any).mockResolvedValue({});
      
      render(<MemoryRouter><Profile /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('John')).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /delete account/i }));

      expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Are you sure you want to delete your account?'));
      await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/user/1', expect.any(Object)));
      expect(authService.logout).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should not call delete API if user cancels confirmation', async () => {
      const user = userEvent.setup();
      window.confirm = vi.fn().mockReturnValue(false); // L'utilisateur annule
      
      render(<MemoryRouter><Profile /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('John')).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /delete account/i }));
      expect(api.delete).not.toHaveBeenCalled();
    });

    it('should display an alert if delete API fails', async () => {
      const user = userEvent.setup();
      (api.delete as any).mockRejectedValue(new Error('Server crash'));
      
      render(<MemoryRouter><Profile /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('John')).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /delete account/i }));

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Failed to delete account');
      });
    });
  });

  describe('Promote to Admin (Dev Mode)', () => {
    it('should call promote API, update local auth and UI', async () => {
      const user = userEvent.setup();
      const promotedUser = { ...mockUser, admin: true };
      (api.post as any).mockResolvedValue({ data: promotedUser });
      
      render(<MemoryRouter><Profile /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('John')).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /promote to admin/i }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/user/promote-admin', {}, expect.any(Object));
      });
      expect(authService.updateCurrentUser).toHaveBeenCalledWith({ admin: true });
      expect(screen.getByText('Administrator')).toBeInTheDocument();
    });

    it('should display error if promote API fails', async () => {
      const user = userEvent.setup();
      (api.post as any).mockRejectedValue(new Error('Promotion failed'));
      
      render(<MemoryRouter><Profile /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('John')).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /promote to admin/i }));

      await waitFor(() => {
        expect(screen.getByText('Failed to promote to admin')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate back to sessions on button click', async () => {
      const user = userEvent.setup();
      render(<MemoryRouter><Profile /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('John')).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /back to sessions/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/sessions');
    });
  });
});