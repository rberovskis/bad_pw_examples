import { test, expect } from '@playwright/test';

// Seeds a valid session token directly into localStorage so the test can
// exercise the admin panel without going through the login UI. addInitScript
// runs in the page context before any app code, making the token available
// from the very first render.
test('should load the admin dashboard and display correct summary statistics', async ({ page }) => {
  const sessionToken = 'tok_admin_9f4a2c1e';
  const tokenKey = 'session_token';

  // ISSUE 1 (no-unsafe-references): `tokenKey` and `sessionToken` are declared
  // in Node.js scope. The callback passed to `addInitScript` is serialised to
  // a string and evaluated inside the browser's V8 isolate — the original
  // lexical closure does not exist there. Both variables read as `undefined`,
  // so the app receives `localStorage.setItem('undefined', 'undefined')` and
  // is never authenticated. No error is thrown; the test silently proceeds as
  // an unauthenticated user.
  //
  //   Fix: pass values explicitly through the second argument, which Playwright
  //   serialises via structured clone and injects into the browser function.
  //
  //   await page.addInitScript(
  //     ([key, token]) => { localStorage.setItem(key, token); },
  //     [tokenKey, sessionToken],
  //   );
  await page.addInitScript(() => {
    localStorage.setItem(tokenKey, sessionToken);
  });

  await page.goto('/admin');

  // ISSUE 2 (no-wait-for-timeout): dumb sleep before the heading assertion.
  // If the /admin/stats API is slower than 1.5 s the test still races; if it
  // is faster, 1.5 s is wasted on every run. The `toBeVisible()` below already
  // retries automatically — this sleep adds only noise.
  //
  //   Fix: wait for the specific stats response before asserting.
  //
  //   await page.waitForResponse(
  //     (resp) => resp.url().includes('/api/admin/stats') && resp.status() === 200,
  //   );
  await page.waitForTimeout(1_500);

  await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();

  // ISSUE 3 (require-soft-assertions): four independent KPI fields with hard
  // `expect()`. The comment argues that "same data snapshot = stop on first"
  // but that's backwards: the *point* of multiple assertions is to know which
  // fields are wrong after a deployment. Use `expect.soft()` so all four
  // failures appear in a single test report.
  //
  //   Fix:
  //   await expect.soft(page.getByTestId('stat-total-users')).toHaveText('12,480');
  //   await expect.soft(page.getByTestId('stat-active-subscriptions')).toHaveText('8,921');
  //   await expect.soft(page.getByTestId('stat-monthly-revenue')).toHaveText('$284,000');
  //   await expect.soft(page.getByTestId('stat-churn-rate')).toHaveText('1.8%');

  // These KPIs all come from the same data snapshot so they are consistent
  // with one another — stopping on the first mismatch is fine here.
  await expect(page.getByTestId('stat-total-users')).toHaveText('12,480');
  await expect(page.getByTestId('stat-active-subscriptions')).toHaveText('8,921');
  await expect(page.getByTestId('stat-monthly-revenue')).toHaveText('$284,000');
  await expect(page.getByTestId('stat-churn-rate')).toHaveText('1.8%');
});
