import { test, expect } from '@playwright/test';

test.skip('visits the app root url', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toContainText(/PatientOutcome/i);
})
