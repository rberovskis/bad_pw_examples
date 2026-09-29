import { test, expect } from '@playwright/test';

test('should display order confirmation after successful payment', async ({ page }) => {
  await page.goto('/checkout');

  await page.getByLabel('Card number').fill('4111111111111111');
  await page.getByLabel('Expiry').fill('12/28');
  await page.getByLabel('CVV').fill('123');
  await page.getByRole('button', { name: 'Pay now' }).click();

  const isNewCheckout = await page.evaluate(
    () => (window as any).__featureFlags?.newCheckout,
  );

  // ISSUE: both `expect` calls are inside an `if` block that is skipped
  // whenever the feature flag is off (or missing). Playwright marks a test
  // as passed when the test function returns without throwing — so zero
  // executed assertions still produces a green result. A regression that
  // removes the confirmation screen is invisible in flag-off environments.
  //
  // Fix: seed the flag unconditionally in `addInitScript` before navigation
  // so the test always exercises a single code path and the assertions are
  // always reached.
  //
  //   await page.addInitScript(() => {
  //     (window as any).__featureFlags = { newCheckout: true };
  //   });
  //   // ... fill and click ...
  //   await expect(page.getByTestId('order-confirmation')).toBeVisible();
  //   await expect(page.getByText('Your order has been placed')).toBeVisible();
  if (isNewCheckout) {
    await expect(page.getByTestId('order-confirmation')).toBeVisible();
    await expect(page.getByText('Your order has been placed')).toBeVisible();
  }
});
