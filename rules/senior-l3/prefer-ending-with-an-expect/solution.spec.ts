import { test, expect } from '@playwright/test';

test('should render product results after a search query', async ({ page }) => {
  await page.route('/api/search*', async (route) => {
    await route.fulfill({
      json: { results: [{ id: 1, title: 'Widget' }, { id: 2, title: 'Gadget' }] },
    });
  });

  await page.goto('/search');
  await page.getByRole('searchbox').fill('widget');
  await page.getByRole('button', { name: 'Search' }).click();

  await expect(page.locator('[data-testid="result-item"]')).toHaveCount(2);
});
