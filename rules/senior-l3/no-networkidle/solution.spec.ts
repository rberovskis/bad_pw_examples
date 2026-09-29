import { test, expect } from '@playwright/test';

test('should display 12 product cards after navigating to the Electronics category', async ({ page }) => {
  await page.goto('/shop');

  await page.getByRole('link', { name: 'Electronics' }).click();

  // ISSUE: `waitForLoadState('networkidle')` is a 500 ms / 0-request heuristic
  // with no knowledge of application state. Background analytics beacons,
  // WebSocket keep-alives, or inventory-check polls can prevent it from ever
  // settling. On slow CI runners the quiet window may never arrive within the
  // test timeout, making this a common source of flakiness in SPA test suites.
  //
  // Fix: wait for the specific API response that populates the product list.
  // Register the waiter before the click so the response is never missed.
  //
  //   const productsResponse = page.waitForResponse(
  //     (res) => res.url().includes('/api/products') && res.status() === 200,
  //   );
  //   await page.getByRole('link', { name: 'Electronics' }).click();
  //   await productsResponse;
  await page.waitForLoadState('networkidle');

  const productCards = page.locator('[data-testid="product-card"]');
  await expect(productCards).toHaveCount(12);
});
