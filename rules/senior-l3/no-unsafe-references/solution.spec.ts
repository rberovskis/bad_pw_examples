import { test, expect } from '@playwright/test';

test('should render the dashboard when a valid auth token is present in localStorage', async ({ page }) => {
  const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dGVzdA.signature';
  const storageKey = 'auth_token';

  await page.addInitScript(
    ([key, token]) => {
      localStorage.setItem(key, token);
    },
    [storageKey, authToken],
  );

  await page.goto('/dashboard');

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByTestId('user-menu')).toBeVisible();
});
