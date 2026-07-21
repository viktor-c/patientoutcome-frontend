/**
 * E2E test: Full patient / case / surgery / consultation creation workflow.
 *
 * Prerequisites (handled by globalSetup):
 *   – Backend running at http://localhost:40001
 *   – Frontend (Vite dev server) running at http://localhost:5173
 *   – Database reset-all seed called before the suite starts
 *
 * User: ewilson  Password: password123#124
 *
 * Selector strategy: all form fields use stable `data-testid` attributes.
 * Avoid Vuetify-generated `#input-v-XXX` ids (they change on every re-render)
 * and opaque long CSS class chains.  Only fall back to label / role / text
 * selectors for elements that are not owned by this project (e.g. overlay
 * list items that Vuetify renders in a teleport).
 */

import { test, expect, type Page } from '@playwright/test'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fill the <input> inside a Vuetify text-field / autocomplete that carries
 * the given data-testid on its root .v-input element.
 */
async function fillInput(page: Page, testId: string, value: string) {
  await page.getByTestId(testId).locator('input').first().fill(value)
}

/**
 * Fill the <textarea> inside a Vuetify textarea identified by data-testid.
 */
async function fillTextarea(page: Page, testId: string, value: string) {
  await page.getByTestId(testId).locator('textarea').first().fill(value)
}

/**
 * Open a Vuetify v-select / v-autocomplete by clicking the element with the
 * given data-testid, then click the desired option in the teleported overlay.
 */
async function pickVuetifyOption(page: Page, testId: string, optionText: string) {
  await page.getByTestId(testId).click()
  const overlay = page.locator('.v-overlay__content .v-list').last()
  await overlay.waitFor({ state: 'visible', timeout: 8_000 })
  await page
    .locator('.v-overlay__content .v-list-item')
    .filter({ hasText: optionText })
    .first()
    .click()
  await overlay.waitFor({ state: 'hidden', timeout: 4_000 }).catch(() => { })
}

/**
 * Type into a Vuetify autocomplete identified by data-testid, wait for
 * results and click the item matching optionText.
 */
async function pickAutocompleteOption(
  page: Page,
  testId: string,
  searchText: string,
  optionText: string,
) {
  await page.getByTestId(testId).locator('input').first().fill(searchText)
  const overlay = page.locator('.v-overlay__content .v-list').last()
  await overlay.waitFor({ state: 'visible', timeout: 1_000 })
  await page
    .locator('.v-overlay__content .v-list-item')
    .filter({ hasText: optionText })
    .first()
    .click()
  await overlay.waitFor({ state: 'hidden', timeout: 1_000 }).catch(() => { })
}

/**
 * Open an IcdOpsSearchField dialog, type the given code in the search input,
 * wait for results, click the item that contains the code text, and then
 * click the "Übernehmen" button to close the dialog.
 *
 * IcdOpsSearchField renders a custom click-trigger that opens a v-dialog
 * containing a standard text field for searching.  The field label is used
 * to locate the trigger because IcdOpsSearchField has its own internal
 * structure (not a standard Vuetify field).
 */
async function pickIcdOpsCode(page: Page, fieldLabelText: string, code: string) {
  // Dismiss any overlay/dialog left open from a previous interaction
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)

  const trigger = page
    .locator('.icd-ops-search-field')
    .filter({ has: page.locator('.icd-ops-field-label', { hasText: fieldLabelText }) })
    .first()

  // If the dialog is already open (e.g. a chip close-button click bubbled up and
  // triggered openDialog), we don't need to click the trigger again.
  const dialog = page.locator('.v-dialog').last()
  const isAlreadyOpen = await dialog.isVisible().catch(() => false)
  if (!isAlreadyOpen) {
    await trigger.click()
    await dialog.waitFor({ state: 'visible', timeout: 4_000 })
  }

  const searchInput = dialog.locator('input').first()
  // Clear any previous content before filling, so the watcher fires reliably
  await searchInput.fill('')
  await searchInput.fill(code)

  // The composable debounces 300 ms before firing the API call.
  // Wait for the loading spinner to appear, then disappear, to ensure
  // results are fully loaded before we try to click.
  const spinner = dialog.locator('.v-progress-circular')
  await spinner.waitFor({ state: 'visible', timeout: 1_500 }).catch(() => {
    // May have come and gone already on a very fast machine — that's fine
  })
  await spinner.waitFor({ state: 'hidden', timeout: 10_000 })

  const resultItem = dialog.locator('.v-list-item').filter({ hasText: code }).first()
  await resultItem.waitFor({ state: 'visible', timeout: 5_000 })
  await resultItem.click()

  await dialog
    .locator('.v-card-actions button, .v-card-actions .v-btn')
    .filter({ hasText: 'Übernehmen' })
    .first()
    .click()

  // Hard wait for dialog to close — do NOT swallow this error
  await dialog.waitFor({ state: 'hidden', timeout: 8_000 })
}

