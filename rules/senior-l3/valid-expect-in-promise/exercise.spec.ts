import { test, expect } from '@playwright/test';

// Intercepts the POST /orders response and asserts the confirmation number
// is rendered correctly. Route is set up before navigation so the mock is
// in place before any requests fire.
test('should display order confirmation number after successful checkout', ({ page }) => {
  page.route('**/api/orders', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ orderId: 'ORD-7731', status: 'confirmed' }),
    });
  });

  page.goto('/checkout').then(async () => {
    await page.getByLabel('Card number').fill('4111111111111111');
    await page.getByLabel('Expiry').fill('12/29');
    await page.getByLabel('CVV').fill('123');
    await page.getByRole('button', { name: 'Place order' }).click();
  });

  page.waitForResponse('**/api/orders').then((response) => {
    expect(response.status()).toBe(201);
    expect(page.getByTestId('confirmation-number')).toHaveText('ORD-7731');
  });
});
