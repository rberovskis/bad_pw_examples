import { test, expect } from '@playwright/test';

test('should display order confirmation number after successful checkout', async ({ page }) => {
  await page.route('**/api/orders', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ orderId: 'ORD-7731', status: 'confirmed' }),
    });
  });

  await page.goto('/checkout');
  await page.getByLabel('Card number').fill('4111111111111111');
  await page.getByLabel('Expiry').fill('12/29');
  await page.getByLabel('CVV').fill('123');

  const [response] = await Promise.all([
    page.waitForResponse('**/api/orders'),
    page.getByRole('button', { name: 'Place order' }).click(),
  ]);

  expect(response.status()).toBe(201);
  await expect(page.getByTestId('confirmation-number')).toHaveText('ORD-7731');
});
