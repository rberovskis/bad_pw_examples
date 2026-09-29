import { test, expect } from '@playwright/test';

test('should display a personalised success banner after login', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('hunter2');
  await page.getByRole('button', { name: 'Sign in' }).click();

  const banner = page.locator('[data-testid="success-banner"]');
  await expect(banner).toBeVisible();
  await expect(banner).toHaveText('Welcome back, user@example.com');
});
