# no-wait-for-selector

**Tier:** L3 — Senior  
**Category:** Locator Strategy & Retry Logic  
**Rule:** `no-wait-for-selector`

## Why this rule exists

`page.waitForSelector` is a legacy Playwright API inherited from Puppeteer that returns an `ElementHandle` — a snapshot of a DOM node at a point in time. Unlike Playwright's `Locator` API, `ElementHandle` objects are not auto-retrying and are not lazy; they detach from the DOM as soon as the element is removed or the frame navigates, causing `ElementHandle.isDetached()` to become true and subsequent actions to throw stale-element errors. The `Locator` API (returned by `page.locator`, `page.getByRole`, etc.) defers DOM resolution to action time and retries automatically, so it handles dynamic content, skeleton loaders, and client-side navigation without manual waiting. Using `waitForSelector` also encourages CSS/XPath selector coupling rather than user-visible, accessibility-driven queries, making tests brittle when styling or markup changes.

## What interviewers look for

- The candidate explains that `waitForSelector` returns an `ElementHandle`, not a `Locator`, and can articulate why that distinction matters for retry behaviour and stale-element risk.
- The candidate knows which idiomatic Playwright alternatives to reach for: `page.waitForURL()` after navigation, `page.waitForLoadState()` for network/DOM quiescence, `page.waitForFunction()` for arbitrary JS conditions, and — most commonly — simply using a `Locator` directly (which has built-in actionability waiting).
- The candidate can describe a realistic scenario where removing `waitForSelector` and relying on Locator auto-waiting either simplified test code or fixed a flaky test, demonstrating practical production experience rather than just rule memorisation.

---

## Bad Example 1 — Waiting for element before clicking

```typescript
import { test, expect } from '@playwright/test';

test('user can submit the login form', async ({ page }) => {
  await page.goto('/login');

  await page.waitForSelector('#email-input');
  await page.fill('#email-input', 'user@example.com');

  await page.waitForSelector('#password-input');
  await page.fill('#password-input', 'S3cur3P@ss!');

  await page.waitForSelector('button[type="submit"]');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/dashboard');
});
```

**What's wrong:** Each `waitForSelector` call returns a discarded `ElementHandle` and then the subsequent `page.fill` / `page.click` calls open a second race window — the element could theoretically detach between the wait and the action. Playwright `Locator` actions already wait for the element to be visible and stable before acting, so the explicit waits are redundant and introduce extra round-trips to the browser process.

---

## Bad Example 2 — Polling for async content after navigation

```typescript
import { test, expect } from '@playwright/test';

test('order history loads after soft navigation', async ({ page }) => {
  await page.goto('/account');
  await page.click('nav >> text=Orders');

  // Wait for the orders table to appear after the client-side route change
  const tableHandle = await page.waitForSelector('table.orders-table');
  const rowCount = await tableHandle.$$eval('tbody tr', rows => rows.length);

  expect(rowCount).toBeGreaterThan(0);
});
```

**What's wrong:** After the `waitForSelector` resolves, `tableHandle` is an `ElementHandle` snapshot. If the framework re-renders the table (e.g., a sort or pagination update arrives), `tableHandle` becomes detached and the `$$eval` call throws. Using `page.locator('table.orders-table').locator('tbody tr')` with `.count()` would re-query the live DOM on every call.

---

## Good Example 1 — Relying on Locator actionability waiting

```typescript
import { test, expect } from '@playwright/test';

test('user can submit the login form', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('S3cur3P@ss!');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL('/dashboard');
});
```

**Why this works:** `getByLabel` and `getByRole` return `Locator` objects that automatically wait for the target element to be attached, visible, stable, and enabled before performing each action. No manual waiting is needed, the assertions are accessibility-aligned, and the test remains resilient to loading spinners or transition animations.

---

## Good Example 2 — Using waitForURL and Locator for post-navigation content

```typescript
import { test, expect } from '@playwright/test';

test('order history loads after soft navigation', async ({ page }) => {
  await page.goto('/account');
  await page.getByRole('link', { name: 'Orders' }).click();

  // Wait for the client-side route to settle, then assert on live DOM
  await page.waitForURL('/account/orders');

  const rows = page.locator('table.orders-table tbody tr');
  await expect(rows).toHaveCountGreaterThan(0);
});
```

**Why this works:** `page.waitForURL()` is the correct primitive for gating on client-side navigation; it waits for the URL pattern without blocking on a specific element. The subsequent `Locator` assertion (`toHaveCountGreaterThan`) retries automatically against the live DOM until it passes or times out, so the test is both readable and resilient to re-renders.

---

## Interview talking points

- **Gotcha question:** "If `page.waitForSelector` still works at runtime and your test passes, why should you bother replacing it?"
- **Expected answer:** A senior engineer explains that passing today is not the same as being reliable under load or on slow CI machines. `waitForSelector` creates a discrete resolved-then-act gap where element detachment can cause intermittent failures. More importantly, it returns an `ElementHandle` whose downstream actions have no auto-retry, so any dynamic re-render between the wait and the action will throw. Locators eliminate that gap entirely by deferring resolution to action time, and they surface better errors (with element snapshots) when they do fail. The rule also nudges teams toward `getByRole` / `getByLabel` queries that test user-visible semantics rather than CSS implementation details.
- **Common misconception:** Junior and mid-level candidates often believe that calling `waitForSelector` is the "safe" way to ensure an element exists before acting on it, not realising that Playwright's `Locator` API already performs that waiting internally as part of every `.click()`, `.fill()`, and `expect()` call. They conflate the Puppeteer mental model (explicit waits required) with Playwright's auto-waiting model, and miss the stale-element risk that comes from holding an `ElementHandle` reference across asynchronous boundaries.
