export interface CreateCaseAccessCodeParams {
  caseId: string
  addCodes: (params: { addCodesRequest: { numberOfCodes: number } }) => Promise<{ responseObject?: Array<{ code?: string }> }>
  activateCodeForCase: (code: string, caseId: string) => Promise<{ success?: boolean }>
}

export async function createCaseAccessCode({
  caseId,
  addCodes,
  activateCodeForCase,
}: CreateCaseAccessCodeParams): Promise<string> {
  const response = await addCodes({
    addCodesRequest: { numberOfCodes: 1 },
  })

  const code = response.responseObject?.[0]?.code
  if (!code) {
    throw new Error('No code returned from API')
  }

  const activation = await activateCodeForCase(code, caseId)
  if (!activation.success) {
    throw new Error('Failed to activate code for case')
  }

  return code
}
