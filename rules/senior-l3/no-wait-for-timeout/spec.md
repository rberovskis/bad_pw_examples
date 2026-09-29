# no-wait-for-timeout

**Tier:** L3 — Senior  
**Category:** Flakiness & Hard-coded Delays  
**Rule:** `no-wait-for-timeout`

## Why this rule exists

`page.waitForTimeout` is a dumb sleep: it pauses the test for a fixed wall-clock duration with no awareness of browser state, network conditions, or CI machine speed, making tests both slower than necessary and still prone to failure when the system is slower than expected. Playwright's execution model is built around auto-retrying, event-driven assertions — `waitForSelector`, `waitForResponse`, `waitForURL`, etc. — that resolve the moment the condition is true and throw a meaningful error when the timeout elapses. Hard-coded delays hide the real signal that the test should be waiting for, mask the root cause of flakiness instead of fixing it, and inflate suite duration linearly with every added sleep across a large test suite.

## What interviewers look for

- The candidate can name specific Playwright APIs that replace `waitForTimeout` and explain *which* signal each one waits on (DOM readiness, network idle, URL change, JS expression, element visibility).
- The candidate understands that `waitForTimeout` is a smell pointing to a missing explicit wait, and can diagnose what the underlying race condition actually is rather than just substituting a different API mechanically.
- The candidate can articulate the trade-off between correctness and speed: a fixed delay that is "long enough" today becomes a bottleneck over time, while an event-driven wait exits as soon as the condition is met, so it is both faster on average and more reliable under load.

---

## Bad Example 1 — Waiting for a spinner to disappear after form submit

```typescript
test('submitting the login form navigates to the dashboard', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('s3cr3t!');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Give the server time to respond and the spinner to clear
  await page.waitForTimeout(3000);

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
```

**What's wrong:** The 3-second sleep is a guess at how long the network round-trip and redirect take; on a slow CI runner it will still race, and on a fast machine it wastes 3 seconds every run. The test should wait for an observable browser signal — the URL change or the heading becoming visible — both of which Playwright already retries automatically.

---

## Bad Example 2 — Polling for a toast notification after an API action

```typescript
test('deleting a record shows a success toast', async ({ page }) => {
  await page.goto('/settings/users');

  await page.getByRole('row', { name: 'Jane Doe' }).getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Confirm' }).click();

  // Toast takes a moment to appear
  await page.waitForTimeout(1500);

  const toast = page.getByRole('alert');
  await expect(toast).toHaveText('User deleted successfully');
});
```

**What's wrong:** The 1.5-second delay is an arbitrary buffer that races against animation timing and server latency simultaneously; if either is slower than expected the assertion still fails. `expect(toast).toHaveText(...)` already retries on its own — removing the sleep entirely lets Playwright wait the right amount of time automatically.

---

## Good Example 1 — Wait for URL change after login

```typescript
test('submitting the login form navigates to the dashboard', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('s3cr3t!');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForURL('/dashboard');

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
```

**Why this works:** `waitForURL` resolves the instant the browser navigates to the target URL and throws a descriptive error if it never does, so there is no wasted time on fast machines and no flakiness on slow ones. The subsequent visibility assertion adds a second layer of confidence about page readiness.

---

## Good Example 2 — Wait for the network response that triggers the toast

```typescript
test('deleting a record shows a success toast', async ({ page }) => {
  await page.goto('/settings/users');

  const deleteResponse = page.waitForResponse(
    (resp) => resp.url().includes('/api/users/') && resp.request().method() === 'DELETE'
  );

  await page.getByRole('row', { name: 'Jane Doe' }).getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Confirm' }).click();

  await deleteResponse;

  await expect(page.getByRole('alert')).toHaveText('User deleted successfully');
});
```

**Why this works:** By awaiting the specific network response that drives the UI update, the test synchronises on the real signal rather than a guess; the toast assertion then benefits from Playwright's built-in auto-retry, making the test as fast as the server and as resilient as the event it actually depends on.

---

## Interview talking points

- **Gotcha question:** "Our app has a CSS animation that delays an element becoming interactive by 400 ms — `waitForTimeout(500)` makes the test pass reliably. Isn't that a legitimate use?"
- **Expected answer:** A strong candidate will push back on the framing: the correct fix is to wait for the element to be *enabled* or *stable* using `waitFor({ state: 'stable' })` or `toBeEnabled()`, which polls until the animation settles. If the app intentionally gates interactivity behind an animation, the test should assert on that observable state — not guess at its duration. They might also note that `actionability checks` in Playwright already wait for elements to stop moving before clicking, so the sleep may not even be doing what the author thinks.
- **Common misconception:** Junior and mid-level candidates often treat `waitForTimeout` as a safe fallback for "I'm not sure what to wait for," not realising that Playwright's locator-based assertions (`toBeVisible`, `toHaveText`, `toBeEnabled`) all auto-retry for up to the configured timeout by default — meaning the explicit sleep is redundant in the best case and still racy in the worst.
