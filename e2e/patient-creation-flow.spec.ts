import { test, expect, type Page } from '@playwright/test'
import { applyRuntimeApiUrl } from './helpers/auth'

async function fillInput(page: Page, testId: string, value: string) {
  await page.getByTestId(testId).locator('input').first().fill(value)
}

async function pickVuetifyOption(page: Page, testId: string, optionText: string) {
  await page.getByTestId(testId).click()
  const overlay = page.locator('.v-overlay__content .v-list').last()
  await overlay.waitFor({ state: 'visible', timeout: 8_000 })
  await page.locator('.v-overlay__content .v-list-item').filter({ hasText: optionText }).first().click()
  await overlay.waitFor({ state: 'hidden', timeout: 4_000 }).catch(() => { })
}

async function selectDepartmentIfNeeded(page: Page) {
  const departmentField = page.getByTestId('patient-department')
  const inputCount = await departmentField.locator('input').count()

  if (inputCount === 0) {
    return
  }

  const fieldText = await departmentField.textContent()
  if (!fieldText?.trim()) {
    await pickVuetifyOption(page, 'patient-department', 'Radiology')
  }
}

async function confirmDuplicatePatientIfPresent(page: Page) {
  const duplicatePatientDialog = page.getByText('Patient existiert bereits')

  if (await duplicatePatientDialog.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /^JA$/i }).click()
  }
}

test.describe('Patient / Case creation flow', () => {
  test('starts the creation flow and advances from patient step to case step', async ({ page }) => {
    await applyRuntimeApiUrl(page)
    await page.goto('')

    await fillInput(page, 'login-username', 'ewilson')
    await fillInput(page, 'login-password', 'password123#124')
    await page.getByTestId('login-submit').click()

    await page.waitForURL('**/dashboard', { timeout: 15_000 })
    await expect(page.locator('.creation-flow-btn')).toBeVisible({ timeout: 15_000 })

    await page.locator('.creation-flow-btn').click()
    await page.waitForURL('**/creation-flow', { timeout: 15_000 })
    await expect(page.getByText(/Patienten- und Fall-Erstellungsablauf/i).first()).toBeVisible()

    await expect(page.locator('.v-card-title').filter({ hasText: 'Patient erstellen' })).toBeVisible()
    await fillInput(page, 'patient-external-id', 'mvz123456')
    await pickVuetifyOption(page, 'patient-sex', 'männlich')
    await selectDepartmentIfNeeded(page)

    await page.getByRole('button', { name: /Nächste Frage|Weiter|Next/i }).click()
    await confirmDuplicatePatientIfPresent(page)

    await expect(page.getByText('Vorlage auswählen').first()).toBeVisible({ timeout: 15_000 })
  })
})
