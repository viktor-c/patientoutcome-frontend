import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, type Page } from '@playwright/test';

const URL = 'http://localhost:5173/';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.resolve(__dirname, '..', '.auth');

export type UserRole = 'clinician';

interface RoleConfig {
  username: string;
  password: string;
  storageStatePath: string;
}

const roleConfig: Record<UserRole, RoleConfig> = {
  clinician: {
    username: 'ewilson',
    password: 'password123#124',
    storageStatePath: path.join(AUTH_DIR, 'clinician.json'),
  },
};

export function ensureAuthDir() {
  mkdirSync(AUTH_DIR, { recursive: true });
}

export function getStorageStatePath(role: UserRole) {
  return roleConfig[role].storageStatePath;
}

export async function loginWithRole(page: Page, role: UserRole) {
  const credentials = roleConfig[role];

  await page.goto(URL);
  await page.locator('#login-username').first().click();
  await page.locator('#login-username').first().fill(credentials.username);
  await page.locator('#login-username').first().press('Tab');
  await page.locator('#login-password').first().click();
  await page.locator('#login-password').first().fill(credentials.password);
  await page.locator('#login-submit').click();
  // await expect(page.locator('#app-logout-button')).toBeVisible();
  await expect(page.locator('h1', { hasText: 'Dashboard' })).toBeVisible();
  await page.context().storageState({ path: credentials.storageStatePath });
}

export async function logoutCurrentUser(page: Page, role: UserRole = 'clinician') {
  const credentials = roleConfig[role];

  await page.goto(`${URL}logout`);

  await expect(page.locator('#login-username')).toBeVisible({timeout: 10_000});
  await expect(page.locator('#login-submit')).toBeVisible({ timeout: 10_000 });

  await page.context().storageState({ path: credentials.storageStatePath });
}
