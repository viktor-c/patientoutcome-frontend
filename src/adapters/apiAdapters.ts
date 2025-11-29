/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FindAllCodes200ResponseResponseObjectInnerConsultationIdPromsInner as FormFromApi } from '@/api'
import type { GetAllPatientCases200ResponseResponseObjectInner as PatientCaseFromApi } from '@/api'
import type { GetAllPatientCases200ResponseResponseObjectInnerSurgeriesInner as SurgeryFromApi } from '@/api'
import type { Form, PatientCase, Surgery, FormData, ScoringData } from '@/types'

// Convert generated form model to internal Form
export function mapApiFormToForm(api: FormFromApi): Form {
  return {
    id: api.id || null,
    _id: api.id || '', // For backward compatibility 
    title: api.title || '',
    description: api.description || '',
    formSchema: api.formSchema || {},
    formSchemaUI: api.formSchemaUI || {},
    formData: (api.formData as FormData) || {},
    translations: api.translations as Record<string, Record<string, unknown>> | undefined,
    caseId: api.caseId || null,
    consultationId: api.consultationId || null,
    formTemplateId: api.formTemplateId || null,
    scoring: api.scoring as unknown as ScoringData || undefined,
    createdAt: api.createdAt,
    formFillStatus: api.formFillStatus as 'draft' | 'incomplete' | 'completed' | undefined,
    updatedAt: api.updatedAt,
    completedAt: api.completedAt,
    formStartTime: api.formStartTime,
    formEndTime: api.formEndTime,
    completionTimeSeconds: api.completionTimeSeconds,
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
    patient: (api as any).patient && typeof (api as any).patient === 'object' ? (api as any).patient._id || (api as any).patient.id : api.patient as any,
    mainDiagnosis: api.mainDiagnosis,
    studyDiagnosis: api.studyDiagnosis,
    mainDiagnosisICD10: api.mainDiagnosisICD10,
    studyDiagnosisICD10: api.studyDiagnosisICD10,
    otherDiagnosis: api.otherDiagnosis,
    otherDiagnosisICD10: api.otherDiagnosisICD10,
    medicalHistory: api.medicalHistory,
    // Normalize surgeries and supervisors to arrays of IDs (string[]). The API may return
    // either an array of objects or an array of string IDs depending on endpoint.
    surgeries: (api.surgeries || []).map((s: any) => (typeof s === 'string' ? s : s.id || s._id)).filter(Boolean),
    supervisors: (api.supervisors || []).map((s: any) => (typeof s === 'string' ? s : s.id || s._id)).filter(Boolean),
  }
}

export function mapApiSurgeries(apiSurgeries: SurgeryFromApi[] = []): Surgery[] {
  return apiSurgeries.map(s => ({
    id: s.id,
    externalId: s.externalId,
    diagnosis: s.diagnosis,
    diagnosisICD10: s.diagnosisICD10,
    therapy: s.therapy,
    OPSCodes: s.oPSCodes,
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
    surgeons: (s as any).surgeons || [], // Handle optional surgeons field
    patientCase: s.patientCase,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }))
}
