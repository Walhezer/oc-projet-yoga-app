import axios from 'axios';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Sessions from './Sessions';
import api from '../services/api';
import { authService } from '../services/auth.service';

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        Link: ({ children, to }: any) => <a href={to}>{children}</a>,
    };
});

vi.mock('../services/api', () => ({
    default: {
        get: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock('../services/auth.service', () => ({
    authService: {
        getCurrentUser: vi.fn(),
        getToken: vi.fn(),
    },
}));

describe('Sessions Component', () => {
    const mockSessions = [
        {
            id: 1,
            name: 'Morning Yoga',
            date: '2026-12-01T10:00:00.000Z',
            description: 'Start your day right',
            teacher: { firstName: 'Alice', lastName: 'Smith' },
            users: [1, 2, 3],
        },
        {
            id: 2,
            name: 'Evening Relaxation',
            date: '2026-12-02T18:00:00.000Z',
            description: 'Unwind after work',
            teacher: { firstName: 'Bob', lastName: 'Jones' },
            users: [1],
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        (authService.getCurrentUser as any).mockReturnValue({ id: 1, admin: false });
        (authService.getToken as any).mockReturnValue('fake-token');
    });

    it('should display the loading state initially', () => {
        (api.get as any).mockReturnValue(new Promise(() => { }));

        render(
            <MemoryRouter>
                <Sessions />
            </MemoryRouter>
        );

        expect(screen.getByText('Loading sessions...')).toBeInTheDocument();
    });

    it('should display an error message if the API call fails', async () => {
        (api.get as any).mockRejectedValue(new Error('Network Error'));

        render(
            <MemoryRouter>
                <Sessions />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Failed to load sessions')).toBeInTheDocument();
        });
    });

    it('should display "No sessions available" if API returns an empty array', async () => {
        (api.get as any).mockResolvedValue({ data: [] });

        render(
            <MemoryRouter>
                <Sessions />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('No sessions available')).toBeInTheDocument();
        });
    });

    it('should display a list of sessions when API returns data', async () => {
        (api.get as any).mockResolvedValue({ data: mockSessions });

        render(
            <MemoryRouter>
                <Sessions />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Morning Yoga')).toBeInTheDocument();
        });

        expect(screen.getByText('Morning Yoga')).toBeInTheDocument();
        expect(screen.getByText('Teacher: Alice Smith')).toBeInTheDocument();
        expect(screen.getByText('Participants: 3')).toBeInTheDocument();

        expect(screen.getByText('Evening Relaxation')).toBeInTheDocument();

        expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
        expect(screen.queryByText('Create Session')).not.toBeInTheDocument();
    });

    it('should display admin controls (Create and Delete) for admin users', async () => {
        (authService.getCurrentUser as any).mockReturnValue({ id: 1, admin: true });
        (api.get as any).mockResolvedValue({ data: mockSessions });

        render(
            <MemoryRouter>
                <Sessions />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Morning Yoga')).toBeInTheDocument();
        });

        expect(screen.getByText('Create Session')).toBeInTheDocument();
        const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
        expect(deleteButtons).toHaveLength(2);
    });

    it('should call delete API and refresh list when delete button is clicked and confirmed', async () => {
        const user = userEvent.setup();
        (authService.getCurrentUser as any).mockReturnValue({ id: 1, admin: true });

        (api.get as any).mockResolvedValue({ data: mockSessions });
        (api.delete as any).mockResolvedValue({});

        window.confirm = vi.fn().mockReturnValue(true);

        render(
            <MemoryRouter>
                <Sessions />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Morning Yoga')).toBeInTheDocument();
        });

        const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
        await user.click(deleteButtons[0]);

        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this session?');

        expect(api.delete).toHaveBeenCalledWith('/session/1', expect.any(Object));

        expect(api.get).toHaveBeenCalledTimes(2);
    });

    it('should not call delete API if user cancels the confirmation popup', async () => {
        const user = userEvent.setup();
        (authService.getCurrentUser as any).mockReturnValue({ id: 1, admin: true });
        (api.get as any).mockResolvedValue({ data: mockSessions });

        window.confirm = vi.fn().mockReturnValue(false);

        render(
            <MemoryRouter>
                <Sessions />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Morning Yoga')).toBeInTheDocument();
        });

        const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
        await user.click(deleteButtons[0]);

        expect(api.delete).not.toHaveBeenCalled();
    });

    it('should not display error if API call is cancelled (component unmount)', async () => {
        const cancelError = new Error('Canceled');
        (api.get as any).mockRejectedValue(cancelError);

        const isCancelSpy = vi.spyOn(axios, 'isCancel').mockReturnValue(true);

        render(
            <MemoryRouter>
                <Sessions />
            </MemoryRouter>
        );

        await new Promise((r) => setTimeout(r, 50));

        expect(screen.queryByText('Failed to load sessions')).not.toBeInTheDocument();

        isCancelSpy.mockRestore();
    });

    it('should display an alert if the delete API call fails', async () => {
        const user = userEvent.setup();
        (authService.getCurrentUser as any).mockReturnValue({ id: 1, admin: true });
        (api.get as any).mockResolvedValue({ data: mockSessions });

        (api.delete as any).mockRejectedValue(new Error('Server crash'));

        window.confirm = vi.fn().mockReturnValue(true);
        window.alert = vi.fn();

        render(
            <MemoryRouter>
                <Sessions />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Morning Yoga')).toBeInTheDocument();
        });

        const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
        await user.click(deleteButtons[0]);

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith('Failed to delete session');
        });
    });
});