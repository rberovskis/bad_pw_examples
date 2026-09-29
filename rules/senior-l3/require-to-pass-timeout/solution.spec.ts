import { test, expect } from '@playwright/test';

test('should show shipped status once the fulfilment pipeline processes the order', async ({ page, request }) => {
  await page.goto('/orders/ORD-8821');
  await page.getByRole('button', { name: 'Place Order' }).click();

  await expect(async () => {
    const res = await request.get('/api/orders/ORD-8821/status');
    const body = await res.json();
    expect(body.status).toBe('shipped');
  }).toPass({ timeout: 15_000, intervals: [500, 1_000, 2_000, 4_000] });

  await expect(page.getByTestId('order-status-badge')).toHaveText('Shipped');
});
