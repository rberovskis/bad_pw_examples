import { test, expect } from '@playwright/test';

test('should display search results and allow the user to open a product detail page', async ({ page }) => {
  await page.route('**/api/search*', async (route) => {
    await route.fulfill({
      json: {
        results: [
          { id: 101, title: 'Wireless Headphones', price: 79.99 },
          { id: 102, title: 'Bluetooth Speaker', price: 49.99 },
        ],
      },
    });
  });

  await page.goto('/search');
  await page.getByRole('searchbox').fill('wireless');

  const [searchResponse] = await Promise.all([
    page.waitForResponse('**/api/search*'),
    page.getByRole('button', { name: 'Search' }).click(),
  ]);

  expect(searchResponse.status()).toBe(200);

  const cards = page.locator('[data-testid="product-card"]');
  await expect(cards).toHaveCount(2);

  await cards.first().click();

  await page.waitForURL('**/products/**');

  await expect(page.getByRole('heading', { name: 'Wireless Headphones' })).toBeVisible();
  await expect(page.getByTestId('product-price')).toHaveText('$79.99');
});
