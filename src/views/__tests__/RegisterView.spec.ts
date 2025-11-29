import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

describe('RegisterView template adjustments', () => {
  it('should not contain the unused v-slot errors prop on v-form', () => {
    const filePath = resolve(__dirname, '..', 'RegisterView.vue')
    const content = readFileSync(filePath, 'utf8')

    // Ensure the template no longer uses v-slot="{ errors }"
    expect(content).not.toContain('v-slot="{ errors }"')
  })
})
