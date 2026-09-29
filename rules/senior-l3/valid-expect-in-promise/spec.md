# valid-expect-in-promise

**Tier:** L3 — Senior  
**Category:** Promise Lifecycle & Async Correctness  
**Rule:** `valid-expect-in-promise`

## Why this rule exists

Playwright's test runner tracks assertions by awaiting the promises they return; if a `.then()` callback containing an `expect()` is neither awaited nor returned from the test function, the test body finishes before the assertion ever executes. This produces a false-green: the test passes even when the asserted condition is false, because the runner never sees the rejection. Chained promises that are stored in variables but then branched into new `.then()` calls without re-assigning or returning the chain suffer the same fate — the final promise that actually carries the assertion floats free and its result is discarded.

## What interviewers look for

- The candidate can explain that unawaited `.then()` callbacks with expectations silently swallow assertion failures because the test runner completes before the microtask resolves.
- The candidate understands that returning a promise is a valid alternative to `await` — the runner will wait on anything the test function returns — and knows when each style is appropriate.
- The candidate recognizes that chaining additional `.then()` calls off a previously-resolved intermediate variable creates a new, dangling promise unless the variable is reassigned and the final value is returned.

---

## Bad Example 1 — Floating intercept assertion

```typescript
test('API response contains correct user data after login', ({ page }) => {
  page.route('/api/auth/login', async (route) => {
    await route.fulfill({ json: { userId: 42, role: 'admin' } })
  })

  page.goto('/login').then(async () => {
    await page.fill('[data-testid="email"]', 'admin@example.com')
    await page.fill('[data-testid="password"]', 'hunter2')
    await page.click('[data-testid="submit"]')
  })

  page.waitForResponse('/api/auth/login').then((response) => {
    expect(response.status()).toBe(200)
    expect(response.json()).resolves.toHaveProperty('role', 'admin')
  })
})
```

**What's wrong:** Neither `.then()` chain is awaited or returned, so both promises detach from the test lifecycle. The assertions inside the second `.then()` will never be evaluated by the test runner, meaning status code mismatches or missing response fields will not cause the test to fail.

---

## Bad Example 2 — Broken reassignment chain

```typescript
test('form submission triggers confirmation toast', ({ page }) => {
  const navPromise = page.goto('/settings/profile').then(async () => {
    await page.fill('[data-testid="display-name"]', 'Jane Doe')
    await page.click('[data-testid="save-button"]')
  })

  navPromise.then(async () => {
    const toast = page.locator('[data-testid="toast"]')
    await expect(toast).toBeVisible()
    await expect(toast).toContainText('Profile updated')
  })

  return navPromise
})
```

**What's wrong:** A second `.then()` is chained off `navPromise` but assigned to nothing — it creates a new, separate promise that is never returned. The test returns `navPromise`, which resolves before the second `.then()` runs, so the visibility and text assertions execute after the runner has already marked the test as passed.

---

## Good Example 1 — Full chain awaited with async/await

```typescript
test('API response contains correct user data after login', async ({ page }) => {
  await page.route('/api/auth/login', async (route) => {
    await route.fulfill({ json: { userId: 42, role: 'admin' } })
  })

  await page.goto('/login')
  await page.fill('[data-testid="email"]', 'admin@example.com')
  await page.fill('[data-testid="password"]', 'hunter2')

  const [response] = await Promise.all([
    page.waitForResponse('/api/auth/login'),
    page.click('[data-testid="submit"]'),
  ])

  expect(response.status()).toBe(200)
  await expect(response.json()).resolves.toHaveProperty('role', 'admin')
})
```

**Why this works:** Every asynchronous operation is awaited directly, so assertions run inside the same synchronous flow that the test runner controls. There are no floating callbacks; any assertion failure immediately rejects the async function and is surfaced as a test failure.

---

## Good Example 2 — Reassigned chain returned explicitly

```typescript
test('form submission triggers confirmation toast', ({ page }) => {
  let chain = page.goto('/settings/profile').then(async () => {
    await page.fill('[data-testid="display-name"]', 'Jane Doe')
    await page.click('[data-testid="save-button"]')
  })

  chain = chain.then(async () => {
    const toast = page.locator('[data-testid="toast"]')
    await expect(toast).toBeVisible()
    await expect(toast).toContainText('Profile updated')
  })

  return chain
})
```

**Why this works:** Each `.then()` is immediately reassigned back to `chain`, so the variable always holds the tail of the promise sequence. Returning `chain` at the end hands the fully-linked promise to the test runner, which waits on it and correctly captures any assertion failures anywhere in the chain.

---

## Interview talking points

- **Gotcha question:** "This test never fails even though the element doesn't exist — why?" (Show the candidate a test with `page.locator(...).then(el => expect(el).toBeVisible())` that is neither awaited nor returned.)
- **Expected answer:** A strong senior answer identifies that the `.then()` callback runs as a microtask after the test function has already returned `undefined`. The runner sees no promise to wait on, marks the test green, and the rejection from `toBeVisible()` is an unhandled promise rejection that may not even surface in the console depending on Node.js version and runner configuration. The fix is either `return` the promise or convert the test to `async` and `await` it.
- **Common misconception:** Junior and mid-level candidates often believe that as long as the code inside the `.then()` uses `await`, the outer promise is automatically tracked by the test runner. They conflate "the inner async work is sequential" with "the outer promise is anchored to the test." In reality, the inner `await` only serializes work within that callback; it does nothing to attach the resulting promise to the test runner unless the callback's return value is awaited or returned at the test level.
