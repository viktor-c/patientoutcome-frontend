import { test, expect } from '@playwright/test';

test('login', async ({ page }) => {
  // Recording...
await page.goto('http://localhost:5173/');
await page.getByRole('textbox', { name: 'Passwort Passwort' }).click();
await page.getByRole('textbox', { name: 'Passwort Passwort' }).fill('password123#124');
await page.getByRole('textbox', { name: 'Passwort Passwort' }).press('Enter');
await page.getByRole('button', { name: 'Anmelden' }).click();
await expect(page.getByText('Erfolgreich angemeldet')).toBeVisible();
await expect(page.getByRole('heading')).toContainText('Dashboard');
});