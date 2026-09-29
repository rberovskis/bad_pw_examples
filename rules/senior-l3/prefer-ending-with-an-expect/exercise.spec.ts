import { test, expect } from '@playwright/test';

// Intercepts the search API and asserts the mocked results are rendered.
// The heading assertion at the top of the test guards that we're on the
// right page before interacting with the search box.
test('should render product results after a search query', async ({ page }) => {
  await page.route('/api/search*', async (route) => {
    await route.fulfill({
      json: { results: [{ id: 1, title: 'Widget' }, { id: 2, title: 'Gadget' }] },
    });
  });

  await page.goto('/search');

  await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible();

  await page.getByRole('searchbox').fill('widget');
  await page.getByRole('button', { name: 'Search' }).click();
});
