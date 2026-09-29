import { test, expect } from '@playwright/test';

test('should display order confirmation number after successful checkout', ({ page }) => {
  page.route('**/api/orders', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ orderId: 'ORD-7731', status: 'confirmed' }),
    });
  });

  // ISSUE: both .then() chains are floating — neither is awaited nor returned
  // from the test function. The test body finishes before the microtasks run,
  // so the assertions inside them are never evaluated by the runner.
  //
  // Fix: make the test async and use await throughout, using Promise.all to
  // register the network listener before the click that triggers the request.
  //
  //   const [response] = await Promise.all([
  //     page.waitForResponse('**/api/orders'),
  //     page.getByRole('button', { name: 'Place order' }).click(),
  //   ]);
  //   expect(response.status()).toBe(201);
  //   await expect(page.getByTestId('confirmation-number')).toHaveText('ORD-7731');
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
