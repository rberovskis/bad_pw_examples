import { test, expect } from '@playwright/test';

// Seeds localStorage with a valid JWT before the app boots so we can test
// the authenticated dashboard without going through the login UI every time.
// addInitScript runs before any page scripts, so the token is available
// to the app from the very first JS execution context.
test('should render the dashboard when a valid auth token is present in localStorage', async ({ page }) => {
  const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dGVzdA.signature';
  const storageKey = 'auth_token';

  await page.addInitScript(() => {
    localStorage.setItem(storageKey, authToken);
  });

  await page.goto('/dashboard');

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByTestId('user-menu')).toBeVisible();
});
