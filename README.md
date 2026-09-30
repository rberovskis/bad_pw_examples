# Playwright Interview Exercises — L3 Senior

A set of broken Playwright tests for use in senior-level technical interviews. Each exercise embeds one or more `eslint-plugin-playwright` anti-patterns into an otherwise realistic test. The candidate's task is to identify the issues and explain the fix.

---

## How to use

| File | Purpose |
|---|---|
| `exercise.spec.ts` | Give this to the candidate — no hints, no comments |
| `spec.md` | Interviewer reference — rule background and what to listen for |
| `*.solution.spec.ts` | Interviewer reference — annotated solution with `// ISSUE N` blocks |

---

## Single-rule exercises

Each folder isolates one rule. Good for warming up or targeting a specific topic.

### Async Correctness

| Rule | Description | Files |
|---|---|---|
| [`missing-playwright-await`](rules/senior-l3/missing-playwright-await/spec.md) | Unawaited `expect()` / `waitFor*()` — the assertion Promise is discarded and the test always passes | [exercise](rules/senior-l3/missing-playwright-await/exercise.spec.ts) |
| [`valid-expect-in-promise`](rules/senior-l3/valid-expect-in-promise/spec.md) | `expect()` inside an unawaited `.then()` chain — assertion floats free and its result is never seen by the runner | [exercise](rules/senior-l3/valid-expect-in-promise/exercise.spec.ts) |
| [`no-test-return-statement`](rules/senior-l3/no-test-return-statement/spec.md) | Returning a Promise from the test body — the runner discards it before it settles | [exercise](rules/senior-l3/no-test-return-statement/exercise.spec.ts) |

### Assertion Correctness

| Rule | Description | Files |
|---|---|---|
| [`prefer-web-first-assertions`](rules/senior-l3/prefer-web-first-assertions/spec.md) | Point-in-time snapshot calls (`textContent()`, `isVisible()`) instead of auto-retrying `expect` matchers | [exercise](rules/senior-l3/prefer-web-first-assertions/exercise.spec.ts) |
| [`no-conditional-expect`](rules/senior-l3/no-conditional-expect/spec.md) | `expect` inside an `if` block — silently skipped when the condition is false, producing false-greens | [exercise](rules/senior-l3/no-conditional-expect/exercise.spec.ts) |
| [`require-soft-assertions`](rules/senior-l3/require-soft-assertions/spec.md) | Hard `expect()` on multiple independent fields — first failure masks all subsequent ones | [exercise](rules/senior-l3/require-soft-assertions/exercise.spec.ts) |
| [`prefer-ending-with-an-expect`](rules/senior-l3/prefer-ending-with-an-expect/spec.md) | Test ends with an action, not an assertion — no verifiable outcome | [exercise](rules/senior-l3/prefer-ending-with-an-expect/exercise.spec.ts) |

### Network Timing & Navigation

| Rule | Description | Files |
|---|---|---|
| [`no-networkidle`](rules/senior-l3/no-networkidle/spec.md) | `waitForLoadState('networkidle')` — timing heuristic that breaks on WebSockets, beacons, and polling | [exercise](rules/senior-l3/no-networkidle/exercise.spec.ts) |
| [`no-wait-for-navigation`](rules/senior-l3/no-wait-for-navigation/spec.md) | `waitForNavigation()` called after the triggering click — race condition, missed on fast servers | [exercise](rules/senior-l3/no-wait-for-navigation/exercise.spec.ts) |

### Flakiness & Delays

| Rule | Description | Files |
|---|---|---|
| [`no-wait-for-timeout`](rules/senior-l3/no-wait-for-timeout/spec.md) | `waitForTimeout` fixed sleep — slower than necessary and still racy on slow machines | [exercise](rules/senior-l3/no-wait-for-timeout/exercise.spec.ts) |
| [`no-wait-for-selector`](rules/senior-l3/no-wait-for-selector/spec.md) | Legacy `waitForSelector` returning an `ElementHandle` — stale-element errors on dynamic content | [exercise](rules/senior-l3/no-wait-for-selector/exercise.spec.ts) |

### Timeout Management

| Rule | Description | Files |
|---|---|---|
| [`no-action-timeout`](rules/senior-l3/no-action-timeout/spec.md) | Per-call `{ timeout: N }` overrides — fragments the budget, hides slow interactions | [exercise](rules/senior-l3/no-action-timeout/exercise.spec.ts) |
| [`require-to-pass-timeout`](rules/senior-l3/require-to-pass-timeout/spec.md) | `toPass()` without `timeout` — defaults to 0, retries indefinitely until the global test timeout kills it | [exercise](rules/senior-l3/require-to-pass-timeout/exercise.spec.ts) |

### Context Boundaries

| Rule | Description | Files |
|---|---|---|
| [`no-unsafe-references`](rules/senior-l3/no-unsafe-references/spec.md) | Closure variables referenced inside `page.evaluate()` / `addInitScript()` — Node.js scope is invisible to the browser context | [exercise](rules/senior-l3/no-unsafe-references/exercise.spec.ts) |

---

## Multi-rule exercises

Full journey tests with 4–10 embedded issues across several rules. Better for assessing how a candidate prioritises and communicates findings under time pressure.

| Scenario | Issues | Exercise | Solution |
|---|---|---|---|
| [Shop → Cart → Checkout](rules/senior-l3/_multi/shop-to-checkout.spec.ts) | 10 issues across 8 rules | [exercise](rules/senior-l3/_multi/shop-to-checkout.spec.ts) | [solution](rules/senior-l3/_multi/shop-to-checkout.solution.spec.ts) |
| [Search & Product detail](rules/senior-l3/_multi/search-and-product.spec.ts) | Multiple issues | [exercise](rules/senior-l3/_multi/search-and-product.spec.ts) | [solution](rules/senior-l3/_multi/search-and-product.solution.spec.ts) |
| [Admin dashboard](rules/senior-l3/_multi/admin-dashboard.spec.ts) | Multiple issues | [exercise](rules/senior-l3/_multi/admin-dashboard.spec.ts) | [solution](rules/senior-l3/_multi/admin-dashboard.solution.spec.ts) |
| [User registration](rules/senior-l3/_multi/user-registration.spec.ts) | Multiple issues | [exercise](rules/senior-l3/_multi/user-registration.spec.ts) | [solution](rules/senior-l3/_multi/user-registration.solution.spec.ts) |
| [Payment flow](rules/senior-l3/_multi/payment-flow.spec.ts) | Multiple issues | [exercise](rules/senior-l3/_multi/payment-flow.spec.ts) | [solution](rules/senior-l3/_multi/payment-flow.solution.spec.ts) |
