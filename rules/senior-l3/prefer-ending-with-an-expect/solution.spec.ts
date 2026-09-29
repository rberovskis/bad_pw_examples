import { test, expect } from '@playwright/test';

test('should render product results after a search query', async ({ page }) => {
  await page.route('/api/search*', async (route) => {
    await route.fulfill({
      json: { results: [{ id: 1, title: 'Widget' }, { id: 2, title: 'Gadget' }] },
    });
  });

  await page.goto('/search');

  await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible();

  await page.getByRole('searchbox').fill('widget');

  // ISSUE: the test ends on `.click()`. The `expect` earlier in the body only
  // verifies the heading — an intermediate state before the search fires. There
  // is no assertion that the mocked results actually rendered.
  //
  // Playwright's auto-waiting proves the button was clickable, not that the
  // click produced the correct outcome. A broken search handler would not be
  // caught here.
  //
  // Fix: add an assertion after the click that verifies the search results.
  //
  //   await page.getByRole('button', { name: 'Search' }).click();
  //   await expect(page.locator('[data-testid="result-item"]')).toHaveCount(2);
  await page.getByRole('button', { name: 'Search' }).click();
});
