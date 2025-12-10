import { reactive } from 'vue'

/**
 * Composable for form validation with error tracking
 * Provides validation rules and error state management
 */
export function useFormValidation() {
  const errors = reactive<Record<string, string>>({})
  // Track which fields have been touched/interacted with
  const touchedFields = reactive<Record<string, boolean>>({})

  // Common validation rules
  const rules = {
    required: (value: unknown, fieldName: string = 'This field') => {
      if (!value || (typeof value === 'string' && !value.trim())) {
        return `${fieldName} is required`
      }
      if (Array.isArray(value) && value.length === 0) {
        return `${fieldName} is required`
      }
      return true
    },
    email: (value: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(value) || 'Valid email is required'
    },
    minLength: (min: number) => (value: string) => {
      return !value || value.length >= min || `Minimum length is ${min} characters`
    },
    maxLength: (max: number) => (value: string) => {
      return !value || value.length <= max || `Maximum length is ${max} characters`
    },
    minValue: (min: number) => (value: number) => {
      return value === null || value === undefined || value >= min || `Minimum value is ${min}`
    },
    maxValue: (max: number) => (value: number) => {
      return value === null || value === undefined || value <= max || `Maximum value is ${max}`
    },
  }

  /**
   * Mark a field as touched (user has interacted with it)
   */
  const touchField = (fieldName: string) => {
    touchedFields[fieldName] = true
  }

  /**
   * Validate a single field using provided validators
   * @param fieldName - The field name (used for error tracking and display)
   * @param value - The value to validate
   * @param validators - Array of validator functions that return true or error message
   * @returns true if valid, false if invalid (error message stored in errors object)
   */
  const validateField = (
    fieldName: string,
    value: unknown,
    validators: Array<(val: unknown) => boolean | string>
  ): boolean => {
    for (const validator of validators) {
      const result = validator(value)
      if (result !== true) {
        errors[fieldName] = result as string
        return false
      }
    }
    clearFieldError(fieldName)
    return true
  }

  /**
   * Validate an entire form
   * @param formData - Object containing field names and values
   * @param validationRules - Object mapping field names to arrays of validators
   * @returns true if all fields are valid
   */
  const validateForm = (
    formData: Record<string, unknown>,
    validationRules: Record<string, Array<(val: unknown) => boolean | string>>
  ): boolean => {
    let isValid = true
    Object.entries(validationRules).forEach(([fieldName, validators]) => {
      const value = formData[fieldName]
      if (!validateField(fieldName, value, validators)) {
        isValid = false
      }
    })
    return isValid
  }

  /**
   * Clear error for a specific field
   */
  const clearFieldError = (fieldName: string) => {
    delete errors[fieldName]
  }

  /**
   * Clear all errors
   */
  const clearAllErrors = () => {
    Object.keys(errors).forEach(key => delete errors[key])
  }

  /**
   * Reset touched state and all errors (use when navigating between form steps)
   */
  const resetFormState = () => {
    clearAllErrors()
    Object.keys(touchedFields).forEach(key => delete touchedFields[key])
  }

  /**
   * Check if a field has an error
   */
  const hasError = (fieldName: string): boolean => {
    return !!errors[fieldName]
  }

  /**
   * Check if a field has been touched
   */
  const isFieldTouched = (fieldName: string): boolean => {
    return !!touchedFields[fieldName]
  }

  /**
   * Get error message for a field only if it has been touched
   */
  const getError = (fieldName: string): string => {
    // Only show errors for fields that have been touched or are currently being validated
    if (!isFieldTouched(fieldName) && errors[fieldName]) {
      return ''
    }
    return errors[fieldName] || ''
  }

  /**
   * Get error for a field regardless of touched state (use during form submission)
   */
  const getErrorForce = (fieldName: string): string => {
    return errors[fieldName] || ''
  }

  return {
    errors,
    touchedFields,
    rules,
    validateField,
    validateForm,
    clearFieldError,
    clearAllErrors,
    resetFormState,
    touchField,
    hasError,
    isFieldTouched,
    getError,
    getErrorForce,
  }
}
