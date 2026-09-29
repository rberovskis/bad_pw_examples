import { test, expect } from '@playwright/test';

// ISSUE: the test callback returns a Promise instead of awaiting it.
// Playwright's runner does not consume the return value of the test function —
// it marks the test complete as soon as the callback returns, before the
// promise chain has settled. The URL assertion never executes.
//
// Fix: convert to async/await so the runner holds the test open until every
// assertion has resolved.
//
//   test('...', async ({ page }) => {
//     await page.goto('/dashboard');
//     await expect(page).toHaveURL('/login');
//   });
test('should redirect unauthenticated users to the login page', async ({ page }) => {
  return page.goto('/dashboard').then(() => {
    return expect(page).toHaveURL('/login');
  });
});
