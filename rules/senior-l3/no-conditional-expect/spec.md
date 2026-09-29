# no-conditional-expect

**Tier:** L3 — Senior  
**Category:** Assertion Correctness  
**Rule:** `no-conditional-expect`

## Why this rule exists

Playwright marks a test as failed only when an unhandled exception propagates out of the test function. When `expect` is placed inside an `if` block or a `catch`/`.catch()` handler, the assertion can be silently skipped — for example when the condition is never true or the promise never rejects — and the test exits cleanly with a passing status even though nothing was actually verified. This produces a false-green: CI stays green, the feature ships, and the regression is discovered only in production. Conditional assertions also fragment test intent, forcing reviewers to mentally execute every branch to understand what invariant is actually under test.

## What interviewers look for

- The candidate can explain **why the test passes silently**: Playwright's test runner treats a test as passing when the test function returns (or resolves) without throwing, so an `expect` that is never reached never throws, and no failure is recorded.
- The candidate understands the **`.catch()` pattern as a special case**: wrapping an assertion in a `.catch()` callback is semantically equivalent to putting it inside a `catch` block — if the awaited expression never rejects, the callback is never invoked and the assertion is silently dropped.
- The candidate can articulate **idiomatic alternatives**: using `await expect(fn).rejects.toThrow()` for rejection checks, or a `getError` wrapper utility that converts a non-throw into a deliberate `NoErrorThrownError` so the test fails loudly when the expected rejection does not occur.

---

## Bad Example 1 — Feature-flag guard around checkout assertions

```typescript
test('checkout form submits successfully for eligible users', async ({ page }) => {
  await page.goto('/checkout');
  await page.getByLabel('Card number').fill('4111111111111111');
  await page.getByLabel('Expiry').fill('12/28');
  await page.getByLabel('CVV').fill('123');
  await page.getByRole('button', { name: 'Pay now' }).click();

  const isNewCheckout = await page.evaluate(() => window.__featureFlags?.newCheckout);

  if (isNewCheckout) {
    await expect(page.getByTestId('order-confirmation')).toBeVisible();
    await expect(page.getByText('Your order has been placed')).toBeVisible();
  }
});
```

**What's wrong:** If the `newCheckout` feature flag is off (or the property is absent), the `if` branch is never entered and both `expect` calls are silently skipped — the test exits green without verifying anything. A regression that removes the confirmation screen entirely would not be caught.

---

## Bad Example 2 — Swallowing an API error inside `.catch()`

```typescript
test('displays error banner when payment API returns 402', async ({ page }) => {
  await page.route('**/api/payments', (route) =>
    route.fulfill({ status: 402, body: JSON.stringify({ message: 'Insufficient funds' }) })
  );

  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Pay now' }).click();

  const responsePromise = page.waitForResponse('**/api/payments');

  await responsePromise
    .then((res) => res.json())
    .catch((error) => {
      expect(error).toMatchObject({ message: 'Insufficient funds' });
      expect(page.getByRole('alert')).toBeVisible();
    });
});
```

**What's wrong:** If `waitForResponse` resolves successfully (which it will — the route is fulfilled), the `.catch()` callback is never invoked. Both `expect` calls are silently dropped and the test passes without ever checking that the error banner renders.

---

## Good Example 1 — Unconditional assertions with per-environment setup

```typescript
test('checkout form submits successfully', async ({ page }) => {
  // Force the flag on at the application level before navigation so the
  // test always exercises the same code path deterministically.
  await page.addInitScript(() => {
    window.__featureFlags = { ...(window.__featureFlags ?? {}), newCheckout: true };
  });

  await page.goto('/checkout');
  await page.getByLabel('Card number').fill('4111111111111111');
  await page.getByLabel('Expiry').fill('12/28');
  await page.getByLabel('CVV').fill('123');
  await page.getByRole('button', { name: 'Pay now' }).click();

  await expect(page.getByTestId('order-confirmation')).toBeVisible();
  await expect(page.getByText('Your order has been placed')).toBeVisible();
});
```

**Why this works:** The flag is seeded unconditionally before the page loads, so the assertions are always reached and the test has a single, well-defined code path. If the confirmation screen disappears the test fails loudly.

---

## Good Example 2 — Testing rejection properties with a `getError` wrapper

```typescript
class NoErrorThrownError extends Error {
  constructor() {
    super('Expected the async call to throw, but it resolved successfully.');
  }
}

async function getError<TError>(call: () => Promise<unknown>): Promise<TError> {
  try {
    await call();
    throw new NoErrorThrownError();
  } catch (error: unknown) {
    return error as TError;
  }
}

test('displays error banner when payment API returns 402', async ({ page }) => {
  await page.route('**/api/payments', (route) =>
    route.fulfill({ status: 402, body: JSON.stringify({ message: 'Insufficient funds' }) })
  );

  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Pay now' }).click();

  // Assert the UI reacts to the error — no conditional needed.
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByText('Insufficient funds')).toBeVisible();
});

// Separate unit-level test for the API client's error shape:
test('payment client surfaces statusCode on 402', async () => {
  const error = await getError<{ statusCode: number }>(async () =>
    paymentClient.charge({ amount: 5000, currency: 'USD' })
  );

  expect(error).not.toBeInstanceOf(NoErrorThrownError);
  expect(error).toHaveProperty('statusCode', 402);
});
```

**Why this works:** The UI-level Playwright test uses unconditional assertions against the rendered page; the error-shape concern is moved to a focused unit test that uses the `getError` wrapper. If the function never throws, `NoErrorThrownError` propagates out and the test fails explicitly rather than silently passing.

---

## Interview talking points

- **Gotcha question:** "We have a test that checks an error modal only when a specific API call fails. The test has been green in CI for months. How would you determine whether the test is actually providing coverage?"

- **Expected answer:** A strong senior candidate will note that a consistently green test for an error path is a red flag — it may mean the unhappy path is never actually triggered. They would add a deliberate route interception (`page.route`) to force the API failure, remove any conditional guard around the `expect`, and then introduce a negative assertion (or a `getError` wrapper) to ensure the test fails when the error does *not* occur. They might also mention using `expect.assertions(n)` patterns from Jest/Vitest as analogous context, even though Playwright does not natively support it, to demonstrate they understand the underlying problem of unverified assertion counts.

- **Common misconception:** Junior and mid-level candidates often believe the test is "safe" because it will still fail if the assertion *is* reached and the value is wrong — they miss the silent skip scenario entirely. They conflate "the assertion is correct when it runs" with "the assertion always runs," and therefore see no issue with wrapping `expect` in a conditional as a form of defensive coding.
