import { test, expect } from '@playwright/test';

// Deletes a user record from the admin panel and confirms the toast
// notification appears. A short pause is included after the confirm click
// to allow the delete API call to complete and the UI to re-render.
test('should show a success toast after deleting a user', async ({ page }) => {
  await page.goto('/settings/users');

  await page
    .getByRole('row', { name: 'Jane Doe' })
    .getByRole('button', { name: 'Delete' })
    .click();

  await page.getByRole('button', { name: 'Confirm' }).click();

  await page.waitForTimeout(1_500);

  await expect(page.getByRole('alert')).toHaveText('User deleted successfully');
});
