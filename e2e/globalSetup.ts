import type { FullConfig } from '@playwright/test'

/**
 * Global setup: runs once before all Playwright tests.
 * Reseeds the database with fresh mock data so every test run starts clean.
 */
async function globalSetup(_config: FullConfig) {
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:40001'
  const seedUrl = `${backendUrl}/seed/reset-all`

  console.log(`\n[globalSetup] Reseeding database via ${seedUrl} …`)

  const response = await fetch(seedUrl, { method: 'GET' })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `[globalSetup] DB seed failed (HTTP ${response.status}): ${body}`,
    )
  }

  const result = await response.json() as { success?: boolean; message?: string }
  console.log(`[globalSetup] DB seed response: ${result.message ?? 'OK'}\n`)
}

export default globalSetup
