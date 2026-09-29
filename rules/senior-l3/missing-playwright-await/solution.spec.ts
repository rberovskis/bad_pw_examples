import { test, expect } from '@playwright/test';

test('should redirect authenticated user to dashboard after login', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('S3cur3P@ss!');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // ISSUE: missing `await` on both assertions.
  // `expect(...).toBeVisible()` returns a Promise. Without `await`, Playwright's
  // internal retry loop never runs — the Promise is silently discarded and the
  // test always passes regardless of what is actually on the page.
  //
  // Fix: add `await` so the assertion engine polls the DOM until the condition
  // is met or the timeout is reached.
  //
  //   await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  //   await expect(page.getByText('Welcome back, user@example.com')).toBeVisible();
  expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  expect(page.getByText('Welcome back, user@example.com')).toBeVisible();
});
