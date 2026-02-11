/**
 * Form Plugin System Type Definitions
 * 
 * This file defines the interface for form plugins in the application.
 * Each form (MOXFQ, VISA-A, etc.) implements this plugin interface.
 */

import type { Component } from 'vue'
import type { ScoringData } from '@/types/backend/scoring'

/**
 * Base form data structure - flexible to accommodate different form types
 */
export type FormData = Record<string, Record<string, number | string | null>>

/**
 * Translation structure for a form
 * Organized by locale, then by translation key
 */
export interface FormTranslations {
  [locale: string]: {
    [key: string]: string
  }
}

/**
 * Metadata about a form plugin
 */
export interface FormPluginMetadata {
  /** Unique identifier for the form (matches backend templateId) */
  id: string
  
  /** Display name of the form */
  name: string
  
  /** Brief description of what this form measures */
  description: string
  
  /** Version of the form (for tracking updates) */
  version: string
  
  /** List of supported locales */
  supportedLocales: string[]
}

/**
 * Props that every form component must accept
 */
export interface FormComponentProps {
  /** Current form data (v-model) */
  modelValue: FormData
  
  /** Whether the form is in read-only mode */
  readonly?: boolean
  
  /** Current locale for translations */
  locale?: string
}

/**
 * Events that every form component must emit
 */
export interface FormComponentEvents {
  /** Emitted when form data changes */
  'update:modelValue': [value: FormData]
  
  /** Emitted when scoring data changes */
  'score-change': [scoring: ScoringData]
  
  /** Emitted when form validation state changes */
  'validation-change': [isValid: boolean]
}

/**
 * Main plugin interface - every form must implement this
 */
export interface FormPlugin {
  /** Plugin metadata */
  metadata: FormPluginMetadata
  
  /** Vue component for rendering the form */
  component: Component
  
  /** Translations for all supported locales */
  translations: FormTranslations
  
  /** 
   * Calculate scoring from form data
   * This logic should match the backend scoring calculation
   */
  calculateScore: (formData: FormData) => ScoringData
  
  /** 
   * Validate form data
   * @returns true if data is valid, false otherwise
   */
  validateFormData: (formData: FormData) => boolean
  
  /**
   * Generate empty/initial form data structure
   */
  getInitialData: () => FormData
  
  /**
   * Optional: Generate mock data for testing
   */
  generateMockData?: () => FormData
  
  /**
   * Optional: JSON schema for data validation
   */
  schema?: Record<string, unknown>
}

/**
 * Form plugin registry entry
 */
export interface FormPluginRegistryEntry {
  plugin: FormPlugin
  /** When the plugin was registered */
  registeredAt: Date
}

/**
 * Form plugin registry
 */
export type FormPluginRegistry = Map<string, FormPluginRegistryEntry>
