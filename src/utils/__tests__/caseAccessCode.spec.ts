import { describe, expect, it, vi } from 'vitest'
import { createCaseAccessCode } from '../caseAccessCode'

describe('createCaseAccessCode', () => {
  it('creates a new code and activates it for the case', async () => {
    const addCodes = vi.fn().mockResolvedValue({
      responseObject: [{ code: 'NEWCODE123' }],
    })
    const activateCodeForCase = vi.fn().mockResolvedValue({ success: true })

    const code = await createCaseAccessCode({
      caseId: 'case-1',
      addCodes,
      activateCodeForCase,
    })

    expect(code).toBe('NEWCODE123')
    expect(addCodes).toHaveBeenCalledWith({
      addCodesRequest: { numberOfCodes: 1 },
    })
    expect(activateCodeForCase).toHaveBeenCalledWith('NEWCODE123', 'case-1')
  })
})
