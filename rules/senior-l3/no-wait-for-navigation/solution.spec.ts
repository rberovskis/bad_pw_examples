import { test, expect } from '@playwright/test';

test('should navigate to thank-you page after contact form submission', async ({ page }) => {
  await page.goto('/contact');

  await page.getByLabel('Full name').fill('Alex Johnson');
  await page.getByLabel('Email').fill('alex@example.com');
  await page.getByLabel('Message').fill('I would like to request a demo.');

  await page.getByRole('button', { name: 'Send message' }).click();

  await page.waitForURL('/contact/thank-you');

  await expect(page.getByRole('heading', { name: 'Thank you' })).toBeVisible();
});
