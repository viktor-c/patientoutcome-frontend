import { describe, it, expect } from 'vitest'
import { extractObjectId, toApiPatientFormData } from '../formDataUtils'

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

    it('should return null for non-object primitives', () => {
      expect(extractObjectId('string')).toBeNull()
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
      const data = { section: { q1: 1, q2: 2 } }
      const result = toApiPatientFormData(data as any)
      expect(result).toBe(data)
    })
  })
})
