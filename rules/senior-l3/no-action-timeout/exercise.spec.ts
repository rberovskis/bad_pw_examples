import { test, expect } from '@playwright/test';

// End-to-end checkout with a saved card. Individual timeouts were introduced
// after the payment gateway started responding slowly in staging; they prevent
// a single sluggish step from failing the whole suite prematurely.
test('should complete checkout with a saved card', async ({ page }) => {
  await page.goto('/cart');

  await page.getByRole('button', { name: 'Proceed to Checkout' }).click({ timeout: 10_000 });

  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();

  await page.getByLabel('Cardholder name').fill('Jane Smith', { timeout: 5_000 });
  await page.getByLabel('Card number').fill('4111111111111111', { timeout: 5_000 });
  await page.getByLabel('Expiry').fill('12/29', { timeout: 5_000 });
  await page.getByLabel('CVV').fill('123', { timeout: 5_000 });

  // Payment step can take up to 15 s on the staging gateway.
  await page.getByRole('button', { name: 'Place Order' }).click({ timeout: 15_000 });

  await expect(page.getByRole('heading', { name: 'Order Confirmed' })).toBeVisible();
});
