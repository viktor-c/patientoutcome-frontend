import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

describe('ChangePasswordDialog adjustments', () => {
  it('should log the caught error variable in catch block', () => {
    const filePath = resolve(__dirname, '..', 'ChangePasswordDialog.vue')
    const content = readFileSync(filePath, 'utf8')

    // We expect the catch block to reference console.error with the error variable
    expect(content).toContain("console.error('Change password error:'")
    expect(content).toContain("notifierStore.notify(t('changePassword.error_api'), 'error')")
  })
})
