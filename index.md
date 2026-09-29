# Playwright SDET Interview Examples

ESLint rule–based interview specs for Playwright. Each spec contains realistic bad/good code examples and talking points, organized by difficulty tier.

## Structure

```
rules/
  senior-l3/               ← 15 rules · L3 Senior tier
    index.html             ← rule index (HTML cheat sheet for interviewers)
    <rule-name>/
      exercise.spec.ts     ← candidate-facing code to review
      reference.html       ← interviewer cheat sheet (bad/good examples + talking points)
      spec.md              ← raw spec (markdown source)
```

## Tiers

| Tier | Rules | Status |
|---|---|---|
| [L3 — Senior](./rules/senior-l3/index.html) | 15 rules | Done |
| L2 — Mid | 30 rules | Pending |
| L1 — Junior | 22 rules | Pending |

## L3 Senior rules at a glance

| Category | Rules |
|---|---|
| Async Correctness | `missing-playwright-await` · `no-test-return-statement` · `valid-expect-in-promise` |
| Timeout Management | `no-action-timeout` · `require-to-pass-timeout` |
| Network Timing | `no-networkidle` · `no-wait-for-navigation` |
| Locator Strategy & Retry Logic | `no-wait-for-selector` |
| Flakiness & Hard-coded Delays | `no-wait-for-timeout` |
| Assertion Correctness | `no-conditional-expect` · `prefer-ending-with-an-expect` · `prefer-web-first-assertions` |
| Assertion Strategy | `require-soft-assertions` |
| Browser/Node Context Boundary | `no-unsafe-references` |
