import { test, expect } from './fixtures';

test.describe('Authentication E2E Flows', () => {
  test('should display error on invalid login credentials', async ({ page }) => {
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid credentials' }),
      });
    });

    await page.goto('/login');

    await page.getByLabel(/email/i).fill('wrong@test.com');
    await page.getByLabel(/password/i).fill('wrongpass');
    await page.getByRole('button', { name: /login|sign in/i }).click();

    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });

  test('should login successfully and redirect to sessions', async ({ page }) => {
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'fake-jwt-token',
          id: 1,
          email: 'yoga@studio.com',
          firstName: 'Admin',
          lastName: 'User',
          admin: true,
        }),
      });
    });

    await page.route('**/api/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            name: 'Morning Vinyasa',
            date: '2026-12-01T10:00:00.000Z',
            description: 'Wake up flow',
            teacher: { id: 1, firstName: 'Margot', lastName: 'Delahaye' },
            users: [],
          },
        ]),
      });
    });

    await page.goto('/login');

    await page.getByLabel(/email/i).fill('yoga@studio.com');
    await page.getByLabel(/password/i).fill('test!1234');
    await page.getByRole('button', { name: /login|sign in/i }).click();

    await expect(page).toHaveURL('/sessions');
    await expect(page.getByText('Morning Vinyasa')).toBeVisible();
  });

  test('should register a new user and redirect to sessions', async ({ page }) => {
    await page.route('**/api/auth/register', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'new-jwt-token',
          id: 2,
          email: 'new@studio.com',
          firstName: 'John',
          lastName: 'Doe',
          admin: false,
        }),
      });
    });

    await page.route('**/api/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/register');

    await page.getByLabel(/first name/i).fill('John');
    await page.getByLabel(/last name/i).fill('Doe');
    await page.getByLabel(/email/i).fill('new@studio.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /register|sign up/i }).click();

    await expect(page).toHaveURL('/sessions');
  });
});