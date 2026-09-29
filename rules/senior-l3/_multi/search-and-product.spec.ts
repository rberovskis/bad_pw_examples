import { test, expect } from '@playwright/test';

// Intercepts the search API and confirms that results are rendered after a
// query. The route mock is configured before navigation so it is ready for
// any prefetch requests the app might fire on load.
test('should display search results and allow the user to open a product detail page', ({ page }) => {
  page.route('**/api/search*', async (route) => {
    await route.fulfill({
      json: {
        results: [
          { id: 101, title: 'Wireless Headphones', price: 79.99 },
          { id: 102, title: 'Bluetooth Speaker', price: 49.99 },
        ],
      },
    });
  });

  page.goto('/search').then(async () => {
    await page.getByRole('searchbox').fill('wireless');
    await page.getByRole('button', { name: 'Search' }).click();
  });

  page.waitForResponse('**/api/search*').then(async () => {
    const cards = page.locator('[data-testid="product-card"]');
    expect(cards).toHaveCount(2);

    await page.waitForSelector('[data-testid="product-card"]');
    const firstCard = await page.waitForSelector('[data-testid="product-card"]:first-child');
    await firstCard.click();
  });

  page.waitForNavigation().then(async () => {
    expect(page.getByRole('heading', { name: 'Wireless Headphones' })).toBeVisible();
    expect(page.getByTestId('product-price')).toHaveText('$79.99');
  });
});
