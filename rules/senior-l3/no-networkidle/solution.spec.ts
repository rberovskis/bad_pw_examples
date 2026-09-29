import { test, expect } from '@playwright/test';

test('should display 12 product cards after navigating to the Electronics category', async ({ page }) => {
  await page.goto('/shop');

  const productsResponse = page.waitForResponse(
    (res) => res.url().includes('/api/products') && res.status() === 200,
  );

  await page.getByRole('link', { name: 'Electronics' }).click();
  await productsResponse;

  await expect(page.locator('[data-testid="product-card"]')).toHaveCount(12);
});
