import { test, expect } from '@playwright/test';

// Intercepts the search API and confirms that results are rendered after a
// query. The route mock is configured before navigation so it is ready for
// any prefetch requests the app might fire on load.
test('should display search results and allow the user to open a product detail page', ({ page }) => {
  // ISSUE 1 (valid-expect-in-promise): the test callback is not async and
  // none of the three .then() chains are awaited or returned. The runner
  // marks the test complete the moment the synchronous body finishes — before
  // any microtask executes. Every assertion below is silently discarded.
  //
  //   Fix: make the function async and await each step in sequence.
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

    // ISSUE 2 (missing-playwright-await): `expect(cards).toHaveCount(2)` is not
    // awaited. `toHaveCount` returns a Promise; without await the retry loop
    // never runs and the assertion always passes regardless of actual count.
    //
    //   Fix: await expect(cards).toHaveCount(2);
    expect(cards).toHaveCount(2);

    // ISSUE 3 (no-wait-for-selector): `waitForSelector` returns a stale
    // `ElementHandle`. If the framework re-renders the card list between the
    // selector resolving and the subsequent .click() call, the handle is
    // detached and throws. Locators re-query the live DOM on every retry.
    //
    //   Fix:
    //   await page.locator('[data-testid="product-card"]').first().click();
    await page.waitForSelector('[data-testid="product-card"]');
    const firstCard = await page.waitForSelector('[data-testid="product-card"]:first-child');
    await firstCard.click();
  });

  // ISSUE 4 (no-wait-for-navigation): `waitForNavigation()` is chained here
  // but the click that triggers the navigation happened inside the previous
  // .then() — which itself is a floating, unawaited promise. This chain never
  // executes in a meaningful order and the navigation may have committed long
  // before this code runs (or the .then() may not have run at all).
  //
  //   Fix (in the fully-corrected async version): await page.waitForURL(...)
  //   immediately after the first-card click, or use waitForURL inside the
  //   same sequential await chain.
  page.waitForNavigation().then(async () => {
    expect(page.getByRole('heading', { name: 'Wireless Headphones' })).toBeVisible();
    expect(page.getByTestId('product-price')).toHaveText('$79.99');
  });
});
