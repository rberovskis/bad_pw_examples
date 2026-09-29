import { test, expect } from '@playwright/test';

test('should display order confirmation after successful payment', async ({ page }) => {
  // Force the flag on before the page boots so the test always exercises
  // a single deterministic code path.
  await page.addInitScript(() => {
    (window as any).__featureFlags = {
      ...((window as any).__featureFlags ?? {}),
      newCheckout: true,
    };
  });

  await page.goto('/checkout');

  await page.getByLabel('Card number').fill('4111111111111111');
  await page.getByLabel('Expiry').fill('12/28');
  await page.getByLabel('CVV').fill('123');
  await page.getByRole('button', { name: 'Pay now' }).click();

  await expect(page.getByTestId('order-confirmation')).toBeVisible();
  await expect(page.getByText('Your order has been placed')).toBeVisible();
});
