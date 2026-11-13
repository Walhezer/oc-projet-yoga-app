import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import SessionForm from './SessionForm';
import api from '../services/api';
import { authService } from '../services/auth.service';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock('../services/auth.service', () => ({
  authService: {
    getCurrentUser: vi.fn(),
    getToken: vi.fn(),
  },
}));

// Mock pour espionner la navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('SessionForm Component', () => {
  const mockTeachers = [
    { id: 1, firstName: 'Alice', lastName: 'Smith' },
    { id: 2, firstName: 'Bob', lastName: 'Jones' },
  ];

  const mockSession = {
    id: 99,
    name: 'Advanced Yoga',
    date: '2026-12-15T10:00:00.000Z',
    description: 'A tough session',
    teacher: { id: 2, firstName: 'Bob', lastName: 'Jones' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (authService.getCurrentUser as any).mockReturnValue({ id: 1, admin: true });
    (authService.getToken as any).mockReturnValue('fake-token');
    
    // Comportement par défaut global
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/teacher') return Promise.resolve({ data: mockTeachers });
      return Promise.resolve({ data: {} });
    });
  });

  // --- SÉCURITÉ ---
  it('should redirect to /sessions if user is not an admin', () => {
    (authService.getCurrentUser as any).mockReturnValue({ id: 1, admin: false });
    render(<MemoryRouter><SessionForm /></MemoryRouter>);
    expect(mockNavigate).toHaveBeenCalledWith('/sessions');
  });

  // --- MODE CRÉATION ---
  describe('Create Mode', () => {
    it('should render the creation form and load teachers', async () => {
      render(
        <MemoryRouter initialEntries={['/sessions/create']}>
          <Routes><Route path="/sessions/create" element={<SessionForm />} /></Routes>
        </MemoryRouter>
      );
      expect(screen.getByRole('heading', { name: /create new session/i })).toBeInTheDocument();
      await waitFor(() => expect(screen.getByText('Alice Smith')).toBeInTheDocument());
    });

    it('should log an error if fetching teachers fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (api.get as any).mockRejectedValueOnce(new Error('Teacher API down'));
      
      render(
        <MemoryRouter initialEntries={['/sessions/create']}>
          <Routes><Route path="/sessions/create" element={<SessionForm />} /></Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch teachers', expect.any(Error));
      });
      consoleSpy.mockRestore();
    });

    it('should submit form and call POST API on success', async () => {
      const user = userEvent.setup();
      (api.post as any).mockResolvedValue({});

      render(
        <MemoryRouter initialEntries={['/sessions/create']}>
          <Routes><Route path="/sessions/create" element={<SessionForm />} /></Routes>
        </MemoryRouter>
      );

      await waitFor(() => expect(screen.getByText('Alice Smith')).toBeInTheDocument());
      await user.type(screen.getByLabelText(/session name/i), 'Morning Flow');
      await user.type(screen.getByLabelText(/date/i), '2026-11-20');
      await user.selectOptions(screen.getByLabelText(/teacher/i), '1');
      await user.type(screen.getByLabelText(/description/i), 'Relaxing morning session');
      await user.click(screen.getByRole('button', { name: /create session/i }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/session', {
          name: 'Morning Flow',
          date: '2026-11-20',
          teacherId: 1,
          description: 'Relaxing morning session',
        }, expect.any(Object));
      });
      expect(mockNavigate).toHaveBeenCalledWith('/sessions');
    });

    it('should display error message if API POST fails (axios error)', async () => {
      const user = userEvent.setup();
      const axiosError = new axios.AxiosError('Network Error');
      axiosError.response = { data: { message: 'Invalid data' } } as any;
      (api.post as any).mockRejectedValue(axiosError);

      render(
        <MemoryRouter initialEntries={['/sessions/create']}>
          <Routes><Route path="/sessions/create" element={<SessionForm />} /></Routes>
        </MemoryRouter>
      );

      await waitFor(() => expect(screen.getByText('Alice Smith')).toBeInTheDocument());
      await user.type(screen.getByLabelText(/session name/i), 'Test');
      await user.type(screen.getByLabelText(/date/i), '2026-11-20');
      await user.selectOptions(screen.getByLabelText(/teacher/i), '1');
      await user.type(screen.getByLabelText(/description/i), 'Test desc');
      await user.click(screen.getByRole('button', { name: /create session/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid data')).toBeInTheDocument();
      });
    });

    it('should display generic error if API POST fails without message', async () => {
        const user = userEvent.setup();
        (api.post as any).mockRejectedValue(new axios.AxiosError('Network Error'));
  
        render(
          <MemoryRouter initialEntries={['/sessions/create']}>
            <Routes><Route path="/sessions/create" element={<SessionForm />} /></Routes>
          </MemoryRouter>
        );
  
        await waitFor(() => expect(screen.getByText('Alice Smith')).toBeInTheDocument());
        await user.type(screen.getByLabelText(/session name/i), 'Test');
        await user.type(screen.getByLabelText(/date/i), '2026-11-20');
        await user.selectOptions(screen.getByLabelText(/teacher/i), '1');
        await user.type(screen.getByLabelText(/description/i), 'Test desc');
        await user.click(screen.getByRole('button', { name: /create session/i }));
  
        await waitFor(() => {
          expect(screen.getByText('Failed to save session')).toBeInTheDocument();
        });
    });
  });

  // --- MODE ÉDITION ---
  describe('Edit Mode', () => {
    beforeEach(() => {
      (api.get as any).mockImplementation((url: string) => {
        if (url === '/teacher') return Promise.resolve({ data: mockTeachers });
        if (url === '/session/99') return Promise.resolve({ data: mockSession });
        return Promise.reject(new Error('not found'));
      });
    });

    it('should render the edit form and load existing session data', async () => {
      render(
        <MemoryRouter initialEntries={['/sessions/edit/99']}>
          <Routes><Route path="/sessions/edit/:id" element={<SessionForm />} /></Routes>
        </MemoryRouter>
      );
      
      expect(screen.getByRole('heading', { name: /edit session/i })).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByLabelText(/session name/i)).toHaveValue('Advanced Yoga');
        expect(screen.getByLabelText(/date/i)).toHaveValue('2026-12-15');
      });
    });

    it('should submit form and call PUT API on success', async () => {
      const user = userEvent.setup();
      (api.put as any).mockResolvedValue({});

      render(
        <MemoryRouter initialEntries={['/sessions/edit/99']}>
          <Routes><Route path="/sessions/edit/:id" element={<SessionForm />} /></Routes>
        </MemoryRouter>
      );

      await waitFor(() => expect(screen.getByLabelText(/session name/i)).toHaveValue('Advanced Yoga'));
      const nameInput = screen.getByLabelText(/session name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Very Advanced Yoga');
      await user.click(screen.getByRole('button', { name: /update session/i }));

      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith('/session/99', {
          name: 'Very Advanced Yoga',
          date: '2026-12-15',
          teacherId: 2,
          description: 'A tough session',
        }, expect.any(Object));
      });
      expect(mockNavigate).toHaveBeenCalledWith('/sessions');
    });

    it('should display error if fetch session fails', async () => {
        (api.get as any).mockImplementation((url: string) => {
            if (url === '/teacher') return Promise.resolve({ data: mockTeachers });
            if (url === '/session/99') return Promise.reject(new Error('Crash'));
            return Promise.resolve({});
        });
        
        render(
            <MemoryRouter initialEntries={['/sessions/edit/99']}>
              <Routes><Route path="/sessions/edit/:id" element={<SessionForm />} /></Routes>
            </MemoryRouter>
          );
          
        await waitFor(() => expect(screen.getByText('Failed to load session')).toBeInTheDocument());
    });

    it('should display error if API PUT fails during update (axios error)', async () => {
      const user = userEvent.setup();
      const axiosError = new axios.AxiosError('Network Error');
      axiosError.response = { data: { message: 'Update failed' } } as any;
      
      // On s'assure que le GET réussisse pour que le formulaire se remplisse avant l'échec du PUT
      (api.get as any).mockImplementation((url: string) => {
        if (url === '/teacher') return Promise.resolve({ data: mockTeachers });
        if (url === '/session/99') return Promise.resolve({ data: mockSession });
        return Promise.resolve({ data: {} });
      });
      (api.put as any).mockRejectedValue(axiosError);

      render(
        <MemoryRouter initialEntries={['/sessions/edit/99']}>
          <Routes><Route path="/sessions/edit/:id" element={<SessionForm />} /></Routes>
        </MemoryRouter>
      );

      await waitFor(() => expect(screen.getByLabelText(/session name/i)).toHaveValue('Advanced Yoga'));
      await user.click(screen.getByRole('button', { name: /update session/i }));

      await waitFor(() => expect(screen.getByText('Update failed')).toBeInTheDocument());
    });

    it('should display generic error if API PUT fails with non-axios error', async () => {
      const user = userEvent.setup();
      
      (api.get as any).mockImplementation((url: string) => {
        if (url === '/teacher') return Promise.resolve({ data: mockTeachers });
        if (url === '/session/99') return Promise.resolve({ data: mockSession });
        return Promise.resolve({ data: {} });
      });
      (api.put as any).mockRejectedValue(new Error('Generic System Failure'));

      render(
        <MemoryRouter initialEntries={['/sessions/edit/99']}>
          <Routes><Route path="/sessions/edit/:id" element={<SessionForm />} /></Routes>
        </MemoryRouter>
      );

      await waitFor(() => expect(screen.getByLabelText(/session name/i)).toHaveValue('Advanced Yoga'));
      await user.click(screen.getByRole('button', { name: /update session/i }));

      await waitFor(() => expect(screen.getByText('Failed to save session')).toBeInTheDocument());
    });
  });

  // --- ACTIONS GLOBALES ---
  it('should navigate back to sessions on Cancel', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/sessions/create']}>
        <Routes><Route path="/sessions/create" element={<SessionForm />} /></Routes>
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/sessions');
  });

  it('should ignore aborted fetch requests', async () => {
    const isCancelSpy = vi.spyOn(axios, 'isCancel').mockReturnValue(true);
    (api.get as any).mockRejectedValue(new Error('Canceled'));

    render(
      <MemoryRouter initialEntries={['/sessions/edit/99']}>
        <Routes><Route path="/sessions/edit/:id" element={<SessionForm />} /></Routes>
      </MemoryRouter>
    );

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText('Failed to load session')).not.toBeInTheDocument();
    isCancelSpy.mockRestore();
  });
});