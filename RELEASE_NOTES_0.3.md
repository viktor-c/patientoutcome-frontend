# Release Notes 0.3

Release date: 2026-04-16

## Highlights

- Added stronger end-to-end coverage for patient creation and patient form-filling flows.
- Added visible code expiry information and clearer renewal actions in the consultation flow.
- Added frontend and backend build references to the UI footer and about page.
- Preserved intended protected-route destinations through login and session-expiry redirects.
- Restored consultation creation actions on case views when only past consultations exist.
- Fixed consultation edit mode so new QR/access codes can be generated directly.
- Added case-level notes support from the patient case view.

## User-facing fixes

- Users are redirected back to their originally requested protected page after authentication.
- Users can create a new consultation from a case that only contains past consultations.
- Users can generate a new consultation access code while editing a consultation.
- Staff can record case-level notes such as paper-based PROM collection context.

## Quality

- Expanded Playwright coverage for the patient creation and form completion flows.
- Improved testability through additional test hooks and E2E cleanup.
