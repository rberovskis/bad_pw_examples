# require-soft-assertions

**Tier:** L3 — Senior  
**Category:** Assertion Strategy  
**Rule:** `require-soft-assertions`

## Why this rule exists

By default, Playwright's `expect()` throws immediately on the first failing assertion, halting the rest of the test body. In test suites that validate multiple independent UI states in a single test (e.g., a dashboard with several KPI tiles or a multi-field form), this means a single early failure masks all subsequent assertion results. `expect.soft()` collects all failures and reports them together at the end of the test, giving engineers a complete picture of what broke in one run rather than forcing repeated re-runs to surface each issue. Teams that enforce this rule across longer tests reduce mean-time-to-diagnosis by avoiding the whack-a-mole cycle of fixing one assertion only to discover the next failure.

## What interviewers look for

- The candidate can explain the difference in failure semantics between `expect()` and `expect.soft()`: hard assertions abort execution while soft assertions accumulate errors and surface them at `test.end()` via `testInfo.errors`.
- The candidate understands when enforcing soft assertions is an intentional architectural choice (longer, state-rich tests) versus when hard assertions are preferable (early precondition checks, setup guard conditions where continuing would produce meaningless results).
- The candidate recognises that `expect.soft()` failures still mark the test as failed — they do not silently pass — and can articulate that this is not a way to "suppress" failures but a way to gather full diagnostic coverage per test run.

---

## Bad Example 1 — Multiple independent field validations abort early

```typescript
import { test, expect } from '@playwright/test';

test('profile page displays all user details correctly', async ({ page }) => {
  await page.goto('/profile/settings');

  await expect(page.getByTestId('display-name')).toHaveText('Jane Doe');
  await expect(page.getByTestId('email-address')).toHaveText('jane@example.com');
  await expect(page.getByTestId('member-since')).toContainText('2022');
  await expect(page.getByTestId('subscription-tier')).toHaveText('Pro');
  await expect(page.getByTestId('avatar')).toBeVisible();
});
```

**What's wrong:** All five assertions are independent UI facts about the same page state. If `display-name` fails, the test aborts and the reporter shows only one failure — the broken state of the other four fields is invisible until the first is fixed and the test is re-run.

---

## Bad Example 2 — Dashboard KPI tiles checked sequentially with hard assertions

```typescript
import { test, expect } from '@playwright/test';

test('sales dashboard shows correct summary metrics', async ({ page }) => {
  await page.goto('/dashboard/sales');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: 'Total Revenue' }).locator('+ span')).toHaveText('$1,240,000');
  await expect(page.getByRole('heading', { name: 'New Customers' }).locator('+ span')).toHaveText('348');
  await expect(page.getByRole('heading', { name: 'Churn Rate' }).locator('+ span')).toHaveText('2.4%');
  await expect(page.getByRole('heading', { name: 'Avg Order Value' }).locator('+ span')).toHaveText('$312');
});
```

**What's wrong:** After a backend data pipeline change, all four KPI values might be stale simultaneously, but a hard assertion on the first one prevents the test from reporting which other metrics are also wrong — leading to multiple re-runs and slower incident diagnosis.

---

## Good Example 1 — Soft assertions collect all independent field failures at once

```typescript
import { test, expect } from '@playwright/test';

test('profile page displays all user details correctly', async ({ page }) => {
  await page.goto('/profile/settings');

  await expect.soft(page.getByTestId('display-name')).toHaveText('Jane Doe');
  await expect.soft(page.getByTestId('email-address')).toHaveText('jane@example.com');
  await expect.soft(page.getByTestId('member-since')).toContainText('2022');
  await expect.soft(page.getByTestId('subscription-tier')).toHaveText('Pro');
  await expect.soft(page.getByTestId('avatar')).toBeVisible();
});
```

**Why this works:** Every assertion runs regardless of earlier failures, so a single test run surfaces all broken fields simultaneously. The test is still marked as failed when any soft assertion does not pass, preserving test integrity while maximising diagnostic output.

---

## Good Example 2 — Hard assertion guards the precondition, soft assertions validate content

```typescript
import { test, expect } from '@playwright/test';

test('checkout confirmation page shows complete order summary', async ({ page }) => {
  await page.goto('/checkout/confirm?orderId=ORD-9921');

  // Hard assertion: if the page didn't load the right order, continuing is meaningless
  await expect(page.getByTestId('order-id')).toHaveText('ORD-9921');

  // Soft assertions: all content fields are independent and should all be verified
  await expect.soft(page.getByTestId('item-name')).toHaveText('Wireless Headphones');
  await expect.soft(page.getByTestId('item-qty')).toHaveText('2');
  await expect.soft(page.getByTestId('subtotal')).toHaveText('$198.00');
  await expect.soft(page.getByTestId('shipping-estimate')).toContainText('3–5 business days');
  await expect.soft(page.getByTestId('confirmation-email-note')).toContainText('jane@example.com');
});
```

**Why this works:** The hard assertion on the order ID acts as a guard — if the page loaded the wrong order, all subsequent content assertions would be meaningless noise. Once the precondition is confirmed, soft assertions take over so every display field is validated in one pass.

---

## Interview talking points

- **Gotcha question:** "If I use `expect.soft()` for all my assertions and every single one fails, does the test pass?"
- **Expected answer:** No. `expect.soft()` failures are accumulated in `testInfo.errors` and the test is still marked as failed at the end of the test. Soft assertions do not suppress failures — they defer them. The test outcome is the same as with hard assertions; only the point of reporting and the amount of diagnostic information differ.
- **Common misconception:** Junior and mid-level candidates often believe `expect.soft()` is a "lenient mode" that allows partial passes, or that it is always preferable to hard assertions. Strong seniors recognise that hard assertions are the right choice for precondition guards and setup steps where a failure means later assertions would operate on invalid state — mixing both approaches intentionally is the idiomatic pattern.
