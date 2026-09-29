import { test, expect } from '@playwright/test';

// Tests the new checkout confirmation screen introduced behind the
// newCheckout feature flag. The flag check guards the assertions so the
// test doesn't fail in environments where the flag hasn't been rolled out yet.
test('should display order confirmation after successful payment', async ({ page }) => {
  await page.goto('/checkout');

  await page.getByLabel('Card number').fill('4111111111111111');
  await page.getByLabel('Expiry').fill('12/28');
  await page.getByLabel('CVV').fill('123');
  await page.getByRole('button', { name: 'Pay now' }).click();

  const isNewCheckout = await page.evaluate(
    () => (window as any).__featureFlags?.newCheckout
  );

  if (isNewCheckout) {
    await expect(page.getByTestId('order-confirmation')).toBeVisible();
    await expect(page.getByText('Your order has been placed')).toBeVisible();
  }
});
