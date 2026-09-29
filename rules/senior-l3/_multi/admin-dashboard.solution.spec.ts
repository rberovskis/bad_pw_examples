import { test, expect } from '@playwright/test';

test('should load the admin dashboard and display correct summary statistics', async ({ page }) => {
  const sessionToken = 'tok_admin_9f4a2c1e';
  const tokenKey = 'session_token';

  await page.addInitScript(
    ([key, token]) => {
      localStorage.setItem(key, token);
    },
    [tokenKey, sessionToken],
  );

  await page.goto('/admin');

  await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();

  await expect.soft(page.getByTestId('stat-total-users')).toHaveText('12,480');
  await expect.soft(page.getByTestId('stat-active-subscriptions')).toHaveText('8,921');
  await expect.soft(page.getByTestId('stat-monthly-revenue')).toHaveText('$284,000');
  await expect.soft(page.getByTestId('stat-churn-rate')).toHaveText('1.8%');
});
