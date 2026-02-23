import { describe, it, expect } from 'vitest'
import { useFormValidation } from '../useFormValidation'

describe('useFormValidation', () => {
  describe('rules.required', () => {
    it('should return true for non-empty string', () => {
      const { rules } = useFormValidation()
      expect(rules.required('hello')).toBe(true)
    })

    it('should return error message for empty string', () => {
      const { rules } = useFormValidation()
      const result = rules.required('', 'Name')
      expect(result).toContain('Name')
    })

    it('should return error message for whitespace-only string', () => {
      const { rules } = useFormValidation()
      const result = rules.required('   ')
      expect(typeof result).toBe('string')
    })

    it('should return error message for empty array', () => {
      const { rules } = useFormValidation()
      const result = rules.required([])
      expect(typeof result).toBe('string')
    })

    it('should return true for non-empty array', () => {
      const { rules } = useFormValidation()
      expect(rules.required(['item'])).toBe(true)
    })

    it('should use default field name when not provided', () => {
      const { rules } = useFormValidation()
      const result = rules.required('')
      expect(result).toContain('This field')
    })
  })

  describe('rules.email', () => {
    it('should return true for valid email', () => {
      const { rules } = useFormValidation()
      expect(rules.email('user@example.com')).toBe(true)
    })

    it('should return error message for invalid email', () => {
      const { rules } = useFormValidation()
      expect(rules.email('not-an-email')).toContain('email')
      expect(rules.email('missing@domain')).toContain('email')
      expect(rules.email('@nodomain.com')).toContain('email')
    })
  })

  describe('rules.minLength', () => {
    it('should return true when value meets minimum length', () => {
      const { rules } = useFormValidation()
      expect(rules.minLength(3)('abc')).toBe(true)
      expect(rules.minLength(3)('abcd')).toBe(true)
    })

    it('should return error message when value is too short', () => {
      const { rules } = useFormValidation()
      const result = rules.minLength(5)('abc')
      expect(result).toContain('5')
    })

    it('should return true for empty/falsy value (not required)', () => {
      const { rules } = useFormValidation()
      expect(rules.minLength(5)('')).toBe(true)
    })
  })

  describe('rules.maxLength', () => {
    it('should return true when value is within max length', () => {
      const { rules } = useFormValidation()
      expect(rules.maxLength(10)('hello')).toBe(true)
    })

    it('should return error message when value exceeds max', () => {
      const { rules } = useFormValidation()
      const result = rules.maxLength(3)('toolong')
      expect(result).toContain('3')
    })

    it('should return true for empty/falsy value', () => {
      const { rules } = useFormValidation()
      expect(rules.maxLength(3)('')).toBe(true)
    })
  })

  describe('rules.minValue', () => {
    it('should return true when value meets minimum', () => {
      const { rules } = useFormValidation()
      expect(rules.minValue(0)(5)).toBe(true)
      expect(rules.minValue(0)(0)).toBe(true)
    })

    it('should return error message when value is below minimum', () => {
      const { rules } = useFormValidation()
      const result = rules.minValue(10)(5)
      expect(result).toContain('10')
    })

    it('should return true for null or undefined (unanswered)', () => {
      const { rules } = useFormValidation()
      expect(rules.minValue(5)(null as unknown as number)).toBe(true)
      expect(rules.minValue(5)(undefined as unknown as number)).toBe(true)
    })
  })

  describe('rules.maxValue', () => {
    it('should return true when value is within max', () => {
      const { rules } = useFormValidation()
      expect(rules.maxValue(10)(5)).toBe(true)
      expect(rules.maxValue(10)(10)).toBe(true)
    })

    it('should return error message when value exceeds max', () => {
      const { rules } = useFormValidation()
      const result = rules.maxValue(10)(15)
      expect(result).toContain('10')
    })

    it('should return true for null or undefined', () => {
      const { rules } = useFormValidation()
      expect(rules.maxValue(10)(null as unknown as number)).toBe(true)
    })
  })

  describe('validateField', () => {
    it('should return true and clear error when all validators pass', () => {
      const { validateField, errors } = useFormValidation()
      errors['name'] = 'previous error'

      const result = validateField('name', 'Alice', [v => (v ? true : 'Required')])

      expect(result).toBe(true)
      expect(errors['name']).toBeUndefined()
    })

    it('should return false and set error when a validator fails', () => {
      const { validateField, errors } = useFormValidation()
      const result = validateField('name', '', [() => 'Name is required'])

      expect(result).toBe(false)
      expect(errors['name']).toBe('Name is required')
    })

    it('should stop at first failing validator', () => {
      const { validateField, errors } = useFormValidation()
      validateField('field', 'x', [() => 'Error 1', () => 'Error 2'])
      expect(errors['field']).toBe('Error 1')
    })
  })

  describe('validateForm', () => {
    it('should return true when all fields pass validation', () => {
      const { validateForm } = useFormValidation()
      const result = validateForm(
        { email: 'test@example.com', name: 'Alice' },
        {
          email: [v => (typeof v === 'string' && v.includes('@') ? true : 'Bad email')],
          name: [v => (v ? true : 'Required')],
        }
      )
      expect(result).toBe(true)
    })

    it('should return false when any field fails', () => {
      const { validateForm, errors } = useFormValidation()
      const result = validateForm(
        { email: 'invalid', name: '' },
        {
          email: [v => (typeof v === 'string' && v.includes('@') ? true : 'Bad email')],
          name: [v => (v ? true : 'Name required')],
        }
      )
      expect(result).toBe(false)
      expect(errors['email']).toBe('Bad email')
      expect(errors['name']).toBe('Name required')
    })
  })

  describe('clearFieldError / clearAllErrors', () => {
    it('should clear a single field error', () => {
      const { errors, clearFieldError } = useFormValidation()
      errors['field1'] = 'error'
      errors['field2'] = 'error'

      clearFieldError('field1')

      expect(errors['field1']).toBeUndefined()
      expect(errors['field2']).toBe('error')
    })

    it('should clear all errors', () => {
      const { errors, clearAllErrors } = useFormValidation()
      errors['f1'] = 'e1'
      errors['f2'] = 'e2'

      clearAllErrors()

      expect(Object.keys(errors)).toHaveLength(0)
    })
  })

  describe('touchField / isFieldTouched', () => {
    it('should mark field as touched', () => {
      const { touchField, isFieldTouched } = useFormValidation()
      expect(isFieldTouched('name')).toBe(false)

      touchField('name')

      expect(isFieldTouched('name')).toBe(true)
    })
  })

  describe('hasError', () => {
    it('should return true when field has an error', () => {
      const { errors, hasError } = useFormValidation()
      errors['email'] = 'Invalid'
      expect(hasError('email')).toBe(true)
    })

    it('should return false when field has no error', () => {
      const { hasError } = useFormValidation()
      expect(hasError('email')).toBe(false)
    })
  })

  describe('getError', () => {
    it('should return empty string for untouched field with error', () => {
      const { validateField, getError } = useFormValidation()
      validateField('field', '', [() => 'Required'])

      // Field not yet touched → getError should return ''
      expect(getError('field')).toBe('')
    })

    it('should return error for touched field with error', () => {
      const { validateField, touchField, getError } = useFormValidation()
      touchField('field')
      validateField('field', '', [() => 'Required'])

      expect(getError('field')).toBe('Required')
    })
  })

  describe('getErrorForce', () => {
    it('should return error regardless of touched state', () => {
      const { validateField, getErrorForce } = useFormValidation()
      validateField('field', '', [() => 'Required'])

      expect(getErrorForce('field')).toBe('Required')
    })
  })

  describe('resetFormState', () => {
    it('should clear errors and touched state', () => {
      const { errors, touchedFields, touchField, resetFormState } = useFormValidation()
      errors['field'] = 'error'
      touchField('field')

      resetFormState()

      expect(Object.keys(errors)).toHaveLength(0)
      expect(Object.keys(touchedFields)).toHaveLength(0)
    })
  })
})
