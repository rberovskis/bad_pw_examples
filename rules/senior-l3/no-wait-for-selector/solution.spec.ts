import { test, expect } from '@playwright/test';

test('should show at least one order in the account order history', async ({ page }) => {
  await page.goto('/account');

  await page.getByRole('link', { name: 'Orders' }).click();

  // ISSUE: `waitForSelector` returns an `ElementHandle` — a point-in-time
  // snapshot of the DOM node. If the framework re-renders the table (e.g. a
  // sort, filter, or pagination event), the handle becomes detached and the
  // subsequent `$$eval` call throws a stale-element error.
  //
  // There is also a hidden race: `waitForSelector` resolves, then `$$eval`
  // opens a new round-trip to the browser — the element can detach in that gap.
  //
  // Fix: use `waitForURL` to gate on the route change, then assert with a
  // Locator which re-queries the live DOM on every retry automatically.
  //
  //   await page.waitForURL('/account/orders');
  //   await expect(page.locator('table.orders-table tbody tr')).not.toHaveCount(0);
  const tableHandle = await page.waitForSelector('table.orders-table');
  const rowCount = await tableHandle.$$eval('tbody tr', (rows) => rows.length);

  expect(rowCount).toBeGreaterThan(0);
});
