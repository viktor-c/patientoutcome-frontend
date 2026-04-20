/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  ApiConsultationForm as FormFromApi,
  ApiPatientCaseWithDetails as PatientCaseFromApi,
  ApiPatientCaseSurgery as SurgeryFromApi,
  Form,
  PatientCase,
  Surgery,
} from '@/types'

// Helper to extract ID from potentially populated object or string
const extractId = (val: any): string | null => {
  if (val == null) return null
  if (typeof val === 'string') return val
  if (typeof val === 'object') return val.id || val._id || null
  return String(val)
}

// Convert generated form model to internal Form
export function mapApiFormToForm(api: FormFromApi): Form {
  const normalizedId = api.id == null ? null : String(api.id)

  return {
    id: normalizedId,
    _id: normalizedId || '', // For backward compatibility 
    title: api.title || '',
    description: api.description || '',
    accessLevel: (api as any).accessLevel || undefined,
    formFillStatus: (api as any).formFillStatus || (api as any).patientFormData?.fillStatus || undefined,
    patientFormData: (api as any).patientFormData || null,
    caseId: extractId(api.caseId),
    consultationId: extractId(api.consultationId),
    formTemplateId: extractId(api.formTemplateId),
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
    formStartTime: api.formStartTime,
    formEndTime: api.formEndTime,
    completionTimeSeconds: api.completionTimeSeconds,
    deletedAt: (api as any).deletedAt || null,
    deletedBy: (api as any).deletedBy || null,
    deletionReason: (api as any).deletionReason || null,
  }
}

export function mapApiFormsToForms(apiForms: (FormFromApi | undefined | null)[] = []): Form[] {
  return apiForms.filter(Boolean).map(f => mapApiFormToForm(f as FormFromApi))
}

export function mapApiPatientCase(api: PatientCaseFromApi): PatientCase {
  return {
    id: api.id,
    externalId: api.externalId,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
    patient: extractId((api as any).patient),
    mainDiagnosis: api.mainDiagnosis,
    mainDiagnosisICD10: api.mainDiagnosisICD10,
    otherDiagnosis: api.otherDiagnosis,
    otherDiagnosisICD10: api.otherDiagnosisICD10,
    medicalHistory: api.medicalHistory,
    // Normalize surgeries and supervisors to arrays of IDs (string[]). The API may return
    // either an array of objects or an array of string IDs depending on endpoint.
    surgeries: (api.surgeries || []).map((s: any) => extractId(s)).filter((s): s is string => !!s),
    supervisors: (api.supervisors || []).map((s: any) => extractId(s)).filter((s): s is string => !!s),
  }
}

export function mapApiSurgeries(apiSurgeries: SurgeryFromApi[] = []): Surgery[] {
  return apiSurgeries.map(s => ({
    id: s.id,
    externalId: s.externalId,
    diagnosis: s.diagnosis,
    diagnosisICD10: s.diagnosisICD10,
    therapy: s.therapy,
    OPSCodes: (s as any).oPSCodes ?? (s as any).OPSCodes,
    side: s.side as 'left' | 'right' | 'none',
    surgeryDate: s.surgeryDate,
    surgeryTime: s.surgeryTime,
    tourniquet: s.tourniquet,
    anaesthesiaType: s.anaesthesiaType ? {
      general: (s.anaesthesiaType as any).general,
      regional: (s.anaesthesiaType as any).regional,
      local: (s.anaesthesiaType as any).local,
      sedation: (s.anaesthesiaType as any).sedation,
      other: (s.anaesthesiaType as any).other,
    } : undefined,
    roentgenDosis: s.roentgenDosis,
    roentgenTime: s.roentgenTime,
    surgeons: ((s as any).surgeons || []).map((surgeon: any) => extractId(surgeon)).filter((id: any): id is string => !!id),
    patientCase: extractId(s.patientCase),
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }))
}
