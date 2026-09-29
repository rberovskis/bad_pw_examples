# no-wait-for-navigation

**Tier:** L3 — Senior  
**Category:** Navigation & Race Conditions  
**Rule:** `no-wait-for-navigation`

## Why this rule exists

`page.waitForNavigation()` is a legacy Playwright API that waits for a navigation event, but it must be started *before* the action that triggers navigation — creating an inherently fragile promise-race pattern. If the navigation resolves before the `await` is reached, the promise is already settled and can be missed entirely, causing the test to hang or proceed on the wrong page. Playwright's modern alternatives (`waitForURL`, `waitForLoadState`) are action-coupled and deterministic, eliminating the race condition by design.

## What interviewers look for

- The candidate understands that `waitForNavigation()` relies on timing: the promise must be created before the triggering action, and any deviation in execution order can cause a missed navigation event or a deadlock.
- The candidate can articulate why `waitForURL()` or `waitForLoadState()` are safer replacements — they assert on a concrete observable state rather than listening for a transient event.
- The candidate recognizes that the pattern is especially dangerous in CI environments where CPU throttling and network variance make the race window wider and failures less reproducible locally.

---

## Bad Example 1 — Sequential await causes missed navigation

```typescript
test('redirects to dashboard after login', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('correcthorsebatterystaple');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Navigation may already be complete before this line is reached
  await page.waitForNavigation();

  await expect(page).toHaveURL('/dashboard');
});
```

**What's wrong:** `waitForNavigation()` is called *after* the click, so if the server responds quickly and the navigation resolves before the await is registered, the event is missed and the call either hangs indefinitely or resolves on a stale state. This pattern is non-deterministic across machines.

---

## Bad Example 2 — Detached promise with concurrent action

```typescript
test('submitting the form navigates to the confirmation page', async ({ page }) => {
  await page.goto('/checkout');

  await page.getByLabel('Card number').fill('4111111111111111');
  await page.getByLabel('Expiry').fill('12/28');
  await page.getByLabel('CVV').fill('123');

  const navPromise = page.waitForNavigation({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Pay now' }).click();
  await navPromise;

  await expect(page.getByRole('heading')).toHaveText('Order confirmed');
});
```

**What's wrong:** Although the promise is created before the click, `waitUntil: 'networkidle'` combined with `waitForNavigation` is unreliable — the navigation event fires before the network settles, and additional XHR calls (analytics, beacons) on the confirmation page can cause the `networkidle` condition to never be reached, hanging the test.

---

## Good Example 1 — Assert on target URL after action

```typescript
test('redirects to dashboard after login', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('correcthorsebatterystaple');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForURL('/dashboard');

  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});
```

**Why this works:** `waitForURL()` polls the current URL against a matcher and resolves once it matches, regardless of when the navigation actually completed relative to the call. There is no race window — it is a state assertion, not an event listener.

---

## Good Example 2 — Use glob pattern for dynamic post-submit URLs

```typescript
test('submitting the form navigates to the confirmation page', async ({ page }) => {
  await page.goto('/checkout');

  await page.getByLabel('Card number').fill('4111111111111111');
  await page.getByLabel('Expiry').fill('12/28');
  await page.getByLabel('CVV').fill('123');
  await page.getByRole('button', { name: 'Pay now' }).click();

  // Order ID in URL is dynamic; glob pattern handles it cleanly
  await page.waitForURL('/orders/*/confirmation');

  await expect(page.getByRole('heading')).toHaveText('Order confirmed');
});
```

**Why this works:** The glob pattern in `waitForURL()` accommodates dynamic URL segments like order IDs without resorting to regex complexity, and the method is inherently race-safe — it only resolves when the observable URL state matches, making it reliable even under high server load or slow CI runners.

---

## Interview talking points

- **Gotcha question:** "The Playwright docs show an example using `Promise.all([page.waitForNavigation(), page.click(...)])` — isn't that safe? Why does the rule still flag it?"
- **Expected answer:** A strong candidate explains that while `Promise.all` does eliminate the most obvious race by registering the listener before the click fires, `waitForNavigation()` is still fundamentally event-driven and can misbehave with redirects (it resolves on the *first* navigation event, not the final destination), SPAs that manipulate `history.pushState` without a real navigation, or pages that do client-side redirects. `waitForURL()` is unambiguously correct because it asserts the end state, not an intermediate event.
- **Common misconception:** Junior and mid-level candidates often believe that wrapping both calls in `Promise.all` fully solves the timing problem and see the rule as overly strict. They miss that `waitForNavigation()` fires on the first `load`/`commit` event and does not guarantee the test has landed on the *intended* URL — a server-side redirect chain, for example, will cause it to resolve on the intermediate URL rather than the final destination.
