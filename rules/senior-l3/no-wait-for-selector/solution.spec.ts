import { test, expect } from '@playwright/test';

test('should show at least one order in the account order history', async ({ page }) => {
  await page.goto('/account');

  await page.getByRole('link', { name: 'Orders' }).click();

  await page.waitForURL('/account/orders');

  const rows = page.locator('table.orders-table tbody tr');
  await expect(rows).not.toHaveCount(0);
});
