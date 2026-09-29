import { test, expect } from '@playwright/test';

test('should navigate to thank-you page after contact form submission', async ({ page }) => {
  await page.goto('/contact');

  await page.getByLabel('Full name').fill('Alex Johnson');
  await page.getByLabel('Email').fill('alex@example.com');
  await page.getByLabel('Message').fill('I would like to request a demo.');

  await page.getByRole('button', { name: 'Send message' }).click();

  // ISSUE: `waitForNavigation()` is called after the click that triggers the
  // navigation. On a fast server the navigation may have already completed
  // before this line is reached, causing the call to miss the event and hang
  // — or resolve against the wrong page state.
  //
  // Even wrapping click + waitForNavigation in Promise.all doesn't fully fix
  // it: the method fires on the first navigation event, not the final URL, so
  // redirect chains and history.pushState transitions can fool it.
  //
  // Fix: use `waitForURL`, which polls the current URL and is race-safe by
  // design — it doesn't matter whether navigation completed before or after
  // the call.
  //
  //   await page.waitForURL('/contact/thank-you');
  await page.waitForNavigation();

  await expect(page).toHaveURL('/contact/thank-you');
  await expect(page.getByRole('heading', { name: 'Thank you' })).toBeVisible();
});
