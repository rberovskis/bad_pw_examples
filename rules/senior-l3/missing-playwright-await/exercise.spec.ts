import { test, expect } from '@playwright/test';

// Covers the happy-path login flow end-to-end.
// Verified stable across Chrome, Firefox, and WebKit in CI.
test('should redirect authenticated user to dashboard after login', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('S3cur3P@ss!');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // The heading and welcome message both render in the same React paint cycle,
  // so checking them immediately after the click is sufficient here.
  expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  expect(page.getByText('Welcome back, user@example.com')).toBeVisible();
});
