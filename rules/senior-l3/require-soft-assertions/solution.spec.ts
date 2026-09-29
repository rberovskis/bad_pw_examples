import { test, expect } from '@playwright/test';

test('should display complete and accurate user details on the profile page', async ({ page }) => {
  await page.goto('/profile/settings');

  // ISSUE: all five assertions use hard `expect()`. If the first field fails,
  // Playwright throws immediately and the remaining four are never checked.
  // After a data migration or display-formatting change that affects multiple
  // fields simultaneously, you get one failure per run and have to fix-and-
  // rerun repeatedly to surface the full picture.
  //
  // Fix: use `expect.soft()` for independent UI facts so all failures are
  // collected in a single run. The test is still marked failed — soft
  // assertions don't suppress failures, they accumulate them.
  //
  //   await expect.soft(page.getByTestId('display-name')).toHaveText('Jane Doe');
  //   await expect.soft(page.getByTestId('email-address')).toHaveText('jane@example.com');
  //   await expect.soft(page.getByTestId('member-since')).toContainText('2022');
  //   await expect.soft(page.getByTestId('subscription-tier')).toHaveText('Pro');
  //   await expect.soft(page.getByTestId('avatar')).toBeVisible();
  await expect(page.getByTestId('display-name')).toHaveText('Jane Doe');
  await expect(page.getByTestId('email-address')).toHaveText('jane@example.com');
  await expect(page.getByTestId('member-since')).toContainText('2022');
  await expect(page.getByTestId('subscription-tier')).toHaveText('Pro');
  await expect(page.getByTestId('avatar')).toBeVisible();
});