// ─────────────────────────────────────────────────────────────────────────────
// Test suite
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Patient / Case / Surgery / Consultation creation flow', () => {
  test.beforeEach(async ({ page }) => {
    // Allow the DB seed from globalSetup to propagate
    await page.waitForTimeout(500)
  })

  test('complete patient creation workflow', async ({ page }) => {
    // ── 1. LOGIN ─────────────────────────────────────────────────────────────
    await test.step('1 – Login as ewilson and verify success', async () => {
      await page.goto('')

      await fillInput(page, 'login-username', 'ewilson')
      await fillInput(page, 'login-password', 'password123#124')
      await page.getByTestId('login-submit').click()

      await page.waitForURL('**/dashboard', { timeout: 15_000 })
      await expect(page).toHaveURL(/\/dashboard/)
    })

    // ── 2. DASHBOARD ─────────────────────────────────────────────────────────
    await test.step('2 – Dashboard shows consultation list', async () => {
      await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({
        timeout: 2_000,
      })

      const table = page.locator('.v-data-table, [role="grid"]').first()
      await table.waitFor({ state: 'visible', timeout: 2_000 })

      await expect(
        page.locator('.v-data-table tbody tr, [role="row"]').first(),
      ).toBeVisible({ timeout: 15_000 })
    })

    // ── 3. START CREATION FLOW ────────────────────────────────────────────────
    await test.step('3 – Navigate to creation flow', async () => {
      await page.locator('.creation-flow-btn').click()
      await page.waitForURL('**/creation-flow', { timeout: 2_000 })
      await expect(
        page.getByText('Patienten- und Fall-Erstellungsablauf'),
      ).toBeVisible({ timeout: 8_000 })
    })

    // ── Step 1: Create Patient ────────────────────────────────────────────────
    await test.step('3a – Step 1: fill patient data (id=mvz123456, sex=männlich)', async () => {
      await expect(
        page.locator('.v-stepper-window-item .v-card-title').filter({ hasText: 'Patient erstellen' }),
      ).toBeVisible()

      await fillInput(page, 'patient-external-id', 'mvz123456')
      await pickVuetifyOption(page, 'patient-sex', 'männlich')

      await page.getByRole('button', { name: 'Weiter' }).click()
      await expect(page.getByRole('button', { name: 'Fall erstellen' })).toBeVisible({
        timeout: 2_000,
      })
    })

    // ── Step 2: Create Case ───────────────────────────────────────────────────
    await test.step('3b – Step 2: select blueprint and set main diagnosis + description', async () => {
      await pickAutocompleteOption(page, 'case-blueprint', 'MICA', 'Blaupause für MICA Patientenfall')
      await page.waitForTimeout(500)

      await pickIcdOpsCode(page, 'Hauptdiagnose', 'M20.1')
      await fillTextarea(page, 'case-description', 'Hallux valgus bei Rheuma')
    })

    await test.step('3c – Navigate back to step 1 and verify patient fields', async () => {
      await page.getByRole('button', { name: 'Zurück', exact: true }).click()

      await expect(
        page.locator('.v-stepper-window-item .v-card-title').filter({ hasText: 'Patient erstellen' }),
      ).toBeVisible({ timeout: 8_000 })

      await expect(page.getByTestId('patient-external-id').locator('input').first()).toHaveValue(
        'mvz123456',
      )
      // The selected chip / value text is rendered inside the v-select wrapper
      await expect(page.getByTestId('patient-sex')).toContainText('männlich')
    })

    await test.step('3d – Change sex to weiblich and proceed to step 2', async () => {
      await pickVuetifyOption(page, 'patient-sex', 'weiblich')

      await page.getByRole('button', { name: 'Weiter' }).click()
      await expect(page.getByRole('button', { name: 'Fall erstellen' })).toBeVisible({
        timeout: 2_000,
      })
    })

    await test.step('3e – Verify case description retained, update it and set external case id', async () => {
      await expect(
        page.getByTestId('case-description').locator('textarea').first(),
      ).toHaveValue('Hallux valgus bei Rheuma')

      await fillTextarea(page, 'case-description', 'Hallux valgus rezidiv')
      await fillInput(page, 'case-external-id', 'ext-123')

      await page.getByRole('button', { name: 'Weiter' }).click()
      await expect(page.getByText('Operation erstellen')).toBeVisible({ timeout: 2_000 })
    })

    // ── Step 3: Create Surgery ────────────────────────────────────────────────
    await test.step('3f-1 – Step 3: fill surgery form (therapy, side, OPS, surgeon)', async () => {
      await expect(page.getByText('Operation erstellen')).toBeVisible()

      await fillInput(page, 'surgery-therapy', 'MICA mit einer Schraube')
      await pickVuetifyOption(page, 'surgery-side', 'Links')
      await pickIcdOpsCode(page, 'OPS-Codes', '5-788.51')
      await pickAutocompleteOption(page, 'surgery-surgeons', 'john', 'John Doe')
    })

    await test.step('3f-2 – Navigate back and forward, verify surgery fields retained', async () => {
      await page.getByRole('button', { name: 'Zurück', exact: true }).click()
      await expect(page.getByRole('button', { name: 'Fall erstellen' })).toBeVisible({
        timeout: 8_000,
      })

      await page.getByRole('button', { name: 'Weiter' }).click()
      await expect(page.getByText('Operation erstellen')).toBeVisible({ timeout: 2_000 })

      // The blueprint re-applies its defaults to blueprint-controlled fields (e.g. therapy)
      // when re-entering this step, so we only verify fields that are truly persisted:
      // the manually-added OPS chip and the selected surgeon.
      await expect(page.locator('.v-chip').filter({ hasText: '5-788.51' })).toBeVisible()
      await expect(page.locator('.v-chip').filter({ hasText: 'John Doe' })).toBeVisible()
    })

    await test.step('3f-3 – Change therapy, replace OPS code, add surgery note', async () => {
      await page.getByTestId('surgery-therapy').locator('input').first().fill('MICA mit zwei Schrauben')

      // Remove old chip
      await page
        .locator('.v-chip')
        .filter({ hasText: '5-788.51' })
        .locator('[aria-label*="close"], .mdi-close-circle, .v-chip__close, button')
        .first()
        .click({ force: true })
      await page.waitForTimeout(300)

      await pickIcdOpsCode(page, 'OPS-Codes', '5-788.52')

      // Add note via NotesEditor
      await page.getByTestId('note-add-btn').click()
      await page.getByTestId('note-textarea').locator('textarea').first().fill('100th surgery')
      await page.getByTestId('note-save-btn').click()

      await page.getByRole('button', { name: 'Weiter' }).click()
      await expect(page.getByText('Konsultation erstellen')).toBeVisible({ timeout: 12_000 })
    })

    // ── Step 4: Consultation blueprint selection ───────────────────────────────
    await test.step('3g – Step 4: verify preselected blueprints and selection buttons', async () => {
      await page.waitForTimeout(1_500)

      await expect(
        page.locator('.selected-list .v-list-item-title').filter({ hasText: 'MICA 12 Wochen' }),
      ).toBeVisible({ timeout: 8_000 })
      await expect(
        page.locator('.selected-list .v-list-item-title').filter({ hasText: 'MICA 6 Wochen' }),
      ).toBeVisible({ timeout: 8_000 })

      // Alle auswählen → MICA 12 Wochen still visible
      await page.getByRole('button', { name: 'Alle auswählen' }).click()
      await page.waitForTimeout(400)
      await expect(
        page.locator('.selected-list .v-list-item-title').filter({ hasText: 'MICA 12 Wochen' }),
      ).toBeVisible()

      // Deselect one blueprint from the left list
      await page.locator('.blueprint-list .v-list-item').filter({ hasText: 'MICA 12 Wochen' }).click()
      await page.waitForTimeout(300)

      // Auswahl aufheben → right panel disappears
      await page.getByRole('button', { name: 'Auswahl aufheben' }).click()
      await page.waitForTimeout(400)
      await expect(page.locator('.selected-list')).toBeHidden()

      // Select a custom one, then Standard auswählen should restore defaults
      await page.locator('.blueprint-list .v-list-item').filter({ hasText: 'MICA 6 Monate postop' }).click()
      await page.waitForTimeout(300)

      await page.getByRole('button', { name: 'Standard auswählen' }).click()
      await page.waitForTimeout(400)

      await expect(
        page.locator('.selected-list .v-list-item-title').filter({ hasText: 'MICA 12 Wochen' }),
      ).toBeVisible()
      await expect(
        page.locator('.selected-list .v-list-item-title').filter({ hasText: 'MICA 6 Wochen' }),
      ).toBeVisible()
      await expect(
        page.locator('.selected-list .v-list-item-title').filter({ hasText: 'MICA 6 Monate postop' }),
      ).toBeHidden()
    })

    // ── Step 4: Manual consultation ───────────────────────────────────────────
    await test.step('3h – Create manual consultation via dialog', async () => {
      await page.getByRole('button', { name: 'Manuelle Konsultation erstellen' }).first().click()

      const dialog = page
        .locator('.v-dialog')
        .filter({ has: page.locator('.v-card-title', { hasText: 'Manuelle Konsultation erstellen' }) })
        .last()
      await dialog.waitFor({ state: 'visible', timeout: 6_000 })

      // Try submitting empty → expect validation error
      await dialog.getByRole('button', { name: 'Neue Konsultation hinzufügen' }).click()
      await expect(
        dialog.locator('.v-messages__message, .v-input__details, [class*="error"]').first(),
      ).toBeVisible({ timeout: 5_000 })

      // Select reason "followup"
      await dialog.getByTestId('consultation-reason').click()
      const reasonOverlay = page.locator('.v-overlay__content .v-list').last()
      await reasonOverlay.waitFor({ state: 'visible', timeout: 6_000 })
      await reasonOverlay.getByText('followup', { exact: true }).click()
      await reasonOverlay.waitFor({ state: 'hidden', timeout: 3_000 }).catch(() => {})

      // Select form templates: EFAS, AOFAS Forefoot, VAS
      for (const templateName of ['EFAS', 'AOFAS Forefoot', 'VAS']) {
        await dialog.getByTestId('consultation-form-templates').locator('input').click()
        const tplOverlay = page.locator('.v-overlay__content .v-list').last()
        await tplOverlay.waitFor({ state: 'visible', timeout: 6_000 })
        await tplOverlay.getByText(templateName, { exact: false }).first().click()
        await page.waitForTimeout(300)
      }
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)

      // Set "Besucht von" to Emma Wilson
      await dialog.getByTestId('consultation-visited-by').locator('input').fill('Emma')
      const vbOverlay = page.locator('.v-overlay__content .v-list').last()
      await vbOverlay.waitFor({ state: 'visible', timeout: 6_000 })
      await vbOverlay.getByText('Emma Wilson').click()
      await vbOverlay.waitFor({ state: 'hidden', timeout: 3_000 }).catch(() => {})

      // Generate a new access code via the mdi-plus icon inside the combobox
      await dialog
        .getByTestId('consultation-access-code')
        .locator('.mdi-plus')
        .filter({ visible: true })
        .click({ force: true })
      await page.waitForTimeout(1_500)

      // Submit
      await dialog.getByRole('button', { name: 'Neue Konsultation hinzufügen' }).click()
      await dialog.waitFor({ state: 'hidden', timeout: 2_000 })
    })

    // ── Step 4 → 5: advance to URL summary ───────────────────────────────────
    await test.step('3i-1 – Advance to step 5 (URL summary)', async () => {
      await page.getByRole('button', { name: 'Weiter' }).click()
      await expect(page.getByText('Direkte Zugriffs-URLs')).toBeVisible({ timeout: 20_000 })
    })

    await test.step('3i-2 – Open consultation URL in a new tab and verify', async () => {
      const consultationUrlCard = page.getByTestId('result-consultation-url')
      await consultationUrlCard.waitFor({ state: 'visible', timeout: 2_000 })

      const [newPage] = await Promise.all([
        page.context().waitForEvent('page'),
        consultationUrlCard.locator('button[title="Öffnen"], .mdi-open-in-new').first().click(),
      ])

      await newPage.waitForLoadState('domcontentloaded', { timeout: 15_000 })
      await expect(newPage).toHaveURL(/consultation-overview|\/flow\//)
      await expect(newPage.locator('body')).not.toContainText('404', { timeout: 5_000 })
      await newPage.close()
    })

    // ── Return to dashboard ───────────────────────────────────────────────────
    await test.step('3j – Return to dashboard', async () => {
      await page.goto('/dashboard')
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 2_000 })
      await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
    })
  })
})

