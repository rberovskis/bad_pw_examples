# no-networkidle

**Tier:** L3 — Senior  
**Category:** Network Timing  
**Rule:** `no-networkidle`

## Why this rule exists

Playwright's `networkidle` state waits until there are no more than 0 in-flight network requests for at least 500ms, which is a heuristic that makes no semantic guarantees about application readiness. Modern SPAs routinely fire background telemetry, polling, or WebSocket keep-alives that cause `networkidle` to never settle — or to settle prematurely before a critical data fetch completes — resulting in flaky tests whose failure rate scales with infrastructure latency. Playwright's web-first assertions (`expect(locator).toBeVisible()`, `expect(locator).toHaveText()`, etc.) are auto-retrying and tied directly to DOM state, making them deterministic about what the user actually sees rather than about network activity.

## What interviewers look for

- The candidate can explain that `networkidle` is a timing heuristic, not a semantic signal, and describe the specific 500ms / 0-request window that defines it.
- The candidate can identify concrete failure modes: polling endpoints, analytics beacons, and WebSocket frames are all real-world sources of non-settlement or false settlement that make `networkidle` unreliable.
- The candidate knows the idiomatic replacements — web-first assertions on specific locators, `waitForResponse`, or `waitForURL` without `networkidle` — and can articulate *why* those replacements are strictly more reliable.

---

## Bad Example 1 — Waiting for networkidle after login

```typescript
test('redirects to dashboard after login', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('s3cr3t!');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Waits for all network traffic to go quiet — fragile if analytics
  // beacons or session-heartbeat polling are active after login
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});
```

**What's wrong:** After the sign-in POST resolves, the app may fire analytics events or session-refresh calls that keep the network active, preventing `networkidle` from settling. The test timeout is consumed waiting for silence that never comes, or the assertion runs too early when a short lull occurs before the dashboard data fetch starts.

---

## Bad Example 2 — Using networkidle as a waitUntil guard on navigation

```typescript
test('loads product listing after category navigation', async ({ page }) => {
  await page.goto('/shop');

  await page.getByRole('link', { name: 'Electronics' }).click();

  // Attempts to use networkidle to know when the category page is "done"
  await page.waitForURL('/shop/electronics', { waitUntil: 'networkidle' });

  const productCards = page.locator('[data-testid="product-card"]');
  await expect(productCards).toHaveCount(12);
});
```

**What's wrong:** `waitUntil: 'networkidle'` on `waitForURL` blocks until all requests settle globally, not just the ones related to loading product data. A background inventory-check poll or a third-party chat widget can delay the threshold indefinitely, and on slower CI runners the 500ms quiet window may never arrive within the test timeout.

---

## Good Example 1 — Assert on visible UI state after login

```typescript
test('redirects to dashboard after login', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('s3cr3t!');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // The URL and heading are web-first assertions: auto-retrying, tied to
  // actual DOM state, unaffected by background network activity
  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});
```

**Why this works:** `toHaveURL` and `toBeVisible` retry until the condition is true or the test times out, so they pass as soon as the navigation and render complete — regardless of whether background requests are still in flight.

---

## Good Example 2 — Wait for a specific response before asserting data

```typescript
test('loads product listing after category navigation', async ({ page }) => {
  await page.goto('/shop');

  // Set up the response waiter before triggering the navigation so the
  // promise is registered before the request fires
  const productsResponse = page.waitForResponse(
    (res) => res.url().includes('/api/products') && res.status() === 200
  );

  await page.getByRole('link', { name: 'Electronics' }).click();

  await productsResponse;

  const productCards = page.locator('[data-testid="product-card"]');
  await expect(productCards).toHaveCount(12);
});
```

**Why this works:** `waitForResponse` targets the exact API call that populates the product list, making the assertion precise and immune to unrelated background traffic. Registering the waiter before the click ensures the response is never missed due to a race.

---

## Interview talking points

- **Gotcha question:** "If `networkidle` is so unreliable, why does Playwright still ship it?"
- **Expected answer:** A strong candidate explains that `networkidle` remains useful for a narrow set of static-site or server-rendered pages where there is no background network activity after load, and for generating PDFs or screenshots where you genuinely need the page fully quiesced. In interactive SPA test automation it is the wrong tool because SPAs are designed to have persistent background network activity. The right approach is always to couple assertions to the specific UI or API contract you care about.
- **Common misconception:** Junior and mid-level candidates often believe that `networkidle` is a reliable "wait for the page to fully load" primitive — a direct equivalent of waiting for `DOMContentLoaded` or `load`. They do not realize it is a 500ms heuristic over request count with no knowledge of application state, and that a quiet network does not guarantee the component tree has rendered or that data has been bound to the DOM.
