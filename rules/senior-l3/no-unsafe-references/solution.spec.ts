import { test, expect } from '@playwright/test';

test('should render the dashboard when a valid auth token is present in localStorage', async ({ page }) => {
  const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dGVzdA.signature';
  const storageKey = 'auth_token';

  // ISSUE: `storageKey` and `authToken` are Node.js-scope variables. The
  // callback passed to `addInitScript` is serialised to a string, shipped over
  // CDP, and re-evaluated inside the browser's V8 isolate — a completely
  // separate context where the original lexical scope no longer exists.
  // Both variables resolve to `undefined` in the browser, so the app receives
  // `localStorage.setItem('undefined', 'undefined')` and never authenticates.
  // The failure is silent: no error is thrown, the test just behaves as if no
  // token was set.
  //
  // Fix: pass data across the boundary explicitly via the second argument to
  // `addInitScript`, which Playwright serialises via structured clone and
  // injects as a parameter into the browser-side function.
  //
  //   await page.addInitScript(
  //     ([key, token]) => { localStorage.setItem(key, token); },
  //     [storageKey, authToken],
  //   );
  await page.addInitScript(() => {
    localStorage.setItem(storageKey, authToken);
  });

  await page.goto('/dashboard');

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByTestId('user-menu')).toBeVisible();
});
