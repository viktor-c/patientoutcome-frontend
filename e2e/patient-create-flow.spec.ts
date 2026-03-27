import { test, expect } from '@playwright/test';


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
      await page.goto('http://localhost:5173/');
      await page.getByRole('textbox', { name: 'Benutzername Benutzername' }).fill('ewilson');
      await page.getByRole('textbox', { name: 'Passwort Passwort' }).fill('password123#124');
      await page.getByRole('textbox', { name: 'Passwort Passwort' }).press('Enter');
      // await page.getByRole('button', { name: 'Anmelden' }).click();
      await expect(page.getByText('Erfolgreich angemeldet')).toBeVisible();
      await expect(page.getByRole('heading')).toContainText('Dashboard');
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

    // ── 3. CREATE PATIENT → CASE → SURGERY → CONSULTATION ────────────────

    await test.step('3 – Start patient-case creation flow', async () => {
      // The icon-button on the dashboard has the CSS class "creation-flow-btn"
      await page.locator('.creation-flow-btn').click()

      await page.waitForURL('**/creation-flow', { timeout: 10_000 })
      await expect(
        page.getByText('Patienten- und Fall-Erstellungsablauf'),
      ).toBeVisible({ timeout: 8_000 })
    })


    await test.step('1 – Enter patient data', async () => {
      await page.getByRole('textbox', { name: 'Patient Id Patient Id' }).click();
      await page.getByRole('textbox', { name: 'Patient Id Patient Id' }).fill('playwright 1');
      await page.getByRole('button', { name: 'Externe ID hinzufügen' }).click();
      await page.getByRole('textbox', { name: 'Patient Id 2 Patient Id' }).click();
      await page.getByRole('textbox', { name: 'Patient Id 2 Patient Id' }).fill('playwright 2');
      await page.locator('.v-input.v-input--horizontal.v-input--center-affix.v-input--density-compact.v-theme--light.v-locale--is-ltr.v-text-field.v-select > .v-input__control > .v-field > .v-field__field > .v-field__input').first().click();
      await page.getByText('weiblich').click();
      await page.locator('.v-row > div:nth-child(4)').click();
      await page.getByRole('button', { name: 'Weiter' }).click();
    })

    // ── Step 2: Falldaten ───────────────────────────────────────────────
    await test.step('2 – Enter case data', async () => {
      await page.getByRole('combobox', { name: 'Vorlage auswählen Vorlage' }).click();
      await page.getByText('Blaupause für MICA').click();
      await page.getByRole('textbox', { name: 'Fallbeschreibung' }).click();
      await page.getByRole('textbox', { name: 'Fallbeschreibung' }).press('ControlOrMeta+a');
      await page.getByRole('textbox', { name: 'Fallbeschreibung' }).fill('Pes adductus und Hallux valgus');
      await page.locator('div').filter({ hasText: /^ICD-10-Code auswählen…$/ }).nth(2).click();
      await page.getByRole('textbox', { name: 'Code oder Bezeichnung' }).click();
      await page.getByRole('textbox', { name: 'Code oder Bezeichnung' }).fill('M20.1');
      await page.getByText('Hallux valgus (erworben)').click();
      await page.getByRole('button', { name: 'Übernehmen' }).click();
      await page.locator('div').filter({ hasText: /^ICD-10-Code auswählen…$/ }).nth(2).click();
      await page.getByRole('textbox', { name: 'Code oder Bezeichnung' }).fill('I10.0');
      await page.getByRole('textbox', { name: 'Code oder Bezeichnung' }).press('Enter');
      await page.getByRole('button', { name: 'Übernehmen' }).click();
      await page.getByRole('button', { name: 'Weiter' }).click();
    })

    // ── Step 3: Operationsdaten ─────────────────────────────────────────
    await test.step('3 – Enter surgery data', async () => {
      await page.getByRole('textbox', { name: 'Externe ID Externe ID' }).click();
      await page.getByRole('textbox', { name: 'Externe ID Externe ID' }).fill('surgery-1');
      await page.getByRole('textbox', { name: 'Therapie Therapie' }).click();
      await page.getByRole('textbox', { name: 'Therapie Therapie' }).press('ControlOrMeta+a');
      await page.getByRole('textbox', { name: 'Therapie Therapie' }).fill('MICA und basis OT');
      await page.getByRole('combobox', { name: 'Chirurgen Chirurgen' }).click();
      await page.getByText('Bob White').click();
      // add surgery note
      await test.step('3a – Add surgery note', async () => {
        await page.locator('div').filter({ hasText: /^Notiz hinzufügen$/ }).nth(1).click();
        await page.getByRole('button', { name: 'Notiz hinzufügen' }).click();
        await page.locator('#input-v-369').fill('notiz für die Ewigkeit');
        await page.locator('.v-btn.v-btn--elevated').first().click();
      })
      // go back one step to verify that the entered data is retained
      await page.getByRole('button', { name: 'Zurück', exact: true }).click();
      await test.step('3b – Verify data retention after going back', async () => {
        await page.getByRole('textbox', { name: 'Externe Patientenfallnummer' }).click();
        await page.getByRole('textbox', { name: 'Externe Patientenfallnummer' }).fill('playwrigt 2');
        await page.getByRole('textbox', { name: 'Externe Patientenfallnummer' }).press('Tab');
        await expect(page.getByRole('textbox', { name: 'Fallbeschreibung' })).toHaveValue('Pes adductus und Hallux valgus');
        await page.getByRole('button', { name: 'Weiter' }).click();
      })
      await test.step('3c – Verify validation and selection controls', async () => {
        await page.locator('div:nth-child(2) > div:nth-child(2) > .v-input > .v-input__control > .v-field > .v-field__field > .v-field__input').click();
        await page.locator('div').filter({ hasText: /^SeiteSeiteDieses Feld ist erforderlich$/ }).first().click();
        await page.locator('div').filter({ hasText: 'Patienten- und Fall-' }).nth(4).click();
        await page.getByRole('button', { name: 'Weiter' }).click();
      })
      await test.step('3d – Verify selection controls on "Seite" field', async () => {
        await expect(page.getByRole('status')).toContainText('Operation konnte nicht gespeichert werden.');
        await expect(page.locator('#input-v-323-messages')).toContainText('Dieses Feld ist erforderlich');
        await page.locator('div:nth-child(2) > div:nth-child(2) > .v-input > .v-input__control > .v-field > .v-field__field > .v-field__input').click();
        await page.getByRole('option', { name: 'Links' }).click();
        await page.getByRole('button', { name: 'Weiter' }).click();
      })
      await test.step('3e – Verify ICD/OPS code selection and autocomplete', async () => {
        await page.getByRole('button', { name: 'Alle auswählen' }).click();
        await expect(page.getByRole('main')).toContainText('4 ausgewählt');
        await page.getByRole('button', { name: 'Auswahl aufheben' }).click();
        await expect(page.getByRole('main')).toContainText('0 ausgewählt');
        await page.getByRole('button', { name: 'Standard auswählen' }).click();
        await expect(page.getByRole('main')).toContainText('2 ausgewählt');
        await page.getByRole('button', { name: 'Manuelle Konsultation' }).click();
        await page.locator('.v-input.v-input--horizontal.v-input--center-affix.v-input--density-compact.v-theme--light.v-locale--is-ltr.v-text-field.v-select.v-select--multiple > .v-input__control > .v-field > .v-field__field > .v-field__input').click();
        await page.getByText('followup').click();
        await page.locator('div').filter({ hasText: /^followup$/ }).first().click();
      });
      await test.step('3f – Add consultation note', async () => {
        await page.getByRole('button', { name: 'Notiz hinzufügen' }).click();
        await page.locator('#input-v-478').fill('testing manual consultation note');
        await page.locator('.v-btn.v-btn--elevated.v-theme--light.bg-success').click();
        await expect(page.getByRole('dialog')).toContainText('testing manual consultation note');
      })
      await test.step('add form templates to consultation', async () => {
        await page.getByRole('combobox', { name: 'Formularvorlage' }).click();
        await page.getByText('EFASfor patient').click();
        await page.getByText('AOFAS Forefootfor patient').click();
        await page.getByText('MOXFQfor patient').click();
        await page.getByText('VAS').click();
        await page.getByText('VISA-A').click();
        await expect(page.getByRole('listbox')).toContainText('EFAS');
        await page.getByRole('button', { name: 'Open' }).first().click();
        await expect(page.getByRole('listbox')).toContainText('AOFAS Forefoot');
        await page.locator('div:nth-child(6) > .v-input__control > .v-field > .v-field__field > .v-field__input').click();
      });
      await test.step('3g – Finalize surgery and verify generated links', async () => {
        await page.getByText('Alice Smith').click();
        await page.getByRole('dialog').getByText('Alice Smith').click();
        await page.locator('.mdi-plus.mdi.v-icon.notranslate.v-theme--light.v-icon--size-default.v-icon--clickable').click();
        await expect(page.getByRole('dialog')).toContainText('Alice Smith');
        await expect(page.getByRole('combobox', { name: 'Zugangskode für den Patienten' })).toHaveValue('uza41');
        await page.getByRole('button', { name: 'Neue Konsultation hinzufügen' }).click();
        await expect(page.getByRole('status')).toContainText('Konsultation erfolgreich erstellt! 2x');
        await page.getByRole('button', { name: 'Zurück' }).click();
        await page.getByRole('list').click({
          button: 'middle'
        });
        await expect(page.getByRole('listitem')).toContainText('notiz für die Ewigkeit');
        await page.getByText('OPS-Code auswählen…').click();
        await page.getByRole('textbox', { name: 'Code (Ziffern) oder' }).click();
        await page.getByRole('textbox', { name: 'Code (Ziffern) oder' }).fill('57871a');
        await page.getByText('Kategorie · Klicken zum Auswä').click();
        await page.getByRole('button', { name: 'Übernehmen' }).click();
        await expect(page.getByRole('textbox', { name: 'Therapie Therapie' })).toHaveValue('MICA und basis OT');
        await expect(page.getByRole('textbox', { name: 'Externe ID Externe ID' })).toHaveValue('surgery-1');
        await page.getByRole('button', { name: 'Weiter' }).click();
        await page.getByRole('button', { name: 'Standard auswählen' }).click();
        await page.getByRole('button', { name: 'Standard auswählen' }).click();
        await page.getByRole('button', { name: 'Alle auswählen' }).click();
        await page.getByRole('button', { name: 'Standard auswählen' }).click();
        await page.getByRole('textbox', { name: 'Vorlagen suchen... Vorlagen' }).click();
        await page.getByRole('textbox', { name: 'Vorlagen suchen... Vorlagen' }).click();
        await page.getByRole('textbox', { name: 'Vorlagen suchen... Vorlagen' }).fill('mica');
        await page.getByRole('textbox', { name: 'Vorlagen suchen... Vorlagen' }).press('Enter');
        await expect(page.locator('#input-v-1174')).toHaveValue('http://localhost:5173/patient-overview/69c31d3052ebbfc72a4cc81c');
        await expect(page.locator('#input-v-1180')).toHaveValue('http://localhost:5173/case/69c31da052ebbfc72a4cc82a');
        await expect(page.locator('#input-v-1186')).toHaveValue('http://localhost:5173/flow/uza41');
        await expect(page.locator('#input-v-1192')).toHaveValue('http://localhost:5173/consultation-overview/69c31f0352ebbfc72a4cc845');
        await page.getByRole('button', { name: 'Fertigstellen' }).click();
        });
      })
    })
  })