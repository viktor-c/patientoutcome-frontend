import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearPostLoginRedirect,
  getPostLoginRedirect,
  savePostLoginRedirect,
} from '@/utils/postLoginRedirect'

describe('postLoginRedirect', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('stores and reads a valid internal path', () => {
    savePostLoginRedirect('/patients/123?tab=forms')
    expect(getPostLoginRedirect()).toBe('/patients/123?tab=forms')
  })

  it('does not store login route redirects', () => {
    savePostLoginRedirect('/login?reason=session-expired')
    expect(getPostLoginRedirect()).toBeUndefined()
  })

  it('does not store external or malformed redirects', () => {
    savePostLoginRedirect('https://example.com/evil')
    expect(getPostLoginRedirect()).toBeUndefined()

    savePostLoginRedirect('//example.com/evil')
    expect(getPostLoginRedirect()).toBeUndefined()
  })

  it('clears stored redirect', () => {
    savePostLoginRedirect('/dashboard')
    clearPostLoginRedirect()
    expect(getPostLoginRedirect()).toBeUndefined()
  })
})
