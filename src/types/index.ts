// Import types directly from backend when backend is available
// For now, we maintain frontend-safe versions that match the backend Zod schemas

// These types should be generated from backend Zod schemas
// Backend Zod schemas are the single source of truth

// Import shared scoring types
import type { FormQuestions, PatientFormData } from './scoring'

// alias for API patient form data type (helps shield components from long names)
// we use an inline import here to avoid exporting the long generated symbol itself
export type ApiPatientFormData = import('@/api').FindAllCodes200ResponseResponseObjectInnerConsultationIdPromsInnerPatientFormData

export interface Patient {
  _id?: string
  id?: string | null // For OpenAPI compatibility (can be null)
  externalPatientId: string[]
  sex?: string
  cases?: string[]
  createdAt?: string | null
  updatedAt?: string | null
}

export interface PatientCase {
  _id?: string
  id?: string | null // For OpenAPI compatibility (can be null)
  externalId?: string
  createdAt?: string | null
  updatedAt?: string | null
  patient: string | null
  mainDiagnosis?: string[]
  mainDiagnosisICD10?: string[]
  otherDiagnosis?: string[]
  otherDiagnosisICD10?: string[]
  surgeries: string[]
  supervisors: string[]
  medicalHistory?: string
  consultations?: string[]
}

export interface Form {
  _id?: string
  id?: string | null // For OpenAPI compatibility (can be null)
  title?: string
  description?: string
  patientFormData?: PatientFormData | null
  caseId?: string | null
  consultationId?: string | null
  formTemplateId?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  formStartTime?: string | null
  formEndTime?: string | null
  completionTimeSeconds?: number
  deletedAt?: string | null
  deletedBy?: string | null
  deletionReason?: string | null
}

export interface Surgery {
  _id?: string
  id?: string | null // For OpenAPI compatibility (can be null)
  externalId?: string
  diagnosis?: string[]
  diagnosisICD10?: string[]
  therapy?: string
  OPSCodes?: string[]
  side: 'left' | 'right' | 'none'
  surgeryDate: string | null
  surgeryTime?: number
  tourniquet?: number
  anaesthesiaType?: {
    general?: boolean
    regional?: boolean
    local?: boolean
    sedation?: boolean
    other?: string
  }
  roentgenDosis?: number
  roentgenTime?: string
  additionalData?: Array<{
    content: string
    createdAt?: string
    createdBy?: string
  }>
  surgeons?: string[] // Made optional to match API response
  patientCase: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface User {
  _id?: string
  id?: string // For OpenAPI compatibility
  username: string
  name: string
  email: string
  department?: string
  belongsToCenter?: string[]
  roles: string[]
  daysBeforeConsultations?: number
  createdAt?: string
  updatedAt?: string
}

// Legacy types - Used in MoxfqTableRenderer and other places
// These map to backend FormQuestions type
export interface questions {
  [key: string]: string | number | null;
}

// export type formData = {
//   [key: string]: questions;
// };

// Standard FormData types (matching backend Zod schema)
// Questionnaire represents a set of questions with numeric, string, or null answers
export type Questionnaire = Record<string, string | number | null>;

/**
 * Legacy FormData interface - deprecated, use PatientFormData instead
 * @deprecated Use PatientFormData from './scoring' instead
 */
export interface FormData {
  rawData: FormQuestions | null;
  scoring: import('./scoring').ScoringData;
  isComplete: boolean;
  completedAt?: string | null;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  responseObject?: T
  statusCode: number
}

export interface ApiError {
  message: string
  code?: string
  details?: unknown
}


export * from './scoring'