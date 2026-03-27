/**
 * E2E test: Full patient / case / surgery / consultation creation workflow.
 *
 * Prerequisites (handled by globalSetup):
 *   – Backend running at http://localhost:40001
 *   – Frontend (Vite dev server) running at http://localhost:5173
 *   – Database reset-all seed called before the suite starts
 *
 * User: ewilson  Password: password123#124
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Open a Vuetify v-select / v-autocomplete by clicking the input that carries
 * the given label text, then click the desired option in the overlay list.
 *
 * Vuetify renders a floating <label> that is a sibling of the <input
 * role="combobox">.  We locate the containing `.v-input` element by the
 * visible label text and then click its inner input to open the dropdown.
 */
async function pickVuetifyOption(
  page: Page,
  labelText: string,
  optionText: string,
) {
  // Find the v-input that contains the matching label and click its control
  const vInput = page
    .locator('.v-input')
    .filter({ has: page.locator('label', { hasText: labelText }) })
    .first()
  await vInput.click()

  // The dropdown is teleported – wait for any overlay list to become visible
  const overlay = page.locator('.v-overlay__content .v-list').last()
  await overlay.waitFor({ state: 'visible', timeout: 8_000 })

  // Click the option
  await page
    .locator('.v-overlay__content .v-list-item')
    .filter({ hasText: optionText })
    .first()
    .click()

  // Let the overlay close
  await overlay.waitFor({ state: 'hidden', timeout: 4_000 }).catch(() => {
    // overlay may have already closed – that's fine
  })
}

/**
 * Open an IcdOpsSearchField dialog, type the given code in the search input,
 * wait for results, click the item that contains the code text, and then
 * click the "Übernehmen" button to close the dialog.
 *
 * IcdOpsSearchField renders a custom click-trigger that opens a v-dialog
 * containing a standard text field for searching.
 */
async function pickIcdOpsCode(
  page: Page,
  fieldLabelText: string,
  code: string,
) {
  // Click the trigger (the non-standard field that opens the dialog)
  const trigger = page
    .locator('.icd-ops-search-field')
    .filter({ has: page.locator('.icd-ops-field-label', { hasText: fieldLabelText }) })
    .first()
  await trigger.click()

  // The dialog opens – wait for its search input
  const dialog = page.locator('.v-dialog').last()
  await dialog.waitFor({ state: 'visible', timeout: 6_000 })

  // Type the code – `searchRef` is auto-focused
  const searchInput = dialog.locator('input').first()
  await searchInput.fill(code)

  // Wait for at least one result list-item that contains the code
  const resultItem = dialog
    .locator('.v-list-item')
    .filter({ hasText: code })
    .first()
  await resultItem.waitFor({ state: 'visible', timeout: 10_000 })
  await resultItem.click()

  // Click the "Übernehmen" button to close the dialog
  await dialog
    .locator('.v-card-actions button, .v-card-actions .v-btn')
    .filter({ hasText: 'Übernehmen' })
    .first()
    .click()

  // Dialog closes after clicking the button
  await dialog.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {})
}

/**
 * Type into a Vuetify autocomplete by label, wait for results, click the
 * item with optionText.  Used for regular (non-IcdOps) autocomplete fields.
 */
async function pickAutocompleteOption(
  page: Page,
  labelText: string,
  searchText: string,
  optionText: string,
) {
  const vInput = page
    .locator('.v-input')
    .filter({ has: page.locator('label', { hasText: labelText }) })
    .first()
  const input = vInput.locator('input').first()
  await input.fill(searchText)

  const overlay = page.locator('.v-overlay__content .v-list').last()
  await overlay.waitFor({ state: 'visible', timeout: 8_000 })

  await page
    .locator('.v-overlay__content .v-list-item')
    .filter({ hasText: optionText })
    .first()
    .click()

  await overlay.waitFor({ state: 'hidden', timeout: 4_000 }).catch(() => {})
}

// ─────────────────────────────────────────────────────────────────────────────
// Test suite
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Patient / Case / Surgery / Consultation creation flow', () => {
  /**
   * Give the backend time for the DB seed (initiated in globalSetup) to
   * propagate before the first assertion.
   */
  test.beforeEach(async ({ page }) => {
    // Wait briefly to ensure the seed has fully committed
    await page.waitForTimeout(500)
  })

  test('complete patient creation workflow', async ({ page, context }) => {
    // ── 1. LOGIN ─────────────────────────────────────────────────────────────
    await test.step('1 – Login as ewilson and verify success', async () => {
      await page.goto('')

      await page.getByLabel('Benutzername').fill('ewilson')
      await page.getByLabel('Passwort').fill('password123#124')
      await page.getByRole('button', { name: 'Anmelden' }).click()

      // After login the app redirects to /dashboard
      await page.waitForURL('**/dashboard', { timeout: 15_000 })

      // Verify login success notification or that we are on the dashboard
      await expect(page).toHaveURL(/\/dashboard/)
    })

    // ── 2. DASHBOARD ─────────────────────────────────────────────────────────
    await test.step('2 – Dashboard shows consultation list', async () => {
      // The page heading should confirm we are on the dashboard
      await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({
        timeout: 10_000,
      })

      // The consultations table must contain at least one row (seeded data)
      const table = page.locator('.v-data-table, [role="grid"]').first()
      await table.waitFor({ state: 'visible', timeout: 10_000 })

      // Wait for at least ONE data row (seed creates consultations)
      await expect(
        page.locator('.v-data-table tbody tr, [role="row"]').first(),
      ).toBeVisible({ timeout: 15_000 })
    })

    // ── 3. START CREATION FLOW ────────────────────────────────────────────────
    await test.step('3 – Start patient-case creation flow', async () => {
      // The icon-button on the dashboard has the CSS class "creation-flow-btn"
      await page.locator('.creation-flow-btn').click()

      await page.waitForURL('**/creation-flow', { timeout: 10_000 })
      await expect(
        page.getByText('Patienten- und Fall-Erstellungsablauf'),
      ).toBeVisible({ timeout: 8_000 })
    })

    // ── Step 1: Create Patient ────────────────────────────────────────────────
    await test.step('3a – Step 1: fill patient data (id=mvz123456, sex=männlich)', async () => {
      // Confirm we are on step 1
      await expect(
        page
          .locator('.v-stepper-window-item .v-card-title')
          .filter({ hasText: 'Patient erstellen' }),
      ).toBeVisible()

      // External patient ID (label = 'Patient Id')
      const externalIdInput = page
        .locator('.v-input')
        .filter({ has: page.locator('label', { hasText: 'Patient Id' }) })
        .first()
      await externalIdInput.locator('input').first().fill('mvz123456')

      // Set sex to "männlich"
      await pickVuetifyOption(page, 'Geschlecht', 'männlich')

      // Proceed to step 2
      await page.getByRole('button', { name: 'Weiter' }).click()

      // Wait for step 2 to be active
      await expect(page.getByRole('button', { name: 'Fall erstellen' })).toBeVisible({
        timeout: 10_000,
      })
    })

    // ── Step 2: Create Case ───────────────────────────────────────────────────
    await test.step('3b – Step 2: select blueprint "Blaupause für MICA Patientenfall"', async () => {
      await expect(page.getByRole('button', { name: 'Fall erstellen' })).toBeVisible()

      // Blueprint autocomplete – type to search and select
      await pickAutocompleteOption(
        page,
        'Vorlage auswählen',
        'MICA',
        'Blaupause für MICA Patientenfall',
      )

      // Confirm blueprint was applied (notification or field fill)
      await page.waitForTimeout(500)
    })

    await test.step('3c – Step 2: set main diagnosis M20.1 and case description', async () => {
      // Enter M20.1 in the IcdOps "Hauptdiagnose" dialog
      await pickIcdOpsCode(page, 'Hauptdiagnose', 'M20.1')

      // Fill in the case description / Fallbeschreibung (medicalHistory)
      const descriptionField = page
        .locator('.v-input, .v-textarea')
        .filter({ has: page.locator('label', { hasText: 'Fallbeschreibung' }) })
        .first()
      await descriptionField.locator('textarea').first().fill('Hallux valgus bei Rheuma')
    })

    await test.step('3d – Navigate back to step 1 and verify patient fields', async () => {
      await page.getByRole('button', { name: 'Zurück', exact: true }).click()

      // We should be back on step 1
      await expect(
        page
          .locator('.v-stepper-window-item .v-card-title')
          .filter({ hasText: 'Patient erstellen' }),
      ).toBeVisible({ timeout: 8_000 })

      // Verify external ID is still mvz123456
      const externalIdInput = page
        .locator('.v-input')
        .filter({ has: page.locator('label', { hasText: 'Patient Id' }) })
        .first()
      await expect(externalIdInput.locator('input').first()).toHaveValue('mvz123456')

      // Verify sex is still männlich (the selected value chip or input)
      await expect(
        page
          .locator('.v-input')
          .filter({ has: page.locator('label', { hasText: 'Geschlecht' }) })
          .first(),
      ).toContainText('männlich')
    })

    await test.step('3e – Change sex to weiblich and go to step 2', async () => {
      await pickVuetifyOption(page, 'Geschlecht', 'weiblich')

      await page.getByRole('button', { name: 'Weiter' }).click()
      await expect(page.getByRole('button', { name: 'Fall erstellen' })).toBeVisible({
        timeout: 10_000,
      })
    })

    await test.step('3f – Verify case description unchanged, update it and set external case id', async () => {
      // Verify Fallbeschreibung is still the old value
      const descriptionField = page
        .locator('.v-input, .v-textarea')
        .filter({ has: page.locator('label', { hasText: 'Fallbeschreibung' }) })
        .first()
      await expect(descriptionField.locator('textarea').first()).toHaveValue(
        'Hallux valgus bei Rheuma',
      )

      // Change the description
      await descriptionField.locator('textarea').first().fill('Hallux valgus rezidiv')

      // Set external case id ("Externe Patientenfallnummer")
      const extCaseIdField = page
        .locator('.v-input')
        .filter({ has: page.locator('label', { hasText: 'Externe Patientenfallnummer' }) })
        .first()
      await extCaseIdField.locator('input').first().fill('ext-123')

      // Proceed to step 3 (surgery)
      await page.getByRole('button', { name: 'Weiter' }).click()
      await expect(page.getByText('Operation erstellen')).toBeVisible({ timeout: 10_000 })
    })

    // ── Step 3: Create Surgery ────────────────────────────────────────────────
    await test.step('3g-1 – Step 3: fill surgery form (therapy, date, side, OPS, surgeon)', async () => {
      await expect(page.getByText('Operation erstellen')).toBeVisible()

      // Therapy field
      const therapyInput = page
        .locator('.v-input')
        .filter({ has: page.locator('label', { hasText: 'Therapie' }) })
        .first()
      await therapyInput.locator('input').first().fill('MICA mit einer Schraube')

      // Surgery date already defaults to today – no change needed

      // Side selector
      await pickVuetifyOption(page, 'Seite', 'Links')

      // OPS code
      await pickIcdOpsCode(page, 'OPS-Codes', '5-788.51')

      // Surgeon autocomplete – type "john" to find John Doe
      await pickAutocompleteOption(page, 'Chirurgen', 'john', 'John Doe')
    })

    await test.step('3g-2 – Go back to step 2, then forward again and verify surgery fields', async () => {
      // Navigate back to step 2 (case form)
      await page.getByRole('button', { name: 'Zurück', exact: true }).click()
      await expect(page.getByRole('button', { name: 'Fall erstellen' })).toBeVisible({
        timeout: 8_000,
      })

      // Navigate forward again to step 3
      await page.getByRole('button', { name: 'Weiter' }).click()
      await expect(page.getByText('Operation erstellen')).toBeVisible({ timeout: 10_000 })

      // Verify therapy field is still preserved
      const therapyInput = page
        .locator('.v-input')
        .filter({ has: page.locator('label', { hasText: 'Therapie' }) })
        .first()
      await expect(therapyInput.locator('input').first()).toHaveValue(
        'MICA mit einer Schraube',
      )

      // Verify OPS code chip is present
      await expect(page.locator('.v-chip').filter({ hasText: '5-788.51' })).toBeVisible()
    })

    await test.step('3g-3 – Change therapy and OPS code, add surgery note', async () => {
      // Change therapy
      const therapyInput = page
        .locator('.v-input')
        .filter({ has: page.locator('label', { hasText: 'Therapie' }) })
        .first()
      await therapyInput.locator('input').first().fill('MICA mit zwei Schrauben')

      // Remove the old OPS chip (5-788.51) then add 5-788.52
      // Close the existing 5-788.51 chip
      await page
        .locator('.v-chip')
        .filter({ hasText: '5-788.51' })
        .locator('[aria-label*="close"], .mdi-close-circle, .v-chip__close, button')
        .first()
        .click({ force: true })
      await page.waitForTimeout(300)

      await pickIcdOpsCode(page, 'OPS-Codes', '5-788.52')

      // Add a note using "Notiz hinzufügen" button
      await page.getByRole('button', { name: 'Notiz hinzufügen' }).click()

      // A textarea appears (autofocused)
      const noteArea = page.locator('textarea[autofocus], .v-textarea textarea').last()
      await noteArea.fill('100th surgery')

      // Save the note with the green checkmark button
      await page.locator('.v-btn').filter({ has: page.locator('.mdi-check') }).last().click()

      // Proceed to step 4 (consultation blueprint selection)
      await page.getByRole('button', { name: 'Weiter' }).click()
      await expect(page.getByText('Konsultation erstellen')).toBeVisible({ timeout: 12_000 })
    })

    // ── Step 4: Consultation blueprint selection ───────────────────────────────
    await test.step('3h – Step 4: verify preselected blueprints and test selection buttons', async () => {
      await expect(page.getByText('Konsultation erstellen')).toBeVisible()

      // Wait for blueprints to load
      await page.waitForTimeout(1_500)

      // Verify 2 blueprints are preselected in the right panel (selected list)
      await expect(
        page.locator('.selected-list .v-list-item-title').filter({ hasText: 'MICA 12 Wochen' }),
      ).toBeVisible({ timeout: 8_000 })
      await expect(
        page.locator('.selected-list .v-list-item-title').filter({ hasText: 'MICA 6 Wochen' }),
      ).toBeVisible({ timeout: 8_000 })

      // Click "Alle auswählen" → all available blueprints get selected
      await page.getByRole('button', { name: 'Alle auswählen' }).click()
      await page.waitForTimeout(400)

      // The selected count chip should now show more than 2
      // (we just confirm MICA 12 Wochen and MICA 6 Wochen are still in the list)
      await expect(
        page.locator('.selected-list .v-list-item-title').filter({ hasText: 'MICA 12 Wochen' }),
      ).toBeVisible()

      // Deselect "MICA 12 Wochen" by clicking it in the left blueprint list
      await page
        .locator('.blueprint-list .v-list-item')
        .filter({ hasText: 'MICA 12 Wochen' })
        .click()

      await page.waitForTimeout(300)

      // Click "Auswahl aufheben" → none selected
      await page.getByRole('button', { name: 'Auswahl aufheben' }).click()
      await page.waitForTimeout(400)

      // The right panel should show the empty-state card
      await expect(page.locator('.selected-list')).toBeHidden()

      // Select "MICA 6 Monate postop" manually
      await page
        .locator('.blueprint-list .v-list-item')
        .filter({ hasText: 'MICA 6 Monate postop' })
        .click()
      await page.waitForTimeout(300)

      // Click "Standard auswählen" → restores initial defaults (MICA 12 Wochen + MICA 6 Wochen)
      await page.getByRole('button', { name: 'Standard auswählen' }).click()
      await page.waitForTimeout(400)

      // Verify MICA 12 Wochen and MICA 6 Wochen are selected
      await expect(
        page.locator('.selected-list .v-list-item-title').filter({ hasText: 'MICA 12 Wochen' }),
      ).toBeVisible()
      await expect(
        page.locator('.selected-list .v-list-item-title').filter({ hasText: 'MICA 6 Wochen' }),
      ).toBeVisible()

      // MICA 6 Monate postop should NOT be in the selected list
      await expect(
        page.locator('.selected-list .v-list-item-title').filter({ hasText: 'MICA 6 Monate postop' }),
      ).toBeHidden()
    })

    // ── Step 4i: Manual consultation ─────────────────────────────────────────
    await test.step('3i – Create manual consultation via dialog', async () => {
      // Click the "Manuelle Konsultation erstellen" button (in the top card of step 4)
      await page
        .getByRole('button', { name: 'Manuelle Konsultation erstellen' })
        .first()
        .click()

      // The manual consultation dialog should open
      const dialog = page
        .locator('.v-dialog')
        .filter({ has: page.locator('.v-card-title', { hasText: 'Manuelle Konsultation erstellen' }) })
        .last()
      await dialog.waitFor({ state: 'visible', timeout: 6_000 })

      // Try to submit without filling in reason (validation test)
      await dialog.getByRole('button', { name: 'Neue Konsultation hinzufügen' }).click()

      // Error message should appear near the reason field
      await expect(
        dialog.locator('.v-messages__message, .v-input__details, [class*="error"]').first(),
      ).toBeVisible({ timeout: 5_000 })

      // The error text is "At least one reason is required"
      const reasonField = dialog
        .locator('.v-input')
        .filter({ has: dialog.locator('label', { hasText: 'Grund für die Konsultation' }) })
        .first()
      await expect(reasonField).toBeVisible()

      // Select reason "followup" from the dropdown
      const reasonInput = dialog
        .locator('.v-input')
        .filter({ has: dialog.locator('label', { hasText: 'Grund für die Konsultation' }) })
        .first()
      await reasonInput.click()
      const reasonOverlay = page.locator('.v-overlay__content .v-list').last()
      await reasonOverlay.waitFor({ state: 'visible', timeout: 6_000 })
      await reasonOverlay.getByText('followup', { exact: true }).click()
      await reasonOverlay.waitFor({ state: 'hidden', timeout: 3_000 }).catch(() => {})

      // Select form templates: EFAS, AOFAS Forefoot, VAS
      const templateField = dialog
        .locator('.v-input')
        .filter({ has: dialog.locator('label', { hasText: 'Formularvorlage' }) })
        .first()

      for (const templateName of ['EFAS', 'AOFAS Forefoot', 'VAS']) {
        await templateField.locator('input').click()
        const tplOverlay = page.locator('.v-overlay__content .v-list').last()
        await tplOverlay.waitFor({ state: 'visible', timeout: 6_000 })
        await tplOverlay.getByText(templateName, { exact: false }).first().click()
        await page.waitForTimeout(300)
      }
      // Close the dropdown if still open
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)

      // Set "Besucht von" to Emma Wilson
      const visitedByField = dialog
        .locator('.v-input')
        .filter({ has: dialog.locator('label', { hasText: 'Besucht von' }) })
        .first()
      await visitedByField.locator('input').fill('Emma')
      const vbOverlay = page.locator('.v-overlay__content .v-list').last()
      await vbOverlay.waitFor({ state: 'visible', timeout: 6_000 })
      await vbOverlay.getByText('Emma Wilson').click()
      await vbOverlay.waitFor({ state: 'hidden', timeout: 3_000 }).catch(() => {})

      // Click the green plus icon to generate a new form access code
      // The icon is inside the "Zugangskode für den Patienten" combobox append-inner
      await dialog
        .locator('.mdi-plus')
        .filter({ visible: true })
        .last()
        .click({ force: true })

      // Wait for code to be generated (code combobox should show a value)
      await page.waitForTimeout(1_500)

      // Submit the consultation
      await dialog.getByRole('button', { name: 'Neue Konsultation hinzufügen' }).click()

      // Dialog closes after successful submission
      await dialog.waitFor({ state: 'hidden', timeout: 10_000 })
    })

    // ── Step 4 → 5: advance to completion ───────────────────────────────────
    await test.step('3j-1 – Advance to step 5 (URL summary)', async () => {
      // Click the outer "Weiter" button while on step 4
      // This triggers blueprint creation + advances to step 5
      await page.getByRole('button', { name: 'Weiter' }).click()

      // Wait for step 5 completion card
      await expect(
        page.getByText('Direkte Zugriffs-URLs'),
      ).toBeVisible({ timeout: 20_000 })
    })

    await test.step('3j-2 – Open consultation URL in a new tab and verify', async () => {
      // The QRCodeLinkDisplay for the first consultation URL has label "Erste Konsultations-URL"
      const consultationUrlCard = page
        .locator('.qr-code-link-display')
        .filter({ has: page.locator('text=Erste Konsultations-URL') })
        .first()

      await consultationUrlCard.waitFor({ state: 'visible', timeout: 10_000 })

      // Click the "open in new tab" button (mdi-open-in-new icon, title="Öffnen")
      const [newPage] = await Promise.all([
        page.context().waitForEvent('page'),
        consultationUrlCard.locator('button[title="Öffnen"], .mdi-open-in-new').first().click(),
      ])

      await newPage.waitForLoadState('domcontentloaded', { timeout: 15_000 })

      // The new tab should be on a consultation-overview or consultation page
      await expect(newPage).toHaveURL(/consultation-overview|\/flow\//)

      // Verify the page loaded successfully (not an error page)
      await expect(newPage.locator('body')).not.toContainText('404', { timeout: 5_000 })

      await newPage.close()
    })

    // ── Step k: Return to dashboard ──────────────────────────────────────────
    await test.step('3k – Go back to dashboard', async () => {
      // Navigate to dashboard via the router / navigation link
      await page.goto('/dashboard')
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
      await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
    })
  })
})
