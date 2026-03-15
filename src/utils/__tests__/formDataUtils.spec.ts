import { describe, it, expect } from 'vitest'
import { extractObjectId, toApiPatientFormData } from '../formDataUtils'
import type { FormSubmissionData } from '@/forms/types'

describe('formDataUtils', () => {
  describe('extractObjectId', () => {
    it('should return id from object with id field', () => {
      const result = extractObjectId({ id: 'abc123' })
      expect(result).toBe('abc123')
    })

    it('should return _id from object with _id field', () => {
      const result = extractObjectId({ _id: 'xyz789' })
      expect(result).toBe('xyz789')
    })

    it('should prefer id over _id when both are present', () => {
      const result = extractObjectId({ id: 'primary', _id: 'secondary' })
      expect(result).toBe('primary')
    })

    it('should return null for null input', () => {
      expect(extractObjectId(null)).toBeNull()
    })

    it('should return null for undefined input', () => {
      expect(extractObjectId(undefined)).toBeNull()
    })

    it('should return string as-is for string input', () => {
      expect(extractObjectId('string')).toBe('string')
      expect(extractObjectId('object-id-123')).toBe('object-id-123')
    })

    it('should return null for null and non-string primitives', () => {
      expect(extractObjectId(null)).toBeNull()
      expect(extractObjectId(42)).toBeNull()
      expect(extractObjectId(true)).toBeNull()
    })

    it('should return null when id is not a string', () => {
      expect(extractObjectId({ id: 123 })).toBeNull()
      expect(extractObjectId({ id: null })).toBeNull()
    })

    it('should return null for empty string id', () => {
      expect(extractObjectId({ id: '' })).toBeNull()
    })

    it('should fall through to _id when id is empty string', () => {
      const result = extractObjectId({ id: '', _id: 'fallback' })
      expect(result).toBe('fallback')
    })

    it('should return null when neither id nor _id are present', () => {
      expect(extractObjectId({ name: 'John' })).toBeNull()
    })
  })

  describe('toApiPatientFormData', () => {
    it('should pass through the data unchanged', () => {
      const data = { section: { q1: 1, q2: 2 } } as unknown as FormSubmissionData
      const result = toApiPatientFormData(data)
      expect(result).toBe(data)
    })
  })
})
