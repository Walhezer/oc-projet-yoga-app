import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import SessionDetail from './SessionDetail';
import api from '../services/api';
import { authService } from '../services/auth.service';

vi.mock('../services/api', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock('../services/auth.service', () => ({
    authService: {
        getCurrentUser: vi.fn(),
        getToken: vi.fn(),
    },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => ({ id: '1' }), // On simule qu'on est sur la page de la session ID 1
    };
});

describe('SessionDetail Component', () => {
    const mockSession = {
        id: 1,
        name: 'Relaxing Yoga',
        date: '2026-12-20T10:00:00.000Z',
        description: 'A deep relaxation session.',
        teacher: { firstName: 'Alice', lastName: 'Smith' },
        users: [],
    };

    const mockSessionWithParticipant = {
        ...mockSession,
        users: [1],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (authService.getToken as any).mockReturnValue('fake-token');
        // Par défaut, le composant charge la session avec succès
        (api.get as any).mockResolvedValue({ data: mockSession });
        // On mock les alertes et confirmations du navigateur
        window.alert = vi.fn();
        window.confirm = vi.fn().mockReturnValue(true);
    });

    describe('Loading and Error States', () => {
        it('should display loading state initially', () => {
            // On bloque la résolution de l'API pour voir le "Loading..."
            (api.get as any).mockReturnValue(new Promise(() => { }));
            (authService.getCurrentUser as any).mockReturnValue({ id: 1, admin: false });

            render(<MemoryRouter><SessionDetail /></MemoryRouter>);

            expect(screen.getByText('Loading session...')).toBeInTheDocument();
        });

        it('should display error message if API fails to load session', async () => {
            (api.get as any).mockRejectedValue(new Error('Network Error'));
            (authService.getCurrentUser as any).mockReturnValue({ id: 1, admin: false });

            render(<MemoryRouter><SessionDetail /></MemoryRouter>);

            await waitFor(() => {
                expect(screen.getByText('Failed to load session details')).toBeInTheDocument();
            });
        });

        it('should ignore aborted fetch requests', async () => {
            const isCancelSpy = vi.spyOn(axios, 'isCancel').mockReturnValue(true);
            (api.get as any).mockRejectedValue(new Error('Canceled'));
            (authService.getCurrentUser as any).mockReturnValue({ id: 1, admin: false });

            render(<MemoryRouter><SessionDetail /></MemoryRouter>);

            await new Promise((r) => setTimeout(r, 50));
            expect(screen.queryByText('Failed to load session details')).not.toBeInTheDocument();
            isCancelSpy.mockRestore();
        });
    });

    describe('Admin User Actions', () => {
        beforeEach(() => {
            (authService.getCurrentUser as any).mockReturnValue({ id: 99, admin: true });
        });

        it('should display admin buttons and allow navigation to edit page', async () => {
            const user = userEvent.setup();
            render(<MemoryRouter><SessionDetail /></MemoryRouter>);

            await waitFor(() => expect(screen.getByText('Relaxing Yoga')).toBeInTheDocument());

            const editButton = screen.getByRole('button', { name: /edit/i });
            expect(editButton).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();

            await user.click(editButton);
            expect(mockNavigate).toHaveBeenCalledWith('/sessions/edit/1');
        });

        it('should call delete API and navigate on confirmation', async () => {
            const user = userEvent.setup();
            (api.delete as any).mockResolvedValue({});

            render(<MemoryRouter><SessionDetail /></MemoryRouter>);
            await waitFor(() => expect(screen.getByText('Relaxing Yoga')).toBeInTheDocument());

            await user.click(screen.getByRole('button', { name: /delete/i }));

            expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this session?');
            await waitFor(() => {
                expect(api.delete).toHaveBeenCalledWith('/session/1', expect.any(Object));
            });
            expect(mockNavigate).toHaveBeenCalledWith('/sessions');
        });

        it('should not call delete API if confirmation is cancelled', async () => {
            const user = userEvent.setup();
            window.confirm = vi.fn().mockReturnValue(false); // L'admin annule

            render(<MemoryRouter><SessionDetail /></MemoryRouter>);
            await waitFor(() => expect(screen.getByText('Relaxing Yoga')).toBeInTheDocument());

            await user.click(screen.getByRole('button', { name: /delete/i }));

            expect(api.delete).not.toHaveBeenCalled();
        });

        it('should display an alert if delete API fails', async () => {
            const user = userEvent.setup();
            (api.delete as any).mockRejectedValue(new Error('Server crash'));

            render(<MemoryRouter><SessionDetail /></MemoryRouter>);
            await waitFor(() => expect(screen.getByText('Relaxing Yoga')).toBeInTheDocument());

            await user.click(screen.getByRole('button', { name: /delete/i }));

            await waitFor(() => {
                expect(window.alert).toHaveBeenCalledWith('Failed to delete session');
            });
        });
    });

    describe('Standard User Actions', () => {
        beforeEach(() => {
            // Un utilisateur normal (non-admin) avec l'ID 1
            (authService.getCurrentUser as any).mockReturnValue({ id: 1, admin: false });
        });

        it('should allow user to join a session if not participating', async () => {
            const user = userEvent.setup();
            (api.post as any).mockResolvedValue({});

            render(<MemoryRouter><SessionDetail /></MemoryRouter>);
            await waitFor(() => expect(screen.getByText('Relaxing Yoga')).toBeInTheDocument());

            const joinButton = screen.getByRole('button', { name: /join session/i });
            expect(joinButton).toBeInTheDocument();

            await user.click(joinButton);

            await waitFor(() => {
                expect(api.post).toHaveBeenCalledWith('/session/1/participate/1', {}, expect.any(Object));
                expect(api.get).toHaveBeenCalledTimes(2); // Le fetchSession initial + le refresh après participation
            });
        });

        it('should display an alert if joining a session fails', async () => {
            const user = userEvent.setup();
            (api.post as any).mockRejectedValue(new Error('Participation failed'));

            render(<MemoryRouter><SessionDetail /></MemoryRouter>);
            await waitFor(() => expect(screen.getByText('Relaxing Yoga')).toBeInTheDocument());

            await user.click(screen.getByRole('button', { name: /join session/i }));

            await waitFor(() => {
                expect(window.alert).toHaveBeenCalledWith('Failed to join session');
            });
        });

        it('should allow user to leave a session if already participating', async () => {
            const user = userEvent.setup();
            (api.get as any).mockResolvedValue({ data: mockSessionWithParticipant });
            (api.delete as any).mockResolvedValue({});

            render(<MemoryRouter><SessionDetail /></MemoryRouter>);
            await waitFor(() => expect(screen.getByText('Relaxing Yoga')).toBeInTheDocument());

            const leaveButton = screen.getByRole('button', { name: /leave session/i });
            expect(leaveButton).toBeInTheDocument();

            await user.click(leaveButton);

            await waitFor(() => {
                expect(api.delete).toHaveBeenCalledWith('/session/1/participate/1', expect.any(Object));
                expect(api.get).toHaveBeenCalledTimes(2); // Le refresh
            });
        });

        it('should display an alert if leaving a session fails', async () => {
            const user = userEvent.setup();
            (api.get as any).mockResolvedValue({ data: mockSessionWithParticipant });
            (api.delete as any).mockRejectedValue(new Error('Unparticipate failed'));

            render(<MemoryRouter><SessionDetail /></MemoryRouter>);
            await waitFor(() => expect(screen.getByText('Relaxing Yoga')).toBeInTheDocument());

            await user.click(screen.getByRole('button', { name: /leave session/i }));

            await waitFor(() => {
                expect(window.alert).toHaveBeenCalledWith('Failed to leave session');
            });
        });
    });

    it('should navigate back to sessions list when back button is clicked', async () => {
        const user = userEvent.setup();
        (authService.getCurrentUser as any).mockReturnValue({ id: 1, admin: false });

        render(<MemoryRouter><SessionDetail /></MemoryRouter>);
        await waitFor(() => expect(screen.getByText('Relaxing Yoga')).toBeInTheDocument());

        await user.click(screen.getByRole('button', { name: /back to sessions/i }));
        expect(mockNavigate).toHaveBeenCalledWith('/sessions');
    });

    it('should display join button if user is not logged in', async () => {
        (authService.getCurrentUser as any).mockReturnValue(null);

        render(<MemoryRouter><SessionDetail /></MemoryRouter>);
        await waitFor(() => expect(screen.getByText('Relaxing Yoga')).toBeInTheDocument());

        expect(screen.getByRole('button', { name: /back to sessions/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /join session/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /leave session/i })).not.toBeInTheDocument();
    });
});