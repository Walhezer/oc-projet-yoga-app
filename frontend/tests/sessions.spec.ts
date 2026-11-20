import { test, expect } from './fixtures';

const mockTeachers = [
    { id: 1, firstName: 'Alice', lastName: 'Smith' },
    { id: 2, firstName: 'Bob', lastName: 'Jones' },
];

const mockSession = {
    id: 1,
    name: 'Morning Vinyasa',
    date: '2026-12-01T10:00:00.000Z',
    description: 'Wake up flow',
    teacher: { id: 1, firstName: 'Alice', lastName: 'Smith' },
    users: [],
};

test.describe('Admin Session E2E Flows', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('token', 'fake-admin-token');
            localStorage.setItem(
                'user',
                JSON.stringify({
                    id: 1,
                    email: 'admin@studio.com',
                    firstName: 'Admin',
                    lastName: 'User',
                    admin: true,
                })
            );
        });

        await page.route('**/api/session', async (route) => {
            if (route.request().method() === 'GET') {
                await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([mockSession]) });
            } else if (route.request().method() === 'POST') {
                await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ...mockSession, id: 2, name: 'Evening Yin' }) });
            }
        });

        await page.route('**/api/teacher', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockTeachers) });
        });

        await page.route('**/api/session/1', async (route) => {
            if (route.request().method() === 'GET') {
                await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockSession) });
            } else if (route.request().method() === 'PUT') {
                await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...mockSession, name: 'Updated Vinyasa' }) });
            } else if (route.request().method() === 'DELETE') {
                await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
            }
        });
    });

    test('Admin should be able to create a session', async ({ page }) => {
        await page.goto('/sessions');
        await expect(page.getByText('Morning Vinyasa')).toBeVisible();
        await page.getByText(/create/i).first().click();

        await expect(page).toHaveURL('/sessions/create');
        await page.getByLabel(/session name/i).fill('Evening Yin');
        await page.getByLabel(/date/i).fill('2026-12-10');
        await page.getByLabel(/teacher/i).selectOption('1');
        await page.getByLabel(/description/i).fill('Relaxing evening stretch');
        await page.getByRole('button', { name: /create session/i }).click();

        await expect(page).toHaveURL('/sessions');
    });

    test('Admin should be able to edit a session', async ({ page }) => {
        await page.goto('/sessions/1');
        await page.getByRole('button', { name: /edit/i }).click();

        await expect(page).toHaveURL('/sessions/edit/1');
        await expect(page.getByLabel(/session name/i)).toHaveValue('Morning Vinyasa');
        await page.getByLabel(/session name/i).fill('Updated Vinyasa');
        await page.getByRole('button', { name: /update session/i }).click();

        await expect(page).toHaveURL('/sessions');
    });

    test('Admin should be able to delete a session', async ({ page }) => {
        await page.goto('/sessions/1');
        page.once('dialog', (dialog) => dialog.accept());
        await page.getByRole('button', { name: /delete/i }).click();

        await expect(page).toHaveURL('/sessions');
    });

    test('should handle empty sessions list and logout', async ({ page }) => {
        await page.route('**/api/session', (route) =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
        );
        await page.goto('/sessions');
        await page.getByRole('button', { name: /logout/i }).click();
        await expect(page).toHaveURL('/login');
    });

    test('should handle error when loading sessions', async ({ page }) => {
        await page.route('**/api/session', (route) =>
            route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Server error' }) })
        );
        await page.goto('/sessions');
        await expect(page.getByText(/error|failed/i)).toBeVisible();
    });

    test('should handle error when creating a session', async ({ page }) => {
        await page.route('**/api/session', (route) =>
            route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Create error' }) })
        );
        await page.goto('/sessions/create');
        await page.getByLabel(/session name/i).fill('Error Yoga');
        await page.getByLabel(/date/i).fill('2026-12-10');
        await page.getByLabel(/teacher/i).selectOption('1');
        await page.getByLabel(/description/i).fill('Test');
        await page.getByRole('button', { name: /create session/i }).click();
        await expect(page.getByText(/error|failed/i)).toBeVisible();
    });

    test('should handle error when loading session detail', async ({ page }) => {
        await page.route('**/api/session/1', (route) =>
            route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Error' }) })
        );
        await page.goto('/sessions/1');
        await expect(page.getByText(/error|failed|not found/i)).toBeVisible();
    });

    test('should handle error when loading profile', async ({ page }) => {
        await page.route('**/api/user/1', (route) =>
            route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Error' }) })
        );
        await page.goto('/profile');
        await expect(page.getByText(/error|failed/i)).toBeVisible();
    });
});

test('Standard user should be able to view details, join and leave a session', async ({ page }) => {
    let isParticipating = false;

    await page.addInitScript(() => {
        localStorage.setItem('token', 'fake-user-token');
        localStorage.setItem(
            'user',
            JSON.stringify({
                id: 2,
                email: 'user@studio.com',
                firstName: 'Standard',
                lastName: 'User',
                admin: false,
            })
        );
    });

    await page.route('**/api/session/1', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                ...mockSession,
                users: isParticipating ? [2] : [],
            }),
        });
    });

    await page.route('**/api/session/1/participate/2', async (route) => {
        if (route.request().method() === 'POST') {
            isParticipating = true;
            await route.fulfill({ status: 200, body: JSON.stringify({}) });
        } else if (route.request().method() === 'DELETE') {
            isParticipating = false;
            await route.fulfill({ status: 200, body: JSON.stringify({}) });
        }
    });

    await page.goto('/sessions/1');
    await expect(page.getByRole('heading', { name: 'Morning Vinyasa' })).toBeVisible();

    // Inscription à la session
    await page.getByRole('button', { name: /join session/i }).click();
    await expect(page.getByRole('button', { name: /leave session/i })).toBeVisible();

    // Désinscription de la session
    await page.getByRole('button', { name: /leave session/i }).click();
    await expect(page.getByRole('button', { name: /join session/i })).toBeVisible();
});