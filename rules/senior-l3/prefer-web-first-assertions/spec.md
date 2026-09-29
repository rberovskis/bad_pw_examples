# prefer-web-first-assertions

**Tier:** L3 — Senior  
**Category:** Auto-Retry & Reliability  
**Rule:** `prefer-web-first-assertions`

## Why this rule exists

Playwright's locator methods like `isVisible()`, `isEnabled()`, and `innerText()` are point-in-time snapshot calls — they resolve the DOM state at the instant `await` is hit and return a plain value immediately, with no retry logic. If the UI is mid-transition (e.g. an element is being rendered after an async data fetch), the assertion fires against a stale or absent element and fails flakily. Web-first assertions like `toBeVisible()` and `toHaveText()` are built into Playwright's `expect` engine, which polls the condition on a configurable timeout (default 5 seconds), retrying until it passes or times out. This means the test waits for the application to reach the expected state rather than racing against it.

## What interviewers look for

- The candidate understands the distinction between **action methods that return values** (point-in-time) versus **web-first assertions that are built on Playwright's retry-assertion engine** — and can explain *why* the latter is more reliable in async UIs.
- The candidate can articulate which web-first assertion maps to which instance method (e.g. `isVisible()` → `toBeVisible()`, `innerText()` → `toHaveText()`, `getAttribute()` → `toHaveAttribute()`) and knows that the mapping is not always one-to-one.
- The candidate recognizes that wrapping a point-in-time call in a `waitFor` or a custom retry loop is an anti-pattern that reimplements logic Playwright already provides, and that web-first assertions integrate cleanly with Playwright's `expect.configure` timeout and soft-assertion APIs.

---

## Bad Example 1 — Snapshot check after form submission

```typescript
import { test, expect } from '@playwright/test';

test('shows success banner after login', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('hunter2');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Point-in-time snapshot — resolves before the redirect animation completes
  const bannerVisible = await page.locator('[data-testid="success-banner"]').isVisible();
  expect(bannerVisible).toBe(true);

  const welcomeText = await page.locator('[data-testid="success-banner"]').innerText();
  expect(welcomeText).toBe('Welcome back, user@example.com');
});
```

**What's wrong:** `isVisible()` and `innerText()` are called immediately after the button click. If the server response or client-side render takes even a few hundred milliseconds, both calls read a stale DOM and the test fails intermittently without any useful error message pointing to the timing issue.

---

## Bad Example 2 — Attribute check on a dynamically populated element

```typescript
import { test, expect } from '@playwright/test';

test('submit button is disabled while request is in flight', async ({ page }) => {
  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Place order' }).click();

  // Attempt to assert the button becomes disabled during the pending request
  const isDisabled = await page.getByRole('button', { name: 'Place order' }).isDisabled();
  expect(isDisabled).toBe(true);

  // Also checks a data attribute set by the loading state
  const loadingAttr = await page
    .getByRole('button', { name: 'Place order' })
    .getAttribute('data-loading');
  expect(loadingAttr).toBe('true');
});
```

**What's wrong:** The disabled state and `data-loading` attribute are set asynchronously by the click handler. Both `isDisabled()` and `getAttribute()` snapshot the element at the instant they execute — likely before the state has been applied — so the assertions pass only when the machine is slow enough and fail on fast CI runners.

---

## Good Example 1 — Web-first assertions after login

```typescript
import { test, expect } from '@playwright/test';

test('shows success banner after login', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('hunter2');
  await page.getByRole('button', { name: 'Sign in' }).click();

  const banner = page.locator('[data-testid="success-banner"]');
  await expect(banner).toBeVisible();
  await expect(banner).toHaveText('Welcome back, user@example.com');
});
```

**Why this works:** `toBeVisible()` and `toHaveText()` both use Playwright's built-in retry-assertion loop, polling until the banner appears and contains the expected text or the configured timeout expires. The test is immune to render delays and produces a clear timeout message if it fails.

---

## Good Example 2 — Attribute assertion on a loading state

```typescript
import { test, expect } from '@playwright/test';

test('submit button reflects loading state during order placement', async ({ page }) => {
  await page.goto('/checkout');

  const submitBtn = page.getByRole('button', { name: 'Place order' });
  await submitBtn.click();

  // Waits for the attribute to be present — survives async state updates
  await expect(submitBtn).toHaveAttribute('data-loading', 'true');
  await expect(submitBtn).toBeDisabled();

  // Once the request resolves, the button should recover
  await expect(submitBtn).toBeEnabled({ timeout: 10_000 });
});
```

**Why this works:** `toHaveAttribute()` and `toBeDisabled()` / `toBeEnabled()` are web-first assertions that poll the element, so they correctly capture transient loading states without manual waits. Per-assertion timeouts like `{ timeout: 10_000 }` let you tune retries for slow network conditions without changing the global config.

---

## Interview talking points

- **Gotcha question:** "If `isVisible()` is just a boolean and I `await` it, isn't that functionally the same as `toBeVisible()` since both are async?"
- **Expected answer:** A strong candidate explains that `await` on `isVisible()` simply waits for the JavaScript microtask that resolves the locator's DOM query at that instant — there is no retry loop. `toBeVisible()` wraps the check in `expect`'s polling engine, which re-evaluates the condition on a configurable interval until it passes or times out. The `await` keyword is syntactically similar but semantically very different in what it waits for.
- **Common misconception:** Junior and mid-level candidates often believe that adding `await` before any Playwright call makes it "automatically wait for the element." They conflate `await`ing a promise (waiting for a single async operation to complete) with Playwright's auto-waiting and retry-assertion mechanism, which actively re-polls the DOM over time. They may also assume that if the test passes locally it is reliable, not realizing that point-in-time checks only appear stable because local machines are fast and render synchronously under low load.
