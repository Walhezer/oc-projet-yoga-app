import { test, expect } from './fixtures';

test.describe('Profile & Navbar E2E Flows', () => {
    test('should display user profile info and allow account deletion', async ({ page }) => {
        await page.route('**/api/user/2', async (route) => {
            if (route.request().method() === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        id: 2,
                        email: 'claire@studio.com',
                        firstName: 'Claire',
                        lastName: 'Martin',
                        admin: false,
                        createdAt: '2026-01-15T10:00:00.000Z',
                    }),
                });
            } else if (route.request().method() === 'DELETE') {
                await route.fulfill({ status: 200, body: JSON.stringify({}) });
            }
        });

        await page.goto('/login');
        await page.evaluate(() => {
            localStorage.setItem('token', 'fake-user-token');
            localStorage.setItem(
                'user',
                JSON.stringify({
                    id: 2,
                    email: 'claire@studio.com',
                    firstName: 'Claire',
                    lastName: 'Martin',
                    admin: false,
                })
            );
        });

        await page.goto('/profile');

        await expect(page.getByRole('heading', { name: /my profile/i })).toBeVisible();
        await expect(page.getByText('Claire', { exact: true })).toBeVisible();
        await expect(page.getByText('Martin', { exact: true })).toBeVisible();
        await expect(page.getByText('claire@studio.com')).toBeVisible();

        page.once('dialog', (dialog) => dialog.accept());
        await page.getByRole('button', { name: /delete account/i }).click();

        await expect(page).toHaveURL('/login');
    });
});