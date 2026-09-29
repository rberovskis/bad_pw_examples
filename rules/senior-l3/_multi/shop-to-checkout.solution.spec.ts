import { test, expect } from '@playwright/test';

// Covers the core purchase journey: category browse → product detail → cart →
// checkout entry. Network intercepts are in place for the catalogue and cart
// APIs so the test is fully deterministic against the mock data.
test('should add a product to the cart and proceed to checkout', ({ page }) => {
  // ISSUE 1 (valid-expect-in-promise): the test callback is not async and
  // none of the three .then() chains are awaited or returned from the top
  // level. The runner marks the test complete the instant the synchronous
  // body exits — before any microtask fires. Every interaction and assertion
  // inside the chains is silently discarded.
  //
  //   Fix: make the callback async and use await throughout.
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
    // ISSUE 2 (no-networkidle): `networkidle` waits for a 500 ms window with
    // zero in-flight requests — it has no knowledge of app state. A single
    // analytics beacon or WebSocket keep-alive resets the counter. The comment
    // frames it as a reliable "catalogue fetch completed" gate, but it is a
    // timing heuristic that frequently causes flakiness in CI.
    //
    //   Fix: register a waitForResponse promise before the navigation, then
    //   await it after — that resolves as soon as the specific response lands.
    //
    //   const catalogueReady = page.waitForResponse('**/api/catalogue/featured');
    //   await page.goto('/shop');
    //   await catalogueReady;
    await page.waitForLoadState('networkidle');

    // ISSUE 3 (no-action-timeout): per-call { timeout } overrides fragment the
    // budget and signal that slow interactions are expected rather than
    // investigated. A single `actionTimeout` in playwright.config.ts applies
    // everywhere and makes the intent explicit.
    //
    //   Fix: remove all { timeout: N } options from individual calls.
    await page.getByRole('button', { name: 'Footwear' }).click({ timeout: 8_000 });

    const firstCard = page.locator('[data-testid="product-card"]').first();

    // ISSUE 4 (prefer-web-first-assertions): `textContent()` is a point-in-time
    // DOM snapshot — it fires a single query and returns immediately with no
    // retry. If the card hasn't rendered yet when this line executes, `title`
    // is null or stale and the assertion fails transiently.
    //
    //   Fix: use a web-first assertion that polls until the condition is met.
    //
    //   await expect(firstCard.locator('h3')).toHaveText('Trail Running Shoes');
    const title = await firstCard.locator('h3').textContent();
    expect(title).toBe('Trail Running Shoes');

    await firstCard.locator('a', { hasText: 'View details' }).click({ timeout: 5_000 }); // ISSUE 3 continued
  });

  page.waitForResponse('**/api/catalogue/featured').then(async () => {
    await page.getByRole('button', { name: 'Add to cart' }).click({ timeout: 10_000 }); // ISSUE 3 continued

    const badge = page.locator('[data-testid="cart-badge"]');

    // ISSUE 5 (missing-playwright-await + prefer-web-first-assertions):
    // `textContent()` has the same point-in-time problem as above — it doesn't
    // wait for the badge to update after the cart API response. The `expect`
    // that follows is also missing `await`, so its retry loop never runs.
    //
    //   Fix:
    //   await expect(badge).toHaveText('1');
    const count = await badge.textContent();
    expect(count).toBe('1');
  });

  // ISSUE 6 (no-wait-for-navigation): `waitForNavigation()` is called after
  // the click that triggers the navigation has already been issued (inside the
  // previous .then()). On a fast server the navigation may have committed
  // before this line is reached — the event is missed and the call either
  // hangs or resolves against stale page state.
  //
  //   Fix: prefer waitForURL, which polls the current URL and is always
  //   race-safe regardless of when navigation completed.
  //
  //   await page.waitForURL('/cart');
  //
  // And the expect on the heading is also missing await — see ISSUE 5 note.
  //
  //   await expect(page.getByRole('heading', { name: 'Your Cart' })).toBeVisible();
  return page.waitForNavigation().then(async () => {
    // ISSUE 5 (missing-playwright-await): `expect(...).toBeVisible()` without
    // await discards the assertion Promise. The heading check always "passes".
    expect(page.getByRole('heading', { name: 'Your Cart' })).toBeVisible();

    await page.getByRole('button', { name: 'Proceed to Checkout' }).click({ timeout: 8_000 }); // ISSUE 3 continued

    // ISSUE 6 continued: second waitForNavigation, same race as above.
    await page.waitForNavigation();

    await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
  });

  // ISSUE 7 (no-test-return-statement): the test function is not async and
  // returns the Promise from the last .then() chain. Playwright ignores the
  // return value — the test is marked complete before the promise settles.
  // Combined with ISSUE 1 (all three chains floating), zero code in this test
  // body is guaranteed to execute.
  //
  //   Fix: make the test callback async and replace all .then() chains with
  //   sequential await calls:
  //
  //   test('...', async ({ page }) => {
  //     await page.route(...);
  //     await page.route(...);
  //
  //     const catalogueReady = page.waitForResponse('**/api/catalogue/featured');
  //     await page.goto('/shop');
  //     await catalogueReady;
  //
  //     await page.getByRole('button', { name: 'Footwear' }).click();
  //     await expect(
  //       page.locator('[data-testid="product-card"]').first().locator('h3')
  //     ).toHaveText('Trail Running Shoes');
  //     await page.locator('[data-testid="product-card"]').first()
  //       .locator('a', { hasText: 'View details' }).click();
  //
  //     await page.getByRole('button', { name: 'Add to cart' }).click();
  //     await expect(page.locator('[data-testid="cart-badge"]')).toHaveText('1');
  //
  //     await page.waitForURL('/cart');
  //     await expect(page.getByRole('heading', { name: 'Your Cart' })).toBeVisible();
  //
  //     await page.getByRole('button', { name: 'Proceed to Checkout' }).click();
  //     await page.waitForURL('/checkout');
  //     await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
  //   });
});
