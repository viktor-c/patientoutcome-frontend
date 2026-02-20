/**
 * Form Version Service
 * 
 * Provides methods for managing form versions including:
 * - Viewing version history
 * - Comparing versions
 * - Restoring previous versions
 * 
 * All version operations require admin or doctor roles.
 */

import { formApi } from '@/api'
import type { PatientFormData } from '@/types/scoring'

export interface FormVersion {
  _id?: string
  formId: string
  version: number
  rawData: PatientFormData | null
  previousRawData: PatientFormData | null
  changedBy: string
  changedAt: string
  changeNotes: string
  isRestoration: boolean
  restoredFromVersion: number | null
}

export interface VersionCompareResult {
  formId: string
  v1: {
    version: number
    changedBy: string
    changedAt: string
    changeNotes: string
    rawData: PatientFormData | null
  }
  v2: {
    version: number
    changedBy: string
    changedAt: string
    changeNotes: string
    rawData: PatientFormData | null
  }
}

export interface ServiceResponse<T> {
  success: boolean
  message: string
  responseObject: T
  statusCode?: number
}

/**
 * Form Version Service
 * Wraps the FormApi to provide version management functionality
 */
export const formVersionService = {
  /**
   * Get version history for a form
   * Returns list of all versions with metadata (excludes large data fields)
   * @param formId - Form ID
   * @returns Promise with array of version metadata
   */
  async getVersionHistory(formId: string): Promise<ServiceResponse<FormVersion[]>> {
    try {
      const response = await formApi.getVersionHistory({ formId })
      return response as unknown as ServiceResponse<FormVersion[]>
    } catch (error: unknown) {
      console.error('Error fetching version history:', error)
      throw error
    }
  },

  /**
   * Get a specific version with full data
   * @param formId - Form ID
   * @param versionNumber - Version number to retrieve
   * @returns Promise with full version data
   */
  async getVersion(formId: string, versionNumber: number): Promise<ServiceResponse<FormVersion>> {
    try {
      const response = await formApi.getVersion({ formId, versionNumber: String(versionNumber) })
      return response as unknown as ServiceResponse<FormVersion>
    } catch (error: unknown) {
      console.error('Error fetching version:', error)
      throw error
    }
  },

  /**
   * Compare two versions
   * Returns both versions for frontend diff rendering
   * @param formId - Form ID
   * @param v1 - First version number
   * @param v2 - Second version number
   * @returns Promise with both versions' data
   */
  async compareVersions(
    formId: string,
    v1: number,
    v2: number
  ): Promise<ServiceResponse<VersionCompareResult>> {
    try {
      const response = await formApi.compareVersions({ formId, v1: String(v1), v2: String(v2) })
      return response as unknown as ServiceResponse<VersionCompareResult>
    } catch (error: unknown) {
      console.error('Error comparing versions:', error)
      throw error
    }
  },

  /**
   * Get list of changes between two versions
   * Useful for showing intermediate changes when comparing non-consecutive versions
   * @param formId - Form ID
   * @param v1 - Start version number
   * @param v2 - End version number
   * @returns Promise with array of change metadata
   */
  async getChangeList(
    formId: string,
    v1: number,
    v2: number
  ): Promise<ServiceResponse<FormVersion[]>> {
    try {
      const response = await formApi.getChangeList({ formId, v1: String(v1), v2: String(v2) })
      return response as unknown as ServiceResponse<FormVersion[]>
    } catch (error: unknown) {
      console.error('Error fetching change list:', error)
      throw error
    }
  },

  /**
   * Restore a previous version
   * Creates a new version with the old data
   * @param formId - Form ID
   * @param versionNumber - Version number to restore
   * @param changeNotes - Optional custom notes (defaults to auto-generated)
   * @returns Promise with updated form
   */
  async restoreVersion(
    formId: string,
    versionNumber: number,
    changeNotes?: string
  ): Promise<ServiceResponse<unknown>> {
    try {
      const response = await formApi.restoreVersion({
        formId,
        versionNumber: String(versionNumber),
        restoreVersionRequest: {
          changeNotes
        }
      })
      return response as unknown as ServiceResponse<unknown>
    } catch (error: unknown) {
      console.error('Error restoring version:', error)
      throw error
    }
  }
}

/**
 * Helper function to format version date for display
 */
export function formatVersionDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date)
}

/**
 * Helper function to get access level color
 */
export function getAccessLevelColor(level: string): string {
  const colors: Record<string, string> = {
    patient: 'success',
    authenticated: 'info',
    inactive: 'grey'
  }
  return colors[level] || 'default'
}

/**
 * Helper function to get access level description
 */
export function getAccessLevelDescription(level: string): string {
  const descriptions: Record<string, string> = {
    patient: 'Patients (via access code)',
    authenticated: 'Healthcare professionals only',
    inactive: 'Form is disabled'
  }
  return descriptions[level] || 'Unknown'
}
