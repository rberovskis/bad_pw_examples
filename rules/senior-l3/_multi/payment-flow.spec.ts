import { test, expect } from '@playwright/test';

// Full end-to-end payment flow covering cart → checkout → order confirmation.
// Timeouts on individual steps were tuned after the staging payment gateway
// started spiking under load — they give each interaction enough room without
// blowing the overall test budget.
test('should complete a purchase and display the order confirmation', async ({ page }) => {
  await page.goto('/cart');

  await page.getByRole('button', { name: 'Proceed to Checkout' }).click({ timeout: 10_000 });

  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();

  await page.getByLabel('Cardholder name').fill('Jane Smith', { timeout: 5_000 });
  await page.getByLabel('Card number').fill('4111111111111111', { timeout: 5_000 });
  await page.getByLabel('Expiry').fill('12/29', { timeout: 5_000 });
  await page.getByLabel('CVV').fill('123', { timeout: 5_000 });

  // The payment processor can be slow; give it extra room before asserting.
  await page.getByRole('button', { name: 'Place Order' }).click({ timeout: 15_000 });
  await page.waitForTimeout(2_000);

  const submitBtn = page.getByRole('button', { name: 'Place Order' });
  const isDisabled = await submitBtn.isDisabled();
  expect(isDisabled).toBe(true);

  await expect(page.getByRole('heading', { name: 'Order Confirmed' })).toBeVisible();
  await expect(page.getByTestId('order-id')).toBeVisible();
  await expect(page.getByTestId('delivery-estimate')).toBeVisible();
  await expect(page.getByTestId('confirmation-email-note')).toBeVisible();
});
