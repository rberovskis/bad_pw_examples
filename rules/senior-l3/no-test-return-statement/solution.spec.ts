import { test, expect } from '@playwright/test';

test('should redirect unauthenticated users to the login page', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL('/login');
});
