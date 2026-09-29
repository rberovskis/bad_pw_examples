import { test, expect } from '@playwright/test';

test('should display complete and accurate user details on the profile page', async ({ page }) => {
  await page.goto('/profile/settings');

  await expect.soft(page.getByTestId('display-name')).toHaveText('Jane Doe');
  await expect.soft(page.getByTestId('email-address')).toHaveText('jane@example.com');
  await expect.soft(page.getByTestId('member-since')).toContainText('2022');
  await expect.soft(page.getByTestId('subscription-tier')).toHaveText('Pro');
  await expect.soft(page.getByTestId('avatar')).toBeVisible();
});
