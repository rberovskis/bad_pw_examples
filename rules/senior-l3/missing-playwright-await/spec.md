# missing-playwright-await

**Tier:** L3 — Senior  
**Category:** Async Correctness  
**Rule:** `missing-playwright-await`

## Why this rule exists

Playwright's assertion and navigation APIs return Promises that must be awaited for the engine to perform its internal retry logic, DOM polling, and network synchronization. When a call like `expect(locator).toBeVisible()` is not awaited, the test runner discards the Promise and moves on immediately — the assertion never actually executes, so the test passes regardless of the page state. For `waitForResponse` and similar methods, skipping `await` means the event listener is registered after the triggering action, creating a race condition that silently succeeds on fast machines but flakes in CI.

## What interviewers look for

- The candidate explains that un-awaited Playwright matchers silently no-op: the test appears green but no assertion was made, producing a false positive that masks real regressions.
- The candidate understands the difference between registering a Promise (setting up the listener) and awaiting it (blocking until resolution), and why the order matters especially for network interception with `waitForResponse` / `waitForRequest`.
- The candidate can describe the correct patterns: direct `await`, destructured `Promise.all` for concurrent listen-then-act, `await test.step(...)` for named step grouping, and `customMatchers` config for in-house async matcher extensions.

---

## Bad Example 1 — Unawaited assertion silently passes on broken UI

```typescript
import { test, expect } from '@playwright/test';

test('user can submit the login form and reach the dashboard', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('hunter2');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // BUG: no await — this assertion is never evaluated.
  // The test will pass even if the redirect never happens
  // or the heading is completely absent from the DOM.
  expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  expect(page.getByText('Welcome back, user@example.com')).toBeVisible();
});
```

**What's wrong:** Both `expect(...).toBeVisible()` calls return Promises that are never awaited. Playwright's internal retry loop never runs, so the assertions are discarded — the test always reports green regardless of what is actually rendered after login.

---

## Bad Example 2 — Race condition from registering a network listener too late

```typescript
import { test, expect } from '@playwright/test';

test('checkout flow posts order and shows confirmation number', async ({ page }) => {
  await page.goto('/checkout');

  await page.getByLabel('Card number').fill('4111111111111111');
  await page.getByLabel('Expiry').fill('12/29');
  await page.getByLabel('CVV').fill('123');

  // BUG: click fires first, then we try to set up the network listener.
  // The POST /orders response may arrive before waitForResponse resolves
  // its Promise, causing an intermittent timeout — or worse, the test
  // passes on fast networks and fails only under CI load.
  await page.getByRole('button', { name: 'Place order' }).click();
  page.waitForResponse('/api/orders');

  await expect(page.getByTestId('confirmation-number')).toBeVisible();
});
```

**What's wrong:** `page.waitForResponse` is not awaited, so its result Promise is abandoned and the test never actually waits for the network response. Additionally, the listener is registered after the click that triggers the request, introducing a race condition even if `await` were added.

---

## Good Example 1 — All assertions properly awaited

```typescript
import { test, expect } from '@playwright/test';

test('user can submit the login form and reach the dashboard', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('hunter2');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Playwright's retry logic polls the DOM until the heading appears
  // or the configured timeout is reached before marking the test failed.
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('Welcome back, user@example.com')).toBeVisible();
});
```

**Why this works:** Each `await` transfers control to Playwright's assertion engine, which retries the DOM check with built-in timeouts. The test only proceeds — or fails — once each condition is definitively resolved.

---

## Good Example 2 — Network listener registered before the triggering action using Promise.all

```typescript
import { test, expect } from '@playwright/test';

test('checkout flow posts order and shows confirmation number', async ({ page }) => {
  await page.goto('/checkout');

  await page.getByLabel('Card number').fill('4111111111111111');
  await page.getByLabel('Expiry').fill('12/29');
  await page.getByLabel('CVV').fill('123');

  // Register the listener BEFORE triggering the action, then await both
  // concurrently. Promise.all ensures we don't block on the response
  // before the click fires, while guaranteeing we never miss the event.
  const [orderResponse] = await Promise.all([
    page.waitForResponse((resp) => resp.url().includes('/api/orders') && resp.status() === 201),
    page.getByRole('button', { name: 'Place order' }).click(),
  ]);

  const { orderId } = await orderResponse.json();
  await expect(page.getByTestId('confirmation-number')).toHaveText(orderId);
});
```

**Why this works:** The `waitForResponse` listener is in place before `click()` fires, eliminating the race condition. `Promise.all` keeps both concurrent — the response resolves as soon as it arrives, and `await` ensures the test blocks until both Promises settle.

---

## Interview talking points

- **Gotcha question:** "If an un-awaited `expect(...).toBeVisible()` doesn't throw, how would you ever know your test was silently skipping the assertion in a real CI pipeline?"
- **Expected answer:** A strong candidate explains that the only reliable indicator is a failing test when the UI is intentionally broken — a test that always passes regardless of DOM state is a false positive. They would add `expect.hasAssertions()` (if using a custom setup) or enforce the ESLint rule in CI so the linter catches it before the test runner is even invoked. They might also mention that Playwright's `--reporter=html` won't surface un-awaited assertions as failures, making static analysis the only safety net.
- **Common misconception:** Junior and mid-level candidates often believe that because the test file uses `async/await` elsewhere, any Playwright call inside an `async` function is automatically awaited. They conflate "the function is async" with "every expression inside it is awaited," not realizing that a Promise returned from an un-awaited call is simply garbage-collected without execution.
