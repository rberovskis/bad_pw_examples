import { test, expect } from '@playwright/test';

test('should show a success toast after deleting a user', async ({ page }) => {
  await page.goto('/settings/users');

  const deleteResponse = page.waitForResponse(
    (resp) => resp.url().includes('/api/users/') && resp.request().method() === 'DELETE',
  );

  await page
    .getByRole('row', { name: 'Jane Doe' })
    .getByRole('button', { name: 'Delete' })
    .click();

  await page.getByRole('button', { name: 'Confirm' }).click();
  await deleteResponse;

  await expect(page.getByRole('alert')).toHaveText('User deleted successfully');
});
