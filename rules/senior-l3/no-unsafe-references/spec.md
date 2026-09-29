# no-unsafe-references

**Tier:** L3 — Senior  
**Category:** Browser/Node Context Boundary  
**Rule:** `no-unsafe-references`

## Why this rule exists

`page.evaluate()` and `page.addInitScript()` execute their callback inside the browser's JavaScript engine, which is a completely separate V8 context from the Node.js process running your test. Variables captured via closure in the parent scope are not automatically serialized and transferred — the browser context simply has no reference to them, so accessing them silently yields `undefined` or throws a ReferenceError at runtime. The only supported way to pass data across this context boundary is through Playwright's explicit argument channel, which serializes values (via structured clone) and injects them as parameters into the browser-side function.

## What interviewers look for

- The candidate understands the **two-context model**: Node.js test process vs. browser page, and that closures do not cross that boundary regardless of how the code reads syntactically.
- The candidate can explain **why the failure is silent** — the code often runs without throwing because `undefined` arithmetic or comparisons don't always crash, making bugs hard to diagnose.
- The candidate knows the **serialization constraint**: only structured-cloneable values (plain objects, arrays, primitives) can be passed as arguments, so DOM nodes, functions, class instances with methods, etc., cannot cross the boundary even with the correct argument-passing pattern.

---

## Bad Example 1 — Token injected into localStorage via closure

```typescript
test('persists auth token across page reload', async ({ page }) => {
  const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'
  const storageKey = 'auth_token'

  await page.goto('/login')
  await page.addInitScript(() => {
    // Intends to seed localStorage before the app boots
    localStorage.setItem(storageKey, authToken)
  })

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})
```

**What's wrong:** `storageKey` and `authToken` are Node.js-scope variables captured by closure. Inside the browser context, both resolve to `undefined`, so `localStorage.setItem('undefined', 'undefined')` is called — the app never receives a valid token and the test fails or produces a false negative with no obvious error message.

---

## Bad Example 2 — Feature flag object read inside evaluate

```typescript
test('renders premium features for paid plan', async ({ page }) => {
  const planConfig = { tier: 'premium', maxSeats: 50, analyticsEnabled: true }

  await page.goto('/dashboard')

  const flagValue = await page.evaluate(() => {
    // Checks whether the app applied the correct plan configuration
    return window.__APP_CONFIG__.tier === planConfig.tier
  })

  expect(flagValue).toBe(true)
})
```

**What's wrong:** `planConfig` lives in the Node.js process. Inside `page.evaluate`, it is not in scope — the browser engine has no closure over Node.js variables — so `planConfig` is a `ReferenceError` at runtime. The comparison never executes, and the test throws an unhandled error rather than surfacing a useful assertion failure.

---

## Good Example 1 — Token passed as argument to addInitScript

```typescript
test('persists auth token across page reload', async ({ page }) => {
  const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'
  const storageKey = 'auth_token'

  await page.goto('/login')
  await page.addInitScript(
    ([key, token]) => {
      localStorage.setItem(key, token)
    },
    [storageKey, authToken]
  )

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})
```

**Why this works:** `storageKey` and `authToken` are passed as the second argument to `addInitScript`, which Playwright serializes and delivers to the browser context as destructured parameters. The browser-side function receives real string values and `localStorage.setItem` behaves correctly.

---

## Good Example 2 — Config object passed as argument to evaluate

```typescript
test('renders premium features for paid plan', async ({ page }) => {
  const planConfig = { tier: 'premium', maxSeats: 50, analyticsEnabled: true }

  await page.goto('/dashboard')

  const flagValue = await page.evaluate((config) => {
    return window.__APP_CONFIG__.tier === config.tier
  }, planConfig)

  expect(flagValue).toBe(true)
})
```

**Why this works:** `planConfig` is passed as the second argument to `page.evaluate`, structured-cloned into the browser context, and received as the `config` parameter. The browser-side function has a genuine in-scope reference to the data it needs, making the comparison reliable.

---

## Interview talking points

- **Gotcha question:** "The closure variable is a plain string constant defined at module scope. Why would Playwright still fail to see it?"
- **Expected answer:** A strong candidate explains that it doesn't matter how the variable is declared (const, module scope, simple primitive) — the boundary is between two separate V8 isolates. The Node.js runtime's memory heap is inaccessible from the browser page's heap. Closures work within a single V8 context; they do not serialize across process or isolate boundaries. The only transport is Playwright's structured-clone channel, which requires explicit argument passing.
- **Common misconception:** Junior and mid-level candidates often assume that because the callback is written inline in the test file, it shares scope with the surrounding test code — similar to how a regular JS closure works. They don't realize that Playwright serializes the function to a string, ships it over CDP (Chrome DevTools Protocol), and re-evaluates it in the browser, where the original lexical scope no longer exists.
