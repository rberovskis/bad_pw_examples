# prefer-ending-with-an-expect

**Tier:** L3 — Senior  
**Category:** Test Completeness  
**Rule:** `prefer-ending-with-an-expect`

## Why this rule exists

Playwright tests that end with an action (a `click`, `fill`, `goto`, etc.) rather than an assertion express no verifiable outcome — the test can pass even when the feature is completely broken, because Playwright will simply execute the action without confirming anything changed. This is especially dangerous because Playwright's auto-waiting resolves on interaction readiness, not on post-interaction correctness; a `click()` that succeeds proves the element was clickable, not that the click produced the expected result. The rule enforces an explicit assertion as the final statement so every test has a documented, machine-checked contract for what "success" means.

## What interviewers look for

- The candidate distinguishes between Playwright's auto-waiting (which waits for actionability before an action) and assertions (which verify state after an action), and explains why auto-waiting alone is insufficient as a correctness check.
- The candidate can identify subtle action-ending patterns — not just bare `page.goto()` calls, but cases like `page.getByRole('button').click()` following an `expect`, where the expect is present but misplaced as a non-final statement.
- The candidate knows about the `assertFunctionNames` and `assertFunctionPatterns` escape hatches and can explain when a custom assertion helper wrapper is the right solution versus inline `expect` calls.

---

## Bad Example 1 — Login flow ending on a click

```typescript
import { test, expect } from '@playwright/test';

test('user can submit the login form', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByLabel('Email')).toBeVisible();

  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('hunter2');
  await page.getByRole('button', { name: 'Sign in' }).click();
});
```

**What's wrong:** The test ends on `click()`, so it only verifies that the button was clickable — it never confirms the login actually succeeded (e.g., redirect to `/dashboard` or appearance of a welcome message). A regression that breaks the POST handler would not be caught.

---

## Bad Example 2 — API intercept setup with a misplaced assertion

```typescript
import { test, expect } from '@playwright/test';

test('search results load after query', async ({ page }) => {
  await page.route('/api/search*', async (route) => {
    await route.fulfill({ json: { results: [{ id: 1, title: 'Widget' }] } });
  });

  await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible();

  await page.goto('/search');
  await page.getByRole('searchbox').fill('widget');
  await page.getByRole('button', { name: 'Search' }).click();
});
```

**What's wrong:** The `expect` is present but verifies the heading before the search is even triggered — it is not the final statement. The test ends on the `click()` that fires the search, so there is no assertion that the mocked results actually rendered.

---

## Good Example 1 — Login flow with a post-submit assertion

```typescript
import { test, expect } from '@playwright/test';

test('user can submit the login form', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('hunter2');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL('/dashboard');
});
```

**Why this works:** The final statement asserts the observable outcome — a URL change to `/dashboard` — giving the test a real contract. A broken auth handler will now cause the test to fail rather than pass silently.

---

## Good Example 2 — Search results verified via a custom assertion helper

```typescript
import { test } from '@playwright/test';
import { assertResultCount } from '../helpers/search-assertions';

test('search returns matching products', async ({ page }) => {
  await page.route('/api/search*', async (route) => {
    await route.fulfill({
      json: { results: [{ id: 1, title: 'Widget' }, { id: 2, title: 'Gadget' }] },
    });
  });

  await page.goto('/search');
  await page.getByRole('searchbox').fill('widget');
  await page.getByRole('button', { name: 'Search' }).click();

  await assertResultCount(page, 2);
});
```

```json
{
  "playwright/prefer-ending-with-an-expect": [
    "error",
    { "assertFunctionNames": ["assertResultCount"] }
  ]
}
```

**Why this works:** The custom helper `assertResultCount` encapsulates a reusable assertion pattern, and the `assertFunctionNames` option tells the linter to treat it as an assertion. The test ends on a meaningful check without requiring the helper to be inlined.

---

## Interview talking points

- **Gotcha question:** "Our test has an `expect` in the middle of the body and a `click()` at the end. The `expect` passes. Why would this rule still flag the test, and is the rule being overly strict here?"
- **Expected answer:** The rule flags the test because the *final* statement is an action, not an assertion — the `expect` earlier in the body proves something about an intermediate state, not the outcome of the last action. This is not overly strict: every action can produce a side effect, and the only way to confirm that side effect is with an assertion. The fix is to either add an assertion after the `click()` that verifies its result, or reorder the test so the meaningful assertion comes last.
- **Common misconception:** Junior and mid-level candidates often argue that "Playwright's auto-waiting handles this" — believing that if `click()` resolves without timing out, the feature must be working. This conflates actionability (can I interact with this element?) with correctness (did the interaction produce the right outcome?). Auto-waiting waits for an element to be stable and interactable; it does not verify what happens after the interaction completes.
