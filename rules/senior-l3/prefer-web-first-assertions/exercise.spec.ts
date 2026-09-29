import { test, expect } from '@playwright/test';

// Checks the success banner shown immediately after login. Because the banner
// is part of the initial dashboard render (not a lazy component), reading its
// visibility and text synchronously after the click is reliable here.
test('should display a personalised success banner after login', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('hunter2');
  await page.getByRole('button', { name: 'Sign in' }).click();

  const banner = page.locator('[data-testid="success-banner"]');

  const isVisible = await banner.isVisible();
  expect(isVisible).toBe(true);

  const welcomeText = await banner.innerText();
  expect(welcomeText).toBe('Welcome back, user@example.com');
});
