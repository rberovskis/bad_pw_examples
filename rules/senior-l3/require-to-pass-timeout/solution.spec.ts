import { test, expect } from '@playwright/test';

test('should show shipped status once the fulfilment pipeline processes the order', async ({ page, request }) => {
  await page.goto('/orders/ORD-8821');
  await page.getByRole('button', { name: 'Place Order' }).click();

  // ISSUE: `toPass()` is called with only `intervals` and no `timeout`.
  // Unlike standard matchers, `toPass()` does NOT inherit `expect.timeout`
  // from playwright.config.ts — its own default is 0, meaning it retries
  // indefinitely. If the backend never returns 'shipped', this consumes the
  // entire test budget before the runner kills it with a misleading timeout.
  // `intervals` only controls the delay between attempts, not the total window.
  //
  // Fix: always supply an explicit `timeout` alongside `intervals`.
  //
  //   }).toPass({ timeout: 15_000, intervals: [500, 1_000, 2_000, 4_000] });
  await expect(async () => {
    const res = await request.get('/api/orders/ORD-8821/status');
    const body = await res.json();
    expect(body.status).toBe('shipped');
  }).toPass({ intervals: [500, 1_000, 2_000, 4_000] });

  await expect(page.getByTestId('order-status-badge')).toHaveText('Shipped');
});
