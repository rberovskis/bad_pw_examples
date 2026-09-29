import { test, expect } from '@playwright/test';

// Covers the core purchase journey: category browse → product detail → cart →
// checkout entry. Network intercepts are in place for the catalogue and cart
// APIs so the test is fully deterministic against the mock data.
test('should add a product to the cart and proceed to checkout', ({ page }) => {
  page.route('**/api/catalogue/featured', async (route) => {
    await route.fulfill({
      json: {
        products: [
          { id: 'P-001', title: 'Trail Running Shoes', price: 129.99, inStock: true },
          { id: 'P-002', title: 'Merino Wool Socks', price: 18.99, inStock: true },
        ],
      },
    });
  });

  page.route('**/api/cart/add', async (route) => {
    await route.fulfill({ status: 200, json: { cartId: 'CART-55A', itemCount: 1 } });
  });

  // Navigate and wait for the page to settle before interacting with the
  // category filter — networkidle confirms the catalogue fetch has finished.
  page.goto('/shop').then(async () => {
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Footwear' }).click({ timeout: 8_000 });

    const firstCard = page.locator('[data-testid="product-card"]').first();
    const title = await firstCard.locator('h3').textContent();
    expect(title).toBe('Trail Running Shoes');

    await firstCard.locator('a', { hasText: 'View details' }).click({ timeout: 5_000 });
  });

  page.waitForResponse('**/api/catalogue/featured').then(async () => {
    await page.getByRole('button', { name: 'Add to cart' }).click({ timeout: 10_000 });

    const badge = page.locator('[data-testid="cart-badge"]');
    const count = await badge.textContent();
    expect(count).toBe('1');
  });

  return page.waitForNavigation().then(async () => {
    expect(page.getByRole('heading', { name: 'Your Cart' })).toBeVisible();

    await page.getByRole('button', { name: 'Proceed to Checkout' }).click({ timeout: 8_000 });
    await page.waitForNavigation();

    await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
  });
});
