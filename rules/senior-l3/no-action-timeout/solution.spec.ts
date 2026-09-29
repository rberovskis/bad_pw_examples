import { test, expect } from '@playwright/test';

// If the payment gateway is slow across all environments, raise
// use.actionTimeout in playwright.config.ts rather than patching it per call.
test('should complete checkout with a saved card', async ({ page }) => {
  await page.goto('/cart');

  await page.getByRole('button', { name: 'Proceed to Checkout' }).click();

  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();

  await page.getByLabel('Cardholder name').fill('Jane Smith');
  await page.getByLabel('Card number').fill('4111111111111111');
  await page.getByLabel('Expiry').fill('12/29');
  await page.getByLabel('CVV').fill('123');

  await page.getByRole('button', { name: 'Place Order' }).click();

  await expect(page.getByRole('heading', { name: 'Order Confirmed' })).toBeVisible();
});
