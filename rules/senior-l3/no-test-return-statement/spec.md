# no-test-return-statement

**Tier:** L3 — Senior  
**Category:** Async Correctness  
**Rule:** `no-test-return-statement`

## Why this rule exists

Playwright's test runner drives each test through its own internal async executor — it does not chain on or `await` the value returned by the test callback. Returning a `Promise` from a test body therefore silently discards it: the runner marks the test complete as soon as the callback returns the promise object, before that promise has settled. Any assertion failures or exceptions thrown inside the abandoned promise are either swallowed entirely or attached to a subsequent test's context, producing misleading failure attribution. An empty `return` at the top level is dead code for the same reason — the test body always runs to completion regardless.

## What interviewers look for

- The candidate explains the causal chain precisely: the test runner does not consume the return value, so a returned promise is abandoned and its rejection is never propagated to the test result.
- The candidate distinguishes between top-level returns (flagged by this rule) and `return` inside a nested callback, conditional, or loop — the latter is ordinary control flow and is intentionally allowed.
- The candidate connects this to real failure modes: a flaky green test that masks a broken assertion, or a timeout in a later, unrelated test caused by leaked async work from an earlier one.

---

## Bad Example 1 — Returning a navigation promise

```typescript
import { test, expect } from '@playwright/test';

test('redirects unauthenticated users to the login page', async ({ page }) => {
  return page.goto('/dashboard').then(() => {
    return expect(page).toHaveURL('/login');
  });
});
```

**What's wrong:** The entire promise chain is returned rather than awaited. Playwright discards the return value, so the test exits immediately after `goto` is called; the URL assertion never executes before the runner marks the test as passed.

---

## Bad Example 2 — Returning an expect assertion

```typescript
import { test, expect } from '@playwright/test';

test('submit button is disabled until all fields are filled', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('Email').fill('user@example.com');

  return expect(page.getByRole('button', { name: 'Create account' })).toBeDisabled();
});
```

**What's wrong:** `expect(...).toBeDisabled()` returns a `Promise` and Playwright web-first assertions can retry asynchronously. Returning it instead of awaiting it means the assertion promise is dropped — the test always passes regardless of the button's actual state, hiding a real regression.

---

## Good Example 1 — Awaiting the navigation and assertion chain

```typescript
import { test, expect } from '@playwright/test';

test('redirects unauthenticated users to the login page', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL('/login');
});
```

**Why this works:** Each async operation is explicitly awaited, so the runner holds the test open until every assertion has settled. Any failure in `toHaveURL` is correctly attributed to this test.

---

## Good Example 2 — Early return for browser-skip with awaited assertions

```typescript
import { test, expect } from '@playwright/test';

test('clipboard paste populates the search field', async ({ page, browserName }) => {
  // Clipboard API is not available in all headless browsers
  if (browserName === 'firefox') {
    return;
  }

  await page.goto('/products');
  await page.getByRole('searchbox').focus();
  await page.keyboard.insertText('wireless headphones');
  await expect(page.getByRole('searchbox')).toHaveValue('wireless headphones');
});
```

**Why this works:** The bare `return` inside the conditional is intentional early-exit control flow — it carries no value and is explicitly permitted by the rule. All actual async operations below it are properly awaited.

---

## Interview talking points

- **Gotcha question:** "The test suite passes with no failures and no timeouts. Is it safe to assume a test that uses `return page.goto(...)` is correctly verifying behavior?"
- **Expected answer:** No — a returned promise is silently discarded by Playwright's runner, so the test passes trivially without executing any assertions inside the chain. A green result here is a false positive, not proof of correctness. The only reliable signal is that the lint rule fires; at runtime there is no warning.
- **Common misconception:** Junior and mid-level candidates often assume Playwright works like a Jest test runner that does consume the return value of the test function (Jest does `await` the return value). They conflate the two and believe returning a promise is equivalent to awaiting it — which is true in Jest but false in Playwright's runner, making this a subtle cross-framework portability trap.
