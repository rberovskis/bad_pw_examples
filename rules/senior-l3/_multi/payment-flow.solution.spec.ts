import { test, expect } from '@playwright/test';

test('should complete a purchase and display the order confirmation', async ({ page }) => {
  await page.goto('/cart');

  await page.getByRole('button', { name: 'Proceed to Checkout' }).click();

  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();

  await page.getByLabel('Cardholder name').fill('Jane Smith');
  await page.getByLabel('Card number').fill('4111111111111111');
  await page.getByLabel('Expiry').fill('12/29');
  await page.getByLabel('CVV').fill('123');

  const [orderResponse] = await Promise.all([
    page.waitForResponse(
      (resp) => resp.url().includes('/api/orders') && resp.status() === 201,
    ),
    page.getByRole('button', { name: 'Place Order' }).click(),
  ]);

  expect(orderResponse.status()).toBe(201);

  await expect(page.getByRole('button', { name: 'Place Order' })).toBeDisabled();

  await expect(page.getByRole('heading', { name: 'Order Confirmed' })).toBeVisible();
  await expect.soft(page.getByTestId('order-id')).toBeVisible();
  await expect.soft(page.getByTestId('delivery-estimate')).toBeVisible();
  await expect.soft(page.getByTestId('confirmation-email-note')).toBeVisible();
});
