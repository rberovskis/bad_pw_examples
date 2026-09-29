import { test, expect } from '@playwright/test';

// Verifies the full user registration journey: form fill → email verification
// prompt → dashboard redirect. networkidle after the submit click ensures the
// server-side registration request has completed before we check the outcome.
test('should register a new account and redirect to the dashboard', async ({ page }) => {
  await page.goto('/register');

  await page.getByLabel('Full name').fill('Alex Johnson');
  await page.getByLabel('Email').fill('alex.johnson@example.com');
  await page.getByLabel('Password').fill('Str0ng!Pass');
  await page.getByLabel('Confirm password').fill('Str0ng!Pass');

  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForLoadState('networkidle');

  await page.waitForNavigation();

  return page.waitForURL('/dashboard').then(async () => {
    await expect(page.getByRole('heading', { name: 'Welcome, Alex' })).toBeVisible();
    await expect(page.getByTestId('verify-email-banner')).toBeVisible();
  });
});
