import { test, expect } from '@playwright/test';
import { ensureAuthDir, getStorageStatePath, loginWithRole } from '../helpers/auth';

const URL = 'http://localhost:5173/';

test.describe('Authentication flow', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async () => {
    ensureAuthDir();
  });

  test('E2E testing: check that login with incorrect credentials fails', async ({ page }) => {
    await page.goto(URL);
    
    await page.locator('#login-username').first().click();
    await page.locator('#login-username').first().fill('fakeuser');
    await page.locator('#login-username').first().press('Tab');
    await page.locator('#login-password').first().fill('FakePassword');
    // await page.locator('#login-password').first().press('Tab');
    await page.locator('#login-submit').press('Enter');
    await expect(page.getByText('An error occurred during login')).toBeVisible();
  });

  test('E2E testing: check that login and logout flow works', async ({ page }) => {
    await test.step('login', async () => {
      await loginWithRole(page, 'clinician');
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
      await expect(page.locator('#app-logout-button')).toBeVisible();
    });

    await test.step('logout', async () => {
      await page.locator('#app-logout-button').click();
      await expect(page.locator('#login-username')).toBeVisible();
    });
  });

  test('E2E testing: reuses stored auth state for a clinician', async ({ browser }) => {
    const context = await browser.newContext({ storageState: getStorageStatePath('clinician') });
    const page = await context.newPage();

    await page.goto(URL);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    await context.close();
  });
});