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

export async function applyRuntimeApiUrl(page: Page, apiUrl = 'http://localhost:40001') {
  await page.addInitScript((configuredApiUrl) => {
    // @ts-expect-error __APP_CONFIG__ is defined in env.d.ts
    window.__APP_CONFIG__ = {
      // @ts-expect-error __APP_CONFIG__ is defined in env.d.ts
      ...(window.__APP_CONFIG__ || {}),
      VITE_API_URL: configuredApiUrl,
    };
  }, apiUrl);
}

export async function loginWithRole(page: Page, role: UserRole) {
  const credentials = roleConfig[role];

  await applyRuntimeApiUrl(page);
  await page.goto(URL);
  await page.locator('#login-username').first().click();
  await page.locator('#login-username').first().fill(credentials.username);
  await page.locator('#login-username').first().press('Tab');
  await page.locator('#login-password').first().click();
  await page.locator('#login-password').first().fill(credentials.password);
  await page.locator('#login-submit').click();
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
  await expect(page.locator('.creation-flow-btn')).toBeVisible({ timeout: 15_000 });
  await page.context().storageState({ path: credentials.storageStatePath });
}

export async function logoutCurrentUser(page: Page, role: UserRole = 'clinician') {
  const credentials = roleConfig[role];

  await applyRuntimeApiUrl(page);
  await page.goto(`${URL}logout`);

  await expect(page.locator('#login-username')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#login-submit')).toBeVisible({ timeout: 10_000 });

  await page.context().storageState({ path: credentials.storageStatePath });
}
