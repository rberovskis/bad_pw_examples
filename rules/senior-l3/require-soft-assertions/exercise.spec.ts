import { test, expect } from '@playwright/test';

// Asserts all five user-visible fields on the profile settings page.
// Fields are checked in DOM order; the test stops at the first mismatch
// so the failure message points directly to the offending field.
test('should display complete and accurate user details on the profile page', async ({ page }) => {
  await page.goto('/profile/settings');

  await expect(page.getByTestId('display-name')).toHaveText('Jane Doe');
  await expect(page.getByTestId('email-address')).toHaveText('jane@example.com');
  await expect(page.getByTestId('member-since')).toContainText('2022');
  await expect(page.getByTestId('subscription-tier')).toHaveText('Pro');
  await expect(page.getByTestId('avatar')).toBeVisible();
});
