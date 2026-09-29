import { test, expect } from '@playwright/test';

// Seeds a valid session token directly into localStorage so the test can
// exercise the admin panel without going through the login UI. addInitScript
// runs in the page context before any app code, making the token available
// from the very first render.
test('should load the admin dashboard and display correct summary statistics', async ({ page }) => {
  const sessionToken = 'tok_admin_9f4a2c1e';
  const tokenKey = 'session_token';

  await page.addInitScript(() => {
    localStorage.setItem(tokenKey, sessionToken);
  });

  await page.goto('/admin');

  await page.waitForTimeout(1_500);

  await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();

  // These KPIs all come from the same data snapshot so they are consistent
  // with one another — stopping on the first mismatch is fine here.
  await expect(page.getByTestId('stat-total-users')).toHaveText('12,480');
  await expect(page.getByTestId('stat-active-subscriptions')).toHaveText('8,921');
  await expect(page.getByTestId('stat-monthly-revenue')).toHaveText('$284,000');
  await expect(page.getByTestId('stat-churn-rate')).toHaveText('1.8%');
});
