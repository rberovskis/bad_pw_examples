# require-to-pass-timeout

**Tier:** L3 — Senior  
**Category:** Timeout Management  
**Rule:** `require-to-pass-timeout`

## Why this rule exists

`toPass()` is Playwright's mechanism for retrying an async assertion block until it stops throwing. Unlike `expect` matchers that respect the `timeout` option in your Playwright config or a custom `expect` timeout, `toPass()` defaults to a timeout of `0` — meaning it will retry indefinitely and only stop when the surrounding test's global timeout fires. This makes test failure mode unpredictable: a flaky polling assertion can silently consume the entire test budget before the runner kills it, obscuring whether the test failed due to the assertion itself or an unrelated timeout. Explicitly setting `timeout` on each `toPass()` call makes the retry window intentional and bounded, so failures surface at the right scope.

## What interviewers look for

- The candidate can explain that `toPass()` does **not** inherit `expect.timeout` from playwright config — it is an independent retry mechanism with its own default of `0`, and that `0` means "no explicit cap" (not "fail immediately")
- The candidate understands the practical failure mode: a `toPass()` without a timeout inflates overall suite duration and makes it impossible to distinguish a slow assertion from a test-level timeout, especially in CI environments with strict time budgets
- The candidate knows that `timeout` and `intervals` are independent options — passing `intervals` alone does not satisfy this rule, and a senior engineer should be able to explain that `intervals` only controls retry cadence, not the total retry window

---

## Bad Example 1 — Polling an API response without a timeout cap

```typescript
import { test, expect } from '@playwright/test';

test('order status eventually updates to shipped', async ({ page, request }) => {
  await page.goto('/orders/ORD-8821');
  await page.getByRole('button', { name: 'Place Order' }).click();

  await expect(async () => {
    const res = await request.get('/api/orders/ORD-8821/status');
    const body = await res.json();
    expect(body.status).toBe('shipped');
  }).toPass();
});
```

**What's wrong:** `toPass()` is called with no options, so it retries indefinitely against the test-level timeout. If the backend never returns `'shipped'`, the test hangs for the full test timeout (e.g. 30 s) rather than failing at a meaningful, intentional boundary — making CI failure reports misleading and slow.

---

## Bad Example 2 — Passing `intervals` but omitting `timeout`

```typescript
import { test, expect } from '@playwright/test';

test('notification badge disappears after read', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Notifications' }).click();
  await page.getByRole('button', { name: 'Mark all as read' }).click();

  await expect(async () => {
    await expect(page.getByTestId('notification-badge')).not.toBeVisible();
  }).toPass({ intervals: [500, 1000, 2000] });
});
```

**What's wrong:** Supplying `intervals` looks intentional and is easy to misread as "configured," but without `timeout` the assertion still retries indefinitely. The intervals only control the delay between attempts — the total retry window remains unbounded.

---

## Good Example 1 — Polling an API response with an explicit timeout

```typescript
import { test, expect } from '@playwright/test';

test('order status eventually updates to shipped', async ({ page, request }) => {
  await page.goto('/orders/ORD-8821');
  await page.getByRole('button', { name: 'Place Order' }).click();

  await expect(async () => {
    const res = await request.get('/api/orders/ORD-8821/status');
    const body = await res.json();
    expect(body.status).toBe('shipped');
  }).toPass({ timeout: 15_000 });
});
```

**Why this works:** The `timeout: 15_000` option gives the assertion a dedicated 15-second window that is independent of the test's global timeout. If the status has not changed within 15 seconds the assertion fails clearly, leaving the remaining test budget intact and producing a precise failure message.

---

## Good Example 2 — Combining `timeout` and `intervals` for controlled back-off

```typescript
import { test, expect } from '@playwright/test';

test('notification badge disappears after read', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Notifications' }).click();
  await page.getByRole('button', { name: 'Mark all as read' }).click();

  await expect(async () => {
    await expect(page.getByTestId('notification-badge')).not.toBeVisible();
  }).toPass({ timeout: 8_000, intervals: [500, 1000, 2000] });
});
```

**Why this works:** Both `timeout` and `intervals` are specified, so the retry behavior is fully intentional — the assertion gives up after 8 seconds regardless of how many attempts have run, while the back-off schedule avoids hammering the UI on every tick.

---

## Interview talking points

- **Gotcha question:** "You set `expect.timeout` to `10000` in your `playwright.config.ts`. Does that mean a bare `toPass()` will time out after 10 seconds?"
- **Expected answer:** No. The Playwright documentation explicitly states that `.toPass()` does not respect the custom `expect` timeout — it has its own default of `0`, which means no timeout cap. The config-level `expect.timeout` only applies to standard matchers like `toBeVisible()` or `toHaveText()`. You must pass `timeout` directly to `toPass()` every time.
- **Common misconception:** Junior and mid-level candidates often assume that providing `intervals` is enough to bound the retry loop, or that `toPass()` inherits the global expect timeout just like other matchers. They may also confuse `timeout: 0` with "fail immediately" rather than "no upper bound," which is the actual behavior.
