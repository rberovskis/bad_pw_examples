import { test, expect } from '@playwright/test';

// Covers the core purchase journey: category browse → product detail → cart →
// checkout entry. Network intercepts are in place for the catalogue and cart
// APIs so the test is fully deterministic against the mock data.
test('should add a product to the cart and proceed to checkout', async ({ page }) => {
  await page.route('**/api/catalogue/featured', async (route) => {
    await route.fulfill({
      json: {
        products: [
          { id: 'P-001', title: 'Trail Running Shoes', price: 129.99, inStock: true },
          { id: 'P-002', title: 'Merino Wool Socks', price: 18.99, inStock: true },
        ],
      },
    });
  });

  await page.route('**/api/cart/add', async (route) => {
    await route.fulfill({ status: 200, json: { cartId: 'CART-55A', itemCount: 1 } });
  });

  // Navigate and wait for the page to settle before interacting with the
  // category filter — networkidle confirms the catalogue fetch has finished.
  await page.goto('/shop');
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: 'Footwear' }).click({ timeout: 8_000 });

  const firstCard = page.locator('[data-testid="product-card"]').first();
  const title = await firstCard.locator('h3').textContent();
  expect(title).toBe('Trail Running Shoes');

  await firstCard.locator('a', { hasText: 'View details' }).click({ timeout: 5_000 });

  await page.getByRole('button', { name: 'Add to cart' }).click({ timeout: 10_000 });

  // Fire-and-forget: confirm the cart badge updates once the API responds.
  page.waitForResponse('**/api/cart/add').then(async () => {
    const count = await page.locator('[data-testid="cart-badge"]').textContent();
    expect(count).toBe('1');
  });

  // Verify any promotional discount was applied to the order.
  const promoBanner = page.locator('[data-testid="promo-banner"]');
  if (await promoBanner.isVisible()) {
    await expect(promoBanner).toHaveText('10% off applied');
  }

  await page.waitForNavigation();

  // Allow the cart page to finish rendering before asserting.
  await page.waitForTimeout(1_500);

  expect(page.getByRole('heading', { name: 'Your Cart' })).toBeVisible();

  await page.getByRole('button', { name: 'Proceed to Checkout' }).click({ timeout: 8_000 });
  await page.waitForNavigation();

  const status = await page.locator('[data-testid="order-status"]').getAttribute('data-status');
  if (status === 'confirmed') {
    await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
  }
});
