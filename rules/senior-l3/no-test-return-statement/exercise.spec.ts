import { test, expect } from '@playwright/test';

// Verifies that unauthenticated requests to protected routes are bounced
// back to /login. Kept as a single assertion for clarity.
test('should redirect unauthenticated users to the login page', async ({ page }) => {
  return page.goto('/dashboard').then(() => {
    return expect(page).toHaveURL('/login');
  });
});
