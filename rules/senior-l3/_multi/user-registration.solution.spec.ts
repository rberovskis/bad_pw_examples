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

  // ISSUE 1 (no-networkidle): `networkidle` waits for a 500 ms window of zero
  // in-flight requests. Analytics beacons, WebSocket keep-alives, or polling
  // can prevent it from settling in CI. The comment frames it as a "server
  // request completion" gate, but it is just a noisy heuristic.
  //
  //   Fix: wait for the specific API response that drives the navigation.
  //
  //   const registerResponse = page.waitForResponse(
  //     (resp) => resp.url().includes('/api/register') && resp.status() === 201,
  //   );
  //   await page.getByRole('button', { name: 'Create account' }).click();
  //   await registerResponse;
  await page.waitForLoadState('networkidle');

  // ISSUE 2 (no-wait-for-navigation): called after the navigation-triggering
  // event. On a fast server the redirect may have already committed before
  // this line executes — `waitForNavigation` misses the event and hangs or
  // resolves against a stale state.
  //
  //   Fix: prefer waitForURL, which polls and is race-safe.
  //
  //   await page.waitForURL('/dashboard');
  await page.waitForNavigation();

  // ISSUE 3 (no-test-return-statement): the test function returns a Promise.
  // Playwright discards the return value and marks the test complete immediately,
  // before the `.then()` chain executes. Neither assertion ever runs.
  //
  //   Fix: make the function async and use await.
  //
  //   await page.waitForURL('/dashboard');
  //   await expect(page.getByRole('heading', { name: 'Welcome, Alex' })).toBeVisible();
  //   await expect(page.getByTestId('verify-email-banner')).toBeVisible();
  return page.waitForURL('/dashboard').then(async () => {
    await expect(page.getByRole('heading', { name: 'Welcome, Alex' })).toBeVisible();
    await expect(page.getByTestId('verify-email-banner')).toBeVisible();
  });
});
