import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { ensureAuthDir, getStorageStatePath, loginWithRole, logoutCurrentUser } from '../helpers/auth';

test.describe('Authentication flow', () => {
  test.describe.configure({ mode: 'serial' });

  let sharedContext: BrowserContext;
  let sharedPage: Page;

  test.beforeAll(async ({ browser }) => {
    ensureAuthDir();

    sharedContext = await browser.newContext({ storageState: getStorageStatePath('clinician') });
    sharedPage = await sharedContext.newPage();
    await loginWithRole(sharedPage, 'clinician');
  });


  test('E2E testing: change user profile settings', async () => {
    await test.step('navigate to user settings', async () => {
      await sharedPage.goto('http://localhost:5173/dashboard');
      await sharedPage.locator('#app-user-settings-button').click();
      await expect(sharedPage).toHaveURL('http://localhost:5173/user-settings');
      await expect(sharedPage.locator('#user-settings-view')).toBeVisible();
    });

    await test.step('change user profile settings', async () => {
      await sharedPage.locator('#user-settings-profile-name').click();
      await sharedPage.locator('#user-settings-profile-name').fill('Ethan');
      await sharedPage.locator('#user-settings-profile-save').click();
      // Wait for save to complete
      await expect(sharedPage.locator('#user-settings-profile-save')).toBeEnabled({ timeout: 5000 });
    });
  });


    test.afterAll(async () => {
    await logoutCurrentUser(sharedPage, 'clinician');
    await sharedContext.close();
  });

});