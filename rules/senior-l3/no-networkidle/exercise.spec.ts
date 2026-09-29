import { test, expect } from '@playwright/test';

// Navigates to a product category and asserts the listing renders completely.
// networkidle ensures all product images and price data have finished loading
// before we count the cards.
test('should display 12 product cards after navigating to the Electronics category', async ({ page }) => {
  await page.goto('/shop');

  await page.getByRole('link', { name: 'Electronics' }).click();

  await page.waitForLoadState('networkidle');

  const productCards = page.locator('[data-testid="product-card"]');
  await expect(productCards).toHaveCount(12);
});
