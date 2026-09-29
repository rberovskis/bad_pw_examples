import { test, expect } from '@playwright/test';

// Full end-to-end payment flow covering cart → checkout → order confirmation.
// Timeouts on individual steps were tuned after the staging payment gateway
// started spiking under load — they give each interaction enough room without
// blowing the overall test budget.
test('should complete a purchase and display the order confirmation', async ({ page }) => {
  await page.goto('/cart');

  // ISSUE 1 (no-action-timeout): per-action timeouts scatter the budget across
  // the suite and mask slow elements instead of surfacing them. The comment
  // above makes this sound intentional — but the correct fix is a single
  // `actionTimeout` in playwright.config.ts, not per-call overrides.
  //
  //   Fix: remove all { timeout } options below and set a global config value.
  await page.getByRole('button', { name: 'Proceed to Checkout' }).click({ timeout: 10_000 });

  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();

  await page.getByLabel('Cardholder name').fill('Jane Smith', { timeout: 5_000 });
  await page.getByLabel('Card number').fill('4111111111111111', { timeout: 5_000 });
  await page.getByLabel('Expiry').fill('12/29', { timeout: 5_000 });
  await page.getByLabel('CVV').fill('123', { timeout: 5_000 });

  // ISSUE 1 continued: { timeout: 15_000 } on a single call gives no safety
  // net — it only delays failure, and the bloated value leaks into reviewers'
  // perception of acceptable latency.
  await page.getByRole('button', { name: 'Place Order' }).click({ timeout: 15_000 });

  // ISSUE 2 (no-wait-for-timeout): this is a blind sleep with no knowledge of
  // whether the POST /orders response has arrived. On a fast CI box it races;
  // on a slow one it blocks for 2 s every single run. The heading assertion
  // below already auto-retries, so the sleep adds only flakiness.
  //
  //   Fix: replace with a targeted waitForResponse registered before the click.
  //
  //   const orderResponse = page.waitForResponse(
  //     (resp) => resp.url().includes('/api/orders') && resp.status() === 201,
  //   );
  //   await page.getByRole('button', { name: 'Place Order' }).click();
  //   await orderResponse;
  await page.waitForTimeout(2_000);

  // ISSUE 3 (prefer-web-first-assertions): `isDisabled()` is a point-in-time
  // DOM snapshot — no retry loop. If the button hasn't disabled yet when this
  // line executes, the assertion fails transiently. Use `toBeDisabled()` instead,
  // which polls until the condition is true or the timeout expires.
  //
  //   Fix: await expect(submitBtn).toBeDisabled();
  const submitBtn = page.getByRole('button', { name: 'Place Order' });
  const isDisabled = await submitBtn.isDisabled();
  expect(isDisabled).toBe(true);

  // ISSUE 4 (require-soft-assertions): four independent confirmation-screen
  // fields checked with hard `expect()`. A single missing test-id fails the
  // whole run and hides the status of the remaining three.
  //
  //   Fix: use expect.soft() for all four so every field's state is reported
  //   in one run.
  //
  //   await expect.soft(page.getByRole('heading', { name: 'Order Confirmed' })).toBeVisible();
  //   await expect.soft(page.getByTestId('order-id')).toBeVisible();
  //   await expect.soft(page.getByTestId('delivery-estimate')).toBeVisible();
  //   await expect.soft(page.getByTestId('confirmation-email-note')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Order Confirmed' })).toBeVisible();
  await expect(page.getByTestId('order-id')).toBeVisible();
  await expect(page.getByTestId('delivery-estimate')).toBeVisible();
  await expect(page.getByTestId('confirmation-email-note')).toBeVisible();
});
