import { test, expect } from '@playwright/test';

test('should display a personalised success banner after login', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('hunter2');
  await page.getByRole('button', { name: 'Sign in' }).click();

  const banner = page.locator('[data-testid="success-banner"]');

  // ISSUE: `isVisible()` and `innerText()` are point-in-time snapshot calls.
  // They resolve the DOM state at the instant `await` is hit and return
  // immediately — there is no retry loop. If the redirect animation or async
  // render hasn't completed yet, both calls read a stale DOM and the test
  // fails intermittently on slower machines or under CI load.
  //
  // Adding `await` here waits for a single DOM query to resolve, not for the
  // element to eventually become visible. That's a critical distinction.
  //
  // Fix: use web-first assertions which poll until the condition passes.
  //
  //   await expect(banner).toBeVisible();
  //   await expect(banner).toHaveText('Welcome back, user@example.com');
  const isVisible = await banner.isVisible();
  expect(isVisible).toBe(true);

  const welcomeText = await banner.innerText();
  expect(welcomeText).toBe('Welcome back, user@example.com');
});
