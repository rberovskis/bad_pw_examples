import { test, expect } from '@playwright/test';

test('should show a success toast after deleting a user', async ({ page }) => {
  await page.goto('/settings/users');

  await page
    .getByRole('row', { name: 'Jane Doe' })
    .getByRole('button', { name: 'Delete' })
    .click();

  await page.getByRole('button', { name: 'Confirm' }).click();

  // ISSUE: `waitForTimeout` is a dumb sleep — it pauses for a fixed wall-clock
  // duration with no awareness of whether the DELETE request has actually
  // completed. On a slow CI runner it still races; on a fast machine it wastes
  // 1.5 s on every run. The toast assertion that follows already auto-retries
  // via Playwright's built-in polling, so the sleep is both unreliable and
  // redundant.
  //
  // Fix: wait for the specific network response that drives the UI update,
  // registering the waiter before the action that triggers it.
  //
  //   const deleteResponse = page.waitForResponse(
  //     (resp) => resp.url().includes('/api/users/') && resp.request().method() === 'DELETE',
  //   );
  //   await page.getByRole('button', { name: 'Confirm' }).click();
  //   await deleteResponse;
  await page.waitForTimeout(1_500);

  await expect(page.getByRole('alert')).toHaveText('User deleted successfully');
});
