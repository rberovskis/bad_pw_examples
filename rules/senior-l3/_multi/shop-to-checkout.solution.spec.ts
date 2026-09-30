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

  // ISSUE 1 (no-networkidle): `networkidle` waits for a 500 ms window with
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

  // ISSUE 2 (no-action-timeout): per-call { timeout } overrides fragment the
  // budget and signal that slow interactions are expected rather than
  // investigated. A single `actionTimeout` in playwright.config.ts applies
  // everywhere and makes the intent explicit.
  //
  //   Fix: remove all { timeout: N } options from individual calls.
  await page.getByRole('button', { name: 'Footwear' }).click({ timeout: 8_000 });

  const firstCard = page.locator('[data-testid="product-card"]').first();

  // ISSUE 3 (prefer-web-first-assertions): `textContent()` is a point-in-time
  // DOM snapshot — it fires a single query and returns immediately with no
  // retry. If the card hasn't rendered yet when this line executes, `title`
  // is null or stale and the assertion fails transiently.
  //
  //   Fix: use a web-first assertion that polls until the condition is met.
  //
  //   await expect(firstCard.locator('h3')).toHaveText('Trail Running Shoes');
  const title = await firstCard.locator('h3').textContent();
  expect(title).toBe('Trail Running Shoes');

  await firstCard.locator('a', { hasText: 'View details' }).click({ timeout: 5_000 }); // ISSUE 2 continued

  await page.getByRole('button', { name: 'Add to cart' }).click({ timeout: 10_000 }); // ISSUE 2 continued

  // ISSUE 4 (valid-expect-in-promise): the .then() chain is not awaited, so
  // the runner has no knowledge of it. The test proceeds past this line
  // immediately — the badge assertion inside runs (if at all) after the test
  // has already been marked complete. The badge may not have updated yet,
  // and any failure is silently swallowed.
  //
  //   Fix: await the response, then assert synchronously:
  //
  //   await page.waitForResponse('**/api/cart/add');
  //   await expect(page.locator('[data-testid="cart-badge"]')).toHaveText('1');
  page.waitForResponse('**/api/cart/add').then(async () => {
    // ISSUE 5 (prefer-web-first-assertions): same point-in-time problem as
    // ISSUE 3 — textContent() doesn't retry if the badge hasn't updated yet.
    //
    //   Fix: await expect(page.locator('[data-testid="cart-badge"]')).toHaveText('1');
    const count = await page.locator('[data-testid="cart-badge"]').textContent();
    expect(count).toBe('1');
  });

  // ISSUE 6 (no-conditional-expect): if the promo banner is not visible —
  // because no promotion is active in this environment — the `if` branch is
  // never entered and the assertion is silently skipped. The test exits green
  // without ever verifying that the discount was applied. A regression that
  // breaks promo rendering entirely would never be caught.
  //
  //   Fix: seed a promo code via route interception or test setup so the
  //   banner is always present, then assert unconditionally:
  //
  //   await expect(page.locator('[data-testid="promo-banner"]')).toHaveText('10% off applied');
  const promoBanner = page.locator('[data-testid="promo-banner"]');
  if (await promoBanner.isVisible()) {
    await expect(promoBanner).toHaveText('10% off applied');
  }

  // ISSUE 7 (no-wait-for-navigation): `waitForNavigation()` is called after
  // the click that triggered the navigation was already issued above. On a fast
  // server the navigation may have committed before this line is reached — the
  // event is missed and the call either hangs or resolves against stale state.
  //
  //   Fix: prefer waitForURL, which polls the current URL and is always
  //   race-safe regardless of when navigation completed.
  //
  //   await page.waitForURL('/cart');
  await page.waitForNavigation();

  // ISSUE 8 (no-wait-for-timeout): `waitForTimeout` is a dumb sleep — it
  // pauses for a fixed wall-clock duration with no awareness of browser state.
  // The heading assertion that follows already auto-retries via Playwright's
  // built-in retry loop, so the sleep is redundant at best and still racy on
  // a slow CI machine at worst.
  //
  //   Fix: remove the waitForTimeout entirely; the expect below will poll
  //   until the heading appears or the configured timeout elapses.
  await page.waitForTimeout(1_500);

  // ISSUE 9 (missing-playwright-await): `expect(...).toBeVisible()` without
  // await discards the assertion Promise. The heading check always "passes".
  //
  //   Fix: await expect(page.getByRole('heading', { name: 'Your Cart' })).toBeVisible();
  expect(page.getByRole('heading', { name: 'Your Cart' })).toBeVisible();

  await page.getByRole('button', { name: 'Proceed to Checkout' }).click({ timeout: 8_000 }); // ISSUE 2 continued

  await page.waitForNavigation(); // ISSUE 7 continued

  // ISSUE 10 (no-conditional-expect): `getAttribute` returns null when the
  // element doesn't exist or the attribute is absent. When `status` is not
  // 'confirmed' — or the element isn't on the page yet — the `if` is never
  // entered and the heading assertion is silently skipped. A broken checkout
  // page would pass the test whenever the attribute is missing or mismatched.
  //
  //   Fix: assert the status attribute directly, then check the heading
  //   unconditionally:
  //
  //   await expect(page.locator('[data-testid="order-status"]')).toHaveAttribute('data-status', 'confirmed');
  //   await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
  const status = await page.locator('[data-testid="order-status"]').getAttribute('data-status');
  if (status === 'confirmed') {
    await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
  }
});
