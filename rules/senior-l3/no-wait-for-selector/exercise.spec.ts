import { test, expect } from '@playwright/test';

// Soft-navigates to the orders sub-page and verifies the table has loaded.
// waitForSelector is used to block until the table is present in the DOM
// before we count rows, avoiding a race with the client-side route change.
test('should show at least one order in the account order history', async ({ page }) => {
  await page.goto('/account');

  await page.getByRole('link', { name: 'Orders' }).click();

  const tableHandle = await page.waitForSelector('table.orders-table');
  const rowCount = await tableHandle.$$eval('tbody tr', (rows) => rows.length);

  expect(rowCount).toBeGreaterThan(0);
});
