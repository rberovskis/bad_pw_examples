import { test, expect } from '@playwright/test';

// Verifies that submitting the contact form navigates the user to the
// thank-you page. waitForNavigation is called right after the submit click
// so we don't proceed to assertions before the page transition completes.
test('should navigate to thank-you page after contact form submission', async ({ page }) => {
  await page.goto('/contact');

  await page.getByLabel('Full name').fill('Alex Johnson');
  await page.getByLabel('Email').fill('alex@example.com');
  await page.getByLabel('Message').fill('I would like to request a demo.');

  await page.getByRole('button', { name: 'Send message' }).click();
  await page.waitForNavigation();

  await expect(page).toHaveURL('/contact/thank-you');
  await expect(page.getByRole('heading', { name: 'Thank you' })).toBeVisible();
});
