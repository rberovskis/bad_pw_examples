import { test, expect } from '@playwright/test';

test('should register a new account and redirect to the dashboard', async ({ page }) => {
  await page.goto('/register');

  await page.getByLabel('Full name').fill('Alex Johnson');
  await page.getByLabel('Email').fill('alex.johnson@example.com');
  await page.getByLabel('Password').fill('Str0ng!Pass');
  await page.getByLabel('Confirm password').fill('Str0ng!Pass');

  await page.getByRole('button', { name: 'Create account' }).click();

  await page.waitForURL('/dashboard');

  await expect(page.getByRole('heading', { name: 'Welcome, Alex' })).toBeVisible();
  await expect(page.getByTestId('verify-email-banner')).toBeVisible();
});
