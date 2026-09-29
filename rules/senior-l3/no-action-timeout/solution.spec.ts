import { test, expect } from '@playwright/test';

test('should complete checkout with a saved card', async ({ page }) => {
  await page.goto('/cart');

  // ISSUE: per-action timeout overrides fragment the timeout budget across the
  // suite. No single config value describes the test's real upper bound, and
  // the inflated 15 000 ms on Place Order signals a slow API being tolerated
  // rather than diagnosed. `{ timeout: 0 }` would be even worse — it removes
  // the circuit breaker entirely, causing an infinite hang on a stuck element.
  //
  // Fix: delete all per-call timeouts and rely on the suite-wide `actionTimeout`
  // set in playwright.config.ts. If the payment step is genuinely slow in all
  // environments, raise that single config value — one change, all tests benefit.
  //
  //   await page.getByRole('button', { name: 'Proceed to Checkout' }).click();
  //   await page.getByLabel('Cardholder name').fill('Jane Smith');
  //   // ... etc., no timeout options anywhere
  await page.getByRole('button', { name: 'Proceed to Checkout' }).click({ timeout: 10_000 });

  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();

  await page.getByLabel('Cardholder name').fill('Jane Smith', { timeout: 5_000 });
  await page.getByLabel('Card number').fill('4111111111111111', { timeout: 5_000 });
  await page.getByLabel('Expiry').fill('12/29', { timeout: 5_000 });
  await page.getByLabel('CVV').fill('123', { timeout: 5_000 });

  await page.getByRole('button', { name: 'Place Order' }).click({ timeout: 15_000 });

  await expect(page.getByRole('heading', { name: 'Order Confirmed' })).toBeVisible();
});
