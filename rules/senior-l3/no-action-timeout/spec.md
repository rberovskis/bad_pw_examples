# no-action-timeout

**Tier:** L3 — Senior  
**Category:** Timeout Management  
**Rule:** `no-action-timeout`

## Why this rule exists

Playwright action methods (`click`, `fill`, `check`, etc.) accept a `timeout` option that overrides the suite-wide `actionTimeout` for that single call. When developers sprinkle these per-call overrides across a test suite they fragment the timeout budget: no single place in configuration describes how long any given interaction is allowed to take, and the budgets inevitably drift out of sync as the suite grows. More critically, `{ timeout: 0 }` disables the guard entirely — if the target element never becomes interactable the test hangs indefinitely, blocking the entire CI runner until the job's wall-clock limit kills it rather than failing with a meaningful message.

## What interviewers look for

- The candidate can distinguish between **action timeouts** (govern a single user-facing interaction such as `click` or `fill`) and **navigation/wait timeouts** (govern `page.goto`, `waitForURL`, `waitForSelector`) — and explain why the rule only flags the former.
- The candidate knows the three escalation paths the rule doc recommends — delete the override if a prior `waitFor`/assertion already established the condition; use `test.setTimeout()` or `test.slow()` when a whole test needs more room; raise `use.actionTimeout` in config only when the new value is right for the entire suite.
- The candidate understands the `allow` option and when it is appropriate (e.g., `setInputFiles` with a legitimately large upload) versus when it is being misused as an escape hatch to suppress the lint warning without fixing the underlying flakiness.

---

## Bad Example 1 — Per-action timeouts masking a slow checkout API

```typescript
import { test, expect } from '@playwright/test';

test('user completes checkout with saved card', async ({ page }) => {
  await page.goto('/cart');

  await page.getByRole('button', { name: 'Proceed to Checkout' }).click({ timeout: 10_000 });

  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();

  await page.getByLabel('Cardholder name').fill('Jane Smith', { timeout: 5_000 });
  await page.getByLabel('Card number').fill('4111111111111111', { timeout: 5_000 });
  await page.getByLabel('Expiry').fill('12/29', { timeout: 5_000 });
  await page.getByLabel('CVV').fill('123', { timeout: 5_000 });

  await page.getByRole('button', { name: 'Place Order' }).click({ timeout: 15_000 });

  await expect(page.getByRole('heading', { name: 'Order Confirmed' })).toBeVisible();
});
```

**What's wrong:** Every interaction carries its own bespoke timeout, creating a hidden, distributed budget that no config value controls — a reviewer cannot tell the test's real upper bound without summing them all. The inflated `15_000` on `Place Order` is a red flag that a slow payment API is being tolerated rather than diagnosed.

---

## Bad Example 2 — Infinite hang with `timeout: 0` on a conditionally rendered element

```typescript
import { test, expect } from '@playwright/test';

test('admin can publish a draft article', async ({ page }) => {
  await page.goto('/cms/articles');

  await page.getByRole('row', { name: /Quarterly Report/ }).getByRole('button', { name: 'Edit' }).click();

  await page.getByRole('combobox', { name: 'Status' }).selectOption('published', { timeout: 0 });

  await page.getByRole('button', { name: 'Save Changes' }).click({ timeout: 0 });

  await expect(page.getByRole('alert')).toContainText('Article published');
});
```

**What's wrong:** `{ timeout: 0 }` removes Playwright's safety net entirely. If the `Status` combobox is gated behind a feature flag that is off in this environment, or if `Save Changes` is disabled while a background validation runs, the test will hang until the CI job's wall-clock limit terminates it — producing no actionable failure message and blocking every subsequent job in the queue.

---

## Good Example 1 — Checkout flow with config-driven timeout budget

```typescript
import { test, expect } from '@playwright/test';

test('user completes checkout with saved card', async ({ page }) => {
  // If the payment flow is genuinely slow in all environments,
  // raise actionTimeout in playwright.config.ts — not here.
  await page.goto('/cart');

  await page.getByRole('button', { name: 'Proceed to Checkout' }).click();

  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();

  await page.getByLabel('Cardholder name').fill('Jane Smith');
  await page.getByLabel('Card number').fill('4111111111111111');
  await page.getByLabel('Expiry').fill('12/29');
  await page.getByLabel('CVV').fill('123');

  await page.getByRole('button', { name: 'Place Order' }).click();

  await expect(page.getByRole('heading', { name: 'Order Confirmed' })).toBeVisible();
});
```

**Why this works:** All timeout budgets are delegated to `actionTimeout` in `playwright.config.ts`, so there is a single authoritative number to tune. If the payment API slows down in production-like staging, one config change adjusts every test at once rather than requiring a grep-and-replace across the suite.

---

## Good Example 2 — Conditional UI handled with `isVisible` instead of a silent short timeout

```typescript
import { test, expect } from '@playwright/test';

test('admin can publish a draft article', async ({ page }) => {
  await page.goto('/cms/articles');

  await page.getByRole('row', { name: /Quarterly Report/ }).getByRole('button', { name: 'Edit' }).click();

  // Dismiss the unsaved-changes warning only if it appears; never swallow
  // an infinite hang by removing the timeout guard entirely.
  const warningDismiss = page.getByRole('button', { name: 'Discard Changes' });
  if (await warningDismiss.isVisible()) {
    await warningDismiss.click();
  }

  await page.getByRole('combobox', { name: 'Status' }).selectOption('published');

  await page.getByRole('button', { name: 'Save Changes' }).click();

  await expect(page.getByRole('alert')).toContainText('Article published');
});
```

**Why this works:** Optional UI is handled with an `isVisible()` guard rather than suppressing the timeout, so Playwright's built-in action timeout still protects every interaction. If `Save Changes` is unexpectedly disabled, the test fails immediately with a clear timeout message instead of hanging.

---

## Interview talking points

- **Gotcha question:** "The rule doc says a deliberately short timeout — like `{ timeout: 1000 }` to probe for an optional cookie banner — is a legitimate pattern. Does that mean you'd add `click` to the `allow` list to keep those tests green?"
- **Expected answer:** A strong senior answer is no. The `allow` option is per-method, not per-call, so adding `click` exempts every `click` timeout in the entire suite, which defeats the rule. The idiomatic fix is the `isVisible()` guard shown in the rule doc: check visibility first, then act unconditionally. If the short-timeout pattern appears in only one or two places and removal is genuinely disruptive, `// eslint-disable-next-line` with a comment explaining the intent is more honest than a blanket `allow` entry.
- **Common misconception:** Junior and mid-level candidates often believe that adding `{ timeout: 0 }` is a safe way to "wait as long as needed" for a slow element — treating it as an infinite patience setting. In practice it is the opposite: it removes the circuit breaker, so any stuck element causes the test process to hang indefinitely rather than failing with a diagnostic message. The correct tool for genuinely indeterminate wait times is a `waitFor` with an explicit state condition, or raising `actionTimeout` in config.
