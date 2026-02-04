<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import { useNotifierStore } from '@/stores/notifierStore'
import { useUserStore } from '@/stores/userStore'
import type {
  Patient,
  Consultation,
  Surgery,
  CreatePatientRequest,
  CreateCaseSchema,
  Blueprint,
  GetAllPatientCases200ResponseResponseObjectInner
} from '@/api'
import { ResponseError, userDepartmentApi } from '@/api'
//step 1: create patient
//step 2: create case
import PatientCaseCreateEditForm from '@/components/forms/PatientCaseCreateEditForm.vue'
//step 3: create surgery
import CreateEditSurgeryDialog from '@/components/dialogs/CreateEditSurgeryDialog.vue'
//step 4: create consultations (from surgery blueprint or manual selection)
import ConsultationBlueprintSelectionDialog from '@/components/dialogs/ConsultationBlueprintSelectionDialog.vue'
import QRCodeDisplay from '@/components/QRCodeDisplay.vue'
import { logger } from '@/services/logger'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const notifierStore = useNotifierStore()
const userStore = useUserStore()

// =============================================================================
// URL PATTERNS FOR DIRECT ACCESS LINKS
// =============================================================================
const PATIENT_URL_PATTERN = '/patient-overview/{id}'
const CASE_URL_PATTERN = '/case/{id}'
// =============================================================================

// Current step in the flow (1: Patient, 2: Case, 3: Surgery, 4: Consultation, 5: Completion)
const currentStep = ref(1)

// Consultation flow substeps: 4a (blueprint selection) or 4b (manual creation/completion)
const consultationFlowStep = ref<'4a' | '4b'>('4a')

// Data for each step
const patientData = ref<CreatePatientRequest & { department?: string }>({
  externalPatientId: [''],
  sex: '',
  department: userStore.department, // Auto-assign user's department
})

const showExternalIdWarning = ref(false)

const caseData = ref<CreateCaseSchema>({
  patient: '',
  externalId: '', // This is the externalPatientCaseId - unique identifier for the patient case
  mainDiagnosis: [],
  mainDiagnosisICD10: [],
  otherDiagnosis: [],
  otherDiagnosisICD10: [],
  surgeries: [],
  supervisors: [],
  notes: [],
  medicalHistory: ''
})

// Created objects
const createdPatient = ref<Patient | null>(null)
const createdCase = ref<GetAllPatientCases200ResponseResponseObjectInner | null>(null)
const createdSurgery = ref<Surgery | null>(null)
const createdConsultations = ref<Consultation[]>([])

// Track whether surgery is being skipped
const skipSurgery = ref(false)

// Consultation blueprint management
const selectedConsultationBlueprints = ref<Blueprint[]>([])
const surgeryBlueprintConsultations = ref<string[]>([])

// Surgery blueprint management
const surgeryBlueprintId = ref<string | null>(null)

// Form refs for external submission
const caseFormRef = ref<InstanceType<typeof PatientCaseCreateEditForm> | null>(null)
const surgeryFormRef = ref<InstanceType<typeof CreateEditSurgeryDialog> | null>(null)
const consultationFormRef = ref<InstanceType<typeof ConsultationBlueprintSelectionDialog> | null>(null)

// Duplicate patient handling
const showDuplicatePatientDialog = ref(false)
const duplicateExternalId = ref<string>('')

// Loading states
const isLoading = ref(false)

// Track if manual consultation dialog is open in step 4b
const isManualConsultationDialogOpen = ref(false)

// Department name display
const departmentName = ref<string>('')

// Listen for consultation flow substep transitions
const handleConsultationFlowAdvance = (substep: '4a' | '4b') => {
  consultationFlowStep.value = substep
}

// Watch currentStep to reset form errors when navigating between steps
watch(currentStep, (newStep, oldStep) => {
  if (newStep !== oldStep) {
    // Reset form state when moving to a different step
    if (caseFormRef.value?.resetFormState) {
      caseFormRef.value.resetFormState()
    }
    if (surgeryFormRef.value?.resetFormState) {
      surgeryFormRef.value.resetFormState()
    }
    if (consultationFormRef.value?.resetFormState) {
      consultationFormRef.value.resetFormState()
    }

    // Populate patient data when navigating back to step 1
    if (newStep === 1 && createdPatient.value) {
      patientData.value = {
        externalPatientId: createdPatient.value.externalPatientId || [''],
        sex: createdPatient.value.sex || ''
      }
    }

    // Show step-specific notifications
    if (newStep === 1) {
      // Step 1: Patient creation
      notifierStore.notify(t('alerts.patient.optionalFieldsInfo'), 'info')
      if (showExternalIdWarning.value) {
        notifierStore.notify(t('alerts.patient.noExternalIdWarning'), 'warning')
      }
    } else if (newStep === 2) {
      // Step 2: Case creation
      if (createdPatient.value) {
        notifierStore.notify(`${t('creationFlow.patientCreated')} - ID: ${createdPatient.value.id}`, 'success')
      }
    } else if (newStep === 3) {
      // Step 3: Surgery creation
      if (createdCase.value) {
        notifierStore.notify(`${t('creationFlow.caseCreated')} - ID: ${createdCase.value.id}`, 'success')
      }
      if (surgeryBlueprintId.value) {
        notifierStore.notify(t('creationFlow.surgeryBlueprintPrefilled'), 'info')
      }
      notifierStore.notify(t('creationFlow.surgeryOptionalInfo'), 'info')
    } else if (newStep === 4) {
      // Step 4: Consultation creation
      consultationFlowStep.value = '4a'

      // Show surgery status notifications
      if (createdSurgery.value) {
        notifierStore.notify(`${t('creationFlow.surgeryCreated')} - ID: ${createdSurgery.value.id}`, 'success')
      } else if (skipSurgery.value) {
        notifierStore.notify(t('creationFlow.surgerySkippedInfo'), 'info')
      }
    } else if (newStep === 5) {
      // Step 5: Completion
      notifierStore.notify(t('creationFlow.flowCompleted'), 'success')
      if (createdConsultations.value.length > 0) {
        notifierStore.notify(t('creationFlow.consultationsCreated', { count: createdConsultations.value.length }), 'info')
      }
    }
  }
})// Use centralized API instance
import { patientApi, consultationApi } from '@/api'

// Sex options for patient
const sexOptions = [
  { value: 'male', label: t('forms.patientCase.sexOptions.male') },
  { value: 'female', label: t('forms.patientCase.sexOptions.female') },
  { value: 'diverse', label: t('forms.patientCase.sexOptions.diverse') },
  { value: 'not_disclosed', label: t('forms.patientCase.sexOptions.notDisclosed') },
]

// Computed properties
const canProceedFromStep1 = computed(() => {
  // All fields are optional for GDPR compliance
  return true
})

const canProceedFromStep2 = computed(() => {
  // Since we're not using v-model anymore, we'll validate this inside the form component
  // For now, always allow proceeding - the form will handle validation
  return true
})

// Convert createdCase to the format expected by PatientCaseCreateEditForm
const caseForEditing = computed(() => {
  if (!createdCase.value) return null

  // Create a PatientCase object from the created case
  return {
    id: createdCase.value.id,
    externalId: createdCase.value.externalId,
    patient: createdCase.value.patient?.id || createdPatient.value?.id || '',
    mainDiagnosis: createdCase.value.mainDiagnosis,
    mainDiagnosisICD10: createdCase.value.mainDiagnosisICD10,
    studyDiagnosis: createdCase.value.studyDiagnosis,
    studyDiagnosisICD10: createdCase.value.studyDiagnosisICD10,
    otherDiagnosis: createdCase.value.otherDiagnosis,
    otherDiagnosisICD10: createdCase.value.otherDiagnosisICD10,
    medicalHistory: createdCase.value.medicalHistory,
    surgeries: createdCase.value.surgeries || [],
    supervisors: createdCase.value.supervisors || [],
    notes: createdCase.value.notes || [],
    createdAt: createdCase.value.createdAt,
    updatedAt: createdCase.value.updatedAt
  }
})

// API functions
const nextStep = async () => {
  if (currentStep.value === 1) {
    // If patient already created, update it before proceeding
    if (createdPatient.value) {
      await updatePatient()
    } else {
      await createPatient()
    }
  } else if (currentStep.value === 2) {
    // Submit the case form externally (handles both create and update)
    if (caseFormRef.value) {
      await caseFormRef.value.submit()
    }
  } else if (currentStep.value === 3) {
    // Submit the surgery form externally (handles both create and update)
    if (surgeryFormRef.value) {
      await surgeryFormRef.value.submit()
    }
  } else if (currentStep.value === 4) {
    // Step 4 has two substeps: 4a (blueprint selection) and 4b (manual creation)
    if (consultationFlowStep.value === '4a') {
      // Submit the consultation form to create consultations from selected blueprints
      if (consultationFormRef.value) {
        await consultationFormRef.value.submit()
      }
      // The consultation form will emit 'consultation-flow-advance' to move to 4b
    } else {
      // From 4b, we need to fetch all consultations and advance to step 5
      // Fetch consultations for the case to populate the QR code and links
      if (createdCase.value?.id) {
        try {
          logger.info('🔄 Fetching all consultations for case before completing flow:', createdCase.value.id)
          const response = await consultationApi.getAllConsultations({ caseId: createdCase.value.id })
          if (response.responseObject && Array.isArray(response.responseObject)) {
            createdConsultations.value = response.responseObject as Consultation[]
            logger.info('✅ Fetched consultations:', { 
              count: createdConsultations.value.length,
              firstConsultation: createdConsultations.value[0]
            })
          }
        } catch (error) {
          logger.error('❌ Error fetching consultations:', error)
        }
      }
      // Advance to step 5 (completion)
      currentStep.value = 5
    }
  }
}

const previousStep = async () => {
  if (currentStep.value > 1) {
    // Save case before navigating back from step 2
    if (currentStep.value === 2 && createdCase.value && caseFormRef.value) {
      await caseFormRef.value.submit()
      // Don't advance step, the submit handler will be called but we override the step change
      setTimeout(() => {
        currentStep.value = 1
      }, 100)
      return
    }

    // If we skipped surgery and are on step 4, go back to step 3 (surgery step)
    if (skipSurgery.value && currentStep.value === 4) {
      skipSurgery.value = false
      currentStep.value = 3
    } else {
      currentStep.value--
    }
  }
}

// API functions
const createPatient = async () => {
  if (!canProceedFromStep1.value) return

  // Show warning if external ID is missing
  if (!patientData.value.externalPatientId?.[0] || !patientData.value.externalPatientId[0]?.trim()) {
    showExternalIdWarning.value = true
  }

  isLoading.value = true
  try {
    // Filter out empty external IDs
    const filteredExternalIds = (patientData.value.externalPatientId || [])
      .map(id => (id || '').trim())
      .filter(id => id !== '')

    const patientDataToSend: any = {
      ...patientData.value,
      externalPatientId: filteredExternalIds.length > 0 ? filteredExternalIds : undefined,
      department: patientData.value.department || undefined,
    }

    const response = await patientApi.createPatient({
      createPatientRequest: patientDataToSend
    })

    if (response.responseObject) {
      createdPatient.value = response.responseObject
      caseData.value.patient = response.responseObject.id || null
      currentStep.value = 2
      showExternalIdWarning.value = false
      notifierStore.notify(t('creationFlow.patientCreated'), 'success')
    }
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    let errorCode = ''

    if (error instanceof ResponseError) {
      const errorBody = await error.response.json()
      errorMessage = errorBody.message
      errorCode = errorBody.code
    }
    logger.error('❌ Error creating patient:', errorMessage)

    // Check if it's a duplicate external ID error
    if (errorCode === 'DUPLICATE_EXTERNAL_ID' || errorMessage.toLowerCase().includes('external')) {
      // Extract external ID from the first field
      duplicateExternalId.value = patientData.value.externalPatientId?.[0] || ''
      showDuplicatePatientDialog.value = true
      notifierStore.notify(t('alerts.patient.duplicateExternalId'), 'info')
    } else {
      notifierStore.notify(t('alerts.patient.creationFailed'), 'error')
    }
  } finally {
    isLoading.value = false
  }
}

const updatePatient = async () => {
  if (!createdPatient.value?.id) return

  isLoading.value = true
  try {
    // Filter out empty external IDs
    const filteredExternalIds = (patientData.value.externalPatientId || [])
      .map(id => (id || '').trim())
      .filter(id => id !== '')

    const patientDataToSend = {
      ...patientData.value,
      externalPatientId: filteredExternalIds.length > 0 ? filteredExternalIds : undefined
    }

    const response = await patientApi.updatePatient({
      id: createdPatient.value.id,
      updatePatientRequest: patientDataToSend
    })

    if (response.responseObject) {
      createdPatient.value = response.responseObject
      currentStep.value = 2
      notifierStore.notify(t('creationFlow.patientUpdated'), 'success')
    }
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    logger.error('❌ Error updating patient:', errorMessage)
    notifierStore.notify(t('alerts.patient.updateFailed'), 'error')
  } finally {
    isLoading.value = false
  }
}

// Search for patient by external ID and load it
const loadPatientByExternalId = async (externalId: string) => {
  isLoading.value = true
  try {
    // Get patient by external ID
    const response = await patientApi.getPatientByExternalId({ id: externalId })

    if (response.responseObject) {
      createdPatient.value = response.responseObject
      caseData.value.patient = response.responseObject.id || null
      currentStep.value = 2
      showDuplicatePatientDialog.value = false
      notifierStore.notify(t('creationFlow.patientLoaded'), 'success')
      return
    }

    notifierStore.notify(t('alerts.patient.notFound'), 'error')
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    logger.error('❌ Error searching for patient:', errorMessage)
    notifierStore.notify(t('alerts.patient.searchFailed'), 'error')
  } finally {
    isLoading.value = false
  }
}

// Handle user choice to continue with existing patient
const handleContinueWithExistingPatient = async () => {
  await loadPatientByExternalId(duplicateExternalId.value)
}

// Handle user choice to cancel and try again
const handleCancelDuplicateDialog = () => {
  showDuplicatePatientDialog.value = false
  // Keep user on step 1 to try again
}

// Handle case creation from embedded form
const handleCaseSubmit = (caseData: GetAllPatientCases200ResponseResponseObjectInner) => {
  createdCase.value = caseData
  // Only advance step if we're moving forward, not if we're saving before going back
  if (currentStep.value === 2) {
    currentStep.value = 3
  }
  const message = caseData.id === createdCase.value?.id ?
    t('creationFlow.caseUpdated') :
    t('creationFlow.caseCreated')
  notifierStore.notify(message, 'success')
}

// Handle case blueprint application - extract surgery blueprint ID if present
const handleCaseBlueprintApplied = (blueprint: Blueprint) => {
  logger.info('Case blueprint applied', { title: blueprint.title, content: blueprint.content })

  if (blueprint.content) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content = blueprint.content as any

    // Surgery blueprint ID is stored in content.surgeries
    let surgeryId = null

    if (content.surgeries) {
      if (Array.isArray(content.surgeries) && content.surgeries.length > 0) {
        // If surgeries is an array, take the first surgery blueprint ID
        surgeryId = content.surgeries[0]
      } else if (typeof content.surgeries === 'string') {
        // If surgeries is a string, use it directly
        surgeryId = content.surgeries
      }
    }

    if (surgeryId) {
      logger.info('✅ Surgery blueprint ID found in case blueprint surgeries', { surgeryId })
      surgeryBlueprintId.value = surgeryId
    } else {
      logger.info('❌ No surgery blueprint ID found in case blueprint content.surgeries', { surgeries: content.surgeries })
      surgeryBlueprintId.value = null
    }
  } else {
    logger.info('❌ Case blueprint has no content')
    surgeryBlueprintId.value = null
  }
}

const handleCaseCancel = () => {
  // Go back to step 1 or cancel the entire flow
  router.back()
}

// Handle surgery dialog events
const handleSurgerySubmit = async (surgery: Surgery) => {
  const isUpdate = createdSurgery.value?.id === surgery.id
  createdSurgery.value = surgery
  const message = isUpdate ?
    t('creationFlow.surgeryUpdated') :
    t('creationFlow.surgeryCreated')
  notifierStore.notify(message, 'success')

  // Advance to step 4 immediately after surgery creation/update
  currentStep.value = 4
}

const handleSurgeryCancel = () => {
  // Go back to step 2 or cancel the entire flow
  router.back()
}



// Handle consultation blueprint IDs from surgery blueprint
const handleConsultationBlueprints = (consultationBlueprintIds: string[]) => {
  logger.info('Received consultation blueprint IDs from surgery', { consultationBlueprintIds })
  surgeryBlueprintConsultations.value = consultationBlueprintIds
}

// Helper function to complete the flow
const completeCreationFlow = () => {
  // Move to step 5 (completion screen with URLs)
  currentStep.value = 5
}

// Navigate to case view after completing the flow
const finishFlow = () => {
  if (createdCase.value) {
    router.push({
      name: 'patientcaselanding',
      params: {
        caseId: createdCase.value.id
      }
    })
  }
}

// Skip surgery and proceed directly to consultations
const handleSkipSurgery = () => {
  skipSurgery.value = true
  currentStep.value = 4
  notifierStore.notify(t('creationFlow.surgerySkipped'), 'info')
}

// Handle consultation blueprint selection
const handleConsultationBlueprintCancel = () => {
  // User can go back to step 3 using the Previous button
  // For now, just log cancellation
  logger.info('Consultation blueprint selection cancelled')
}

// Handle consultation dialog events  
const handleConsultationsSubmit = async (consultations: Consultation[]) => {
  logger.info('📝 Consultations submitted:', { count: consultations.length, consultations })
  
  // Store consultations initially
  createdConsultations.value = consultations
  logger.info('📦 Initial assignment:', { count: createdConsultations.value.length })

  // Fetch full consultation details to get populated formAccessCode
  if (consultations.length > 0 && createdCase.value?.id) {
    try {
      logger.info('🔄 Fetching consultation details for case:', createdCase.value.id)
      const response = await consultationApi.getAllConsultations({ caseId: createdCase.value.id })
      logger.info('📥 Fetched consultation details:', { 
        success: response.success,
        hasResponseObject: !!response.responseObject,
        isArray: Array.isArray(response.responseObject),
        count: Array.isArray(response.responseObject) ? response.responseObject.length : 0
      })
      
      if (response.responseObject && Array.isArray(response.responseObject)) {
        // Update with full consultation data including populated codes
        createdConsultations.value = response.responseObject as Consultation[]
        logger.info('✅ Updated createdConsultations:', { 
          count: createdConsultations.value.length,
          firstId: createdConsultations.value[0]?._id,
          formAccessCodeExists: !!createdConsultations.value[0]?.formAccessCode,
          formAccessCode: createdConsultations.value[0]?.formAccessCode
        })
      } else {
        logger.warn('⚠️ Unexpected response format, keeping initial consultations')
      }
    } catch (error) {
      logger.error('❌ Error fetching consultation details:', error)
      // Continue anyway with the consultations we have
    }
  } else {
    logger.info('ℹ️ Skipping fetch:', { 
      hasConsultations: consultations.length > 0,
      hasCaseId: !!createdCase.value?.id 
    })
  }

  logger.info('📊 Final createdConsultations state:', { 
    count: createdConsultations.value.length,
    firstConsultation: createdConsultations.value[0]
  })

  notifierStore.notify(t('creationFlow.consultationsCreated', { count: consultations.length }), 'success')

  // Complete the flow with consultations created
  completeCreationFlow()
}

// Handle manual consultation dialog state changes
const handleManualConsultationDialogState = (isOpen: boolean) => {
  isManualConsultationDialogOpen.value = isOpen
}



const cancel = () => {
  router.back()
}

// Generate direct access URLs
const getPatientUrl = () => {
  if (!createdPatient.value?.id) return ''
  const baseUrl = window.location.origin
  return `${baseUrl}${PATIENT_URL_PATTERN.replace('{id}', createdPatient.value.id)}`
}

const getCaseUrl = () => {
  if (!createdCase.value?.id) return ''
  const baseUrl = window.location.origin
  return `${baseUrl}${CASE_URL_PATTERN.replace('{id}', createdCase.value.id)}`
}

// Open URLs in new tab
const openPatientUrl = () => {
  const url = getPatientUrl()
  if (url) {
    window.open(url, '_blank')
  }
}

const openCaseUrl = () => {
  const url = getCaseUrl()
  if (url) {
    window.open(url, '_blank')
  }
}

// Copy URLs to clipboard
const copyPatientUrl = () => {
  const url = getPatientUrl()
  if (url) {
    navigator.clipboard.writeText(url).then(() => {
      notifierStore.notify(t('creationFlow.urlCopied'), 'success')
    }).catch(() => {
      notifierStore.notify(t('creationFlow.urlCopyFailed'), 'error')
    })
  }
}

const copyCaseUrl = () => {
  const url = getCaseUrl()
  if (url) {
    navigator.clipboard.writeText(url).then(() => {
      notifierStore.notify(t('creationFlow.urlCopied'), 'success')
    }).catch(() => {
      notifierStore.notify(t('creationFlow.urlCopyFailed'), 'error')
    })
  }
}

// Computed: First consultation sorted by date (ascending)
const firstConsultation = computed(() => {
  logger.info('🔍 Computing firstConsultation:', { 
    consultationsCount: createdConsultations.value.length,
    consultations: createdConsultations.value 
  })
  
  if (createdConsultations.value.length === 0) return null
  
  // Sort consultations by dateAndTime ascending and return the first one
  const sorted = [...createdConsultations.value].sort((a, b) => {
    const dateA = new Date(a.dateAndTime || 0).getTime()
    const dateB = new Date(b.dateAndTime || 0).getTime()
    return dateA - dateB
  })
  
  logger.info('✅ First consultation:', sorted[0])
  return sorted[0]
})

// Computed: External code from first consultation (for QR code flow URL)
const firstConsultationCode = computed(() => {
  logger.info('🔍 Computing firstConsultationCode:', { 
    hasFirstConsultation: !!firstConsultation.value,
    firstConsultationId: firstConsultation.value?.id,
    firstConsultationIdField: firstConsultation.value?._id
  })
  
  if (!firstConsultation.value) {
    logger.info('❌ No first consultation')
    return null
  }
  
  // Check if first consultation has a formAccessCode
  const accessCode = firstConsultation.value.formAccessCode
  if (!accessCode) {
    logger.info('❌ No formAccessCode found on consultation')
    return null
  }
  
  logger.info('📋 FormAccessCode RAW:', accessCode)
  logger.info('📋 FormAccessCode details:', { 
    type: typeof accessCode,
    isObject: typeof accessCode === 'object',
    isNull: accessCode === null,
    keys: typeof accessCode === 'object' && accessCode !== null ? Object.keys(accessCode) : [],
    hasCodeProp: typeof accessCode === 'object' && accessCode !== null && 'code' in accessCode,
    codeProperty: typeof accessCode === 'object' && accessCode !== null ? (accessCode as any).code : undefined
  })
  
  // Handle both string and object types
  // formAccessCode can be:
  // 1. A string (the code itself)
  // 2. An object with { _id, id, code, ... } - we want the 'code' property, NOT the id
  if (typeof accessCode === 'string') {
    logger.info('✅ Code is string:', accessCode)
    return accessCode
  }
  
  if (typeof accessCode === 'object' && accessCode !== null && 'code' in accessCode) {
    const codeValue = (accessCode as any).code
    logger.info('✅ Extracted code from object:', { codeValue, objectId: (accessCode as any)._id || (accessCode as any).id })
    return codeValue
  }
  
  logger.warn('⚠️ formAccessCode format not recognized:', { accessCode, type: typeof accessCode })
  return null
})

// Generate QR Code URL (patient flow with code)
const getQRCodeUrl = () => {
  if (!firstConsultationCode.value) return ''
  const baseUrl = window.location.origin
  return `${baseUrl}/flow/${firstConsultationCode.value}`
}

// Generate First Consultation URL
const getFirstConsultationUrl = () => {
  if (!firstConsultation.value?.id) return ''
  const baseUrl = window.location.origin
  return `${baseUrl}/consultation-overview/${firstConsultation.value.id}`
}

// Copy QR Code URL to clipboard
const copyQRCodeUrl = () => {
  const url = getQRCodeUrl()
  if (url) {
    navigator.clipboard.writeText(url).then(() => {
      notifierStore.notify(t('creationFlow.urlCopied'), 'success')
    }).catch(() => {
      notifierStore.notify(t('creationFlow.urlCopyFailed'), 'error')
    })
  }
}

// Open QR Code URL in new tab
const openQRCodeUrl = () => {
  const url = getQRCodeUrl()
  if (url) {
    window.open(url, '_blank')
  }
}

// Copy First Consultation URL to clipboard
const copyFirstConsultationUrl = () => {
  const url = getFirstConsultationUrl()
  if (url) {
    navigator.clipboard.writeText(url).then(() => {
      notifierStore.notify(t('creationFlow.urlCopied'), 'success')
    }).catch(() => {
      notifierStore.notify(t('creationFlow.urlCopyFailed'), 'error')
    })
  }
}

// Open First Consultation URL in new tab
const openFirstConsultationUrl = () => {
  const url = getFirstConsultationUrl()
  if (url) {
    window.open(url, '_blank')
  }
}

// Add external ID to patient
const addExternalIdField = () => {
  if (!patientData.value.externalPatientId) {
    patientData.value.externalPatientId = []
  }
  patientData.value.externalPatientId.push('')
}

const removeExternalIdField = (index: number) => {
  if (patientData.value.externalPatientId && patientData.value.externalPatientId.length > 1) {
    patientData.value.externalPatientId.splice(index, 1)
  }
}

// Initialize data from route query if available
onMounted(async () => {
  // Fetch department name if department ID is available
  if (userStore.department) {
    try {
      const response = await userDepartmentApi.getDepartmentById({ id: userStore.department })
      if (response.responseObject) {
        departmentName.value = response.responseObject.name || ''
      }
    } catch (error) {
      logger.error('❌ Error fetching department name:', error)
      // Fall back to showing the ID if fetch fails
      departmentName.value = userStore.department
    }
  }

  const externalId = route.query.externalId as string
  if (externalId && externalId.trim() !== '') {
    if (!patientData.value.externalPatientId) {
      patientData.value.externalPatientId = []
    }
    patientData.value.externalPatientId[0] = externalId
  }

  // Check if patientId is provided in route query - skip to step 2
  const patientIdFromRoute = route.query.patientId as string
  if (patientIdFromRoute && patientIdFromRoute.trim() !== '') {
    try {
      // Fetch patient data
      const response = await patientApi.getPatientById({ id: patientIdFromRoute })
      if (response.responseObject) {
        createdPatient.value = response.responseObject
        caseData.value.patient = response.responseObject.id || null
        currentStep.value = 2
        notifierStore.notify(t('creationFlow.patientLoaded'), 'info')
      }
    } catch (error: unknown) {
      let errorMessage = 'An unexpected error occurred'
      if (error instanceof ResponseError) {
        errorMessage = (await error.response.json()).message
      }
      logger.error('❌ Error loading patient:', errorMessage)
      notifierStore.notify(t('alerts.patient.loadFailed'), 'error')
    }
  }
})
</script>

<template>
  <v-container class="w-100">
    <v-row justify="center">
      <v-col cols="12" sm="12" md="12" lg="10" xl="10">
        <v-card>
          <v-card-title class="text-h4">{{ t('creationFlow.title') }}</v-card-title>

          <!-- Stepper -->
          <v-stepper
                     v-model="currentStep"
                     hide-actions
                     class="mb-4"
                     vertical>

            <v-stepper-header>
              <v-stepper-item
                              :complete="currentStep > 1"
                              :value="1"
                              :title="t('creationFlow.step1Title')"></v-stepper-item>
              <v-divider></v-divider>
              <v-stepper-item
                              :complete="currentStep > 2"
                              :value="2"
                              :title="t('creationFlow.step2Title')"></v-stepper-item>
              <v-divider></v-divider>
              <v-stepper-item
                              :complete="currentStep > 3"
                              :value="3"
                              :title="t('creationFlow.step3Title')"></v-stepper-item>
              <v-divider></v-divider>
              <v-stepper-item
                              :complete="currentStep > 4"
                              :value="4"
                              :title="`${t('creationFlow.step4Title')} (${consultationFlowStep})`"></v-stepper-item>
              <v-divider></v-divider>
              <v-stepper-item
                              :complete="currentStep > 5"
                              :value="5"
                              :title="t('creationFlow.step5Title')"></v-stepper-item>
            </v-stepper-header>

            <v-stepper-window v-model="currentStep">
              <!-- Step 1: Create Patient -->
              <v-stepper-window-item :value="1">
                <v-card>
                  <v-card-title>{{ t('creationFlow.step1Title') }}</v-card-title>
                  <v-card-text>

                    <v-form>
                      <!-- External Patient IDs -->
                      <div v-for="(externalId, index) in patientData.externalPatientId || []" :key="index" class="mb-2">
                        <v-row align="center">
                          <v-col cols="10">
                            <v-text-field
                                          v-model="patientData.externalPatientId![index]"
                                          :label="t('forms.patient.externalId') + (index > 0 ? ' ' + (index + 1) : '')"
                                          :hint="index === 0 ? t('forms.externalIdHint') : ''"
                                          :persistent-hint="index === 0"
                                          density="compact"></v-text-field>
                          </v-col>
                          <v-col cols="2">
                            <v-btn
                                   v-if="index === (patientData.externalPatientId?.length ?? 0) - 1"
                                   @click="addExternalIdField"
                                   icon="mdi-plus"
                                   size="small"
                                   color="primary"
                                   variant="text"
                                   :title="t('forms.patient.addExternalId')"></v-btn>
                            <v-btn
                                   v-if="index > 0"
                                   @click="removeExternalIdField(index)"
                                   icon="mdi-minus"
                                   size="small"
                                   color="error"
                                   variant="text"
                                   :title="t('forms.patient.removeExternalId')"></v-btn>
                          </v-col>
                        </v-row>
                      </div>

                      <v-select
                                v-model="patientData.sex"
                                :label="t('forms.sex')"
                                :items="sexOptions"
                                item-value="value"
                                item-title="label"
                                density="compact"
                                clearable></v-select>

                      <v-text-field
                                    :model-value="departmentName || patientData.department"
                                    :label="t('forms.department')"
                                    readonly
                                    :hint="t('forms.departmentAutoAssignedHint')"
                                    persistent-hint
                                    variant="outlined"
                                    density="compact"></v-text-field>
                    </v-form>
                  </v-card-text>
                </v-card>
              </v-stepper-window-item>

              <!-- Step 2: Create Case -->
              <v-stepper-window-item :value="2">

                <!-- Embedded Case Form -->
                <PatientCaseCreateEditForm
                                           ref="caseFormRef"
                                           v-if="createdPatient"
                                           :patientId="createdPatient.id!"
                                           :createNewCase="!createdCase"
                                           :selectedCase="caseForEditing"
                                           :modelValue="caseData"
                                           :showButtons="false"
                                           @submit="handleCaseSubmit"
                                           @cancel="handleCaseCancel"
                                           @blueprint-applied="handleCaseBlueprintApplied" />
              </v-stepper-window-item>

              <!-- Step 3: Create Surgery -->
              <v-stepper-window-item :value="3">

                <!-- Embedded Surgery Form -->
                <CreateEditSurgeryDialog
                                         ref="surgeryFormRef"
                                         v-if="createdCase && createdCase.id"
                                         :patientCaseId="createdCase.id"
                                         :surgery="createdSurgery"
                                         :patient-case-data="createdCase"
                                         :surgery-blueprint-ids="surgeryBlueprintId ? [surgeryBlueprintId] : undefined"
                                         :showButtons="false"
                                         @submit="handleSurgerySubmit"
                                         @cancel="handleSurgeryCancel"
                                         @consultation-blueprints="handleConsultationBlueprints" />
              </v-stepper-window-item>

              <!-- Step 4: Create Consultation -->
              <v-stepper-window-item :value="4">

                <!-- Embedded Consultation Blueprint Selection -->
                <ConsultationBlueprintSelectionDialog
                                                      ref="consultationFormRef"
                                                      v-if="createdCase && createdCase.patient && createdCase.id"
                                                      v-model="selectedConsultationBlueprints"
                                                      :surgery-date="createdSurgery?.surgeryDate || undefined"
                                                      :patient-id="createdCase.patient.id || ''"
                                                      :case-id="createdCase.id"
                                                      :pre-selected-blueprint-ids="surgeryBlueprintConsultations"
                                                      :consultation-flow-step="consultationFlowStep"
                                                      :showButtons="false"
                                                      @consultations-created="handleConsultationsSubmit"
                                                      @consultation-flow-advance="handleConsultationFlowAdvance"
                                                      @manual-consultation-dialog-state="handleManualConsultationDialogState"
                                                      @cancel="handleConsultationBlueprintCancel" />
              </v-stepper-window-item>

              <!-- Step 5: Completion & URLs -->
              <v-stepper-window-item :value="5">

                <!-- Direct Access URLs -->
                <v-card class="mt-4">
                  <v-card-title>{{ t('creationFlow.directAccessUrls') }}</v-card-title>
                  <v-card-text>
                    <div v-if="createdPatient" class="mb-4">
                      <p class="mb-2 font-weight-bold">{{ t('creationFlow.patientUrl') }}</p>
                      <v-text-field
                                    :value="getPatientUrl()"
                                    readonly
                                    variant="outlined"
                                    density="compact"
                                    @click="copyPatientUrl"
                                    class="cursor-pointer">
                        <template #append-inner>
                          <v-btn
                                 icon="mdi-content-copy"
                                 size="x-small"
                                 variant="text"
                                 @click.stop="copyPatientUrl"
                                 :title="t('buttons.copy')"
                                 class="mr-2"></v-btn>
                          <v-btn
                                 icon="mdi-open-in-new"
                                 size="x-small"
                                 variant="text"
                                 @click.stop="openPatientUrl"
                                 :title="t('buttons.open')"></v-btn>
                        </template>
                      </v-text-field>
                    </div>

                    <div v-if="createdCase">
                      <p class="mb-2 font-weight-bold">{{ t('creationFlow.caseUrl') }}</p>
                      <v-text-field
                                    :value="getCaseUrl()"
                                    readonly
                                    variant="outlined"
                                    density="compact"
                                    @click="copyCaseUrl"
                                    class="cursor-pointer">
                        <template #append-inner>
                          <v-btn
                                 icon="mdi-content-copy"
                                 size="x-small"
                                 variant="text"
                                 @click.stop="copyCaseUrl"
                                 :title="t('buttons.copy')"
                                 class="mr-2"></v-btn>
                          <v-btn
                                 icon="mdi-open-in-new"
                                 size="x-small"
                                 variant="text"
                                 @click.stop="openCaseUrl"
                                 :title="t('buttons.open')"></v-btn>
                        </template>
                      </v-text-field>
                    </div>

                    <!-- QR Code Link (if external code exists) -->
                    <div v-if="firstConsultationCode" class="mb-4">
                      <p class="mb-2 font-weight-bold">{{ t('creationFlow.patientFlowQrUrl') }}</p>
                      <v-text-field
                                    :value="getQRCodeUrl()"
                                    readonly
                                    variant="outlined"
                                    density="compact"
                                    @click="copyQRCodeUrl"
                                    class="cursor-pointer">
                        <template #append-inner>
                          <QRCodeDisplay :url="getQRCodeUrl()" />
                          <v-btn
                                 icon="mdi-content-copy"
                                 size="x-small"
                                 variant="text"
                                 @click.stop="copyQRCodeUrl"
                                 :title="t('buttons.copy')"
                                 class="mr-2"></v-btn>
                          <v-btn
                                 icon="mdi-open-in-new"
                                 size="x-small"
                                 variant="text"
                                 @click.stop="openQRCodeUrl"
                                 :title="t('buttons.open')"></v-btn>
                        </template>
                      </v-text-field>
                    </div>

                    <!-- First Consultation Link -->
                    <div v-if="firstConsultation" class="mb-4">
                      <p class="mb-2 font-weight-bold">{{ t('creationFlow.firstConsultationUrl') }}</p>
                      <v-text-field
                                    :value="getFirstConsultationUrl()"
                                    readonly
                                    variant="outlined"
                                    density="compact"
                                    @click="copyFirstConsultationUrl"
                                    class="cursor-pointer">
                        <template #append-inner>
                          <v-btn
                                 icon="mdi-content-copy"
                                 size="x-small"
                                 variant="text"
                                 @click.stop="copyFirstConsultationUrl"
                                 :title="t('buttons.copy')"
                                 class="mr-2"></v-btn>
                          <v-btn
                                 icon="mdi-open-in-new"
                                 size="x-small"
                                 variant="text"
                                 @click.stop="openFirstConsultationUrl"
                                 :title="t('buttons.open')"></v-btn>
                        </template>
                      </v-text-field>
                    </div>
                  </v-card-text>
                </v-card>
              </v-stepper-window-item>
            </v-stepper-window>
          </v-stepper>

          <!-- Duplicate Patient Dialog -->
          <v-dialog v-model="showDuplicatePatientDialog" max-width="400">
            <v-card>
              <v-card-title>{{ t('creationFlow.duplicatePatientTitle') }}</v-card-title>
              <v-card-text>
                <p class="mb-4">
                  {{ t('creationFlow.duplicatePatientMessage', { externalId: duplicateExternalId }) }}
                </p>
                <v-alert type="info">
                  {{ t('creationFlow.duplicatePatientQuestion') }}
                </v-alert>
              </v-card-text>
              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn
                       @click="handleCancelDuplicateDialog"
                       color="grey"
                       variant="outlined">
                  {{ t('buttons.no') }}
                </v-btn>
                <v-btn
                       @click="handleContinueWithExistingPatient"
                       color="primary"
                       variant="elevated"
                       :loading="isLoading">
                  {{ t('buttons.yes') }}
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>

          <!-- Action buttons -->
          <v-card-actions class="justify-space-between pa-4">
            <v-btn
                   @click="cancel"
                   color="grey"
                   variant="outlined"
                   :disabled="isManualConsultationDialogOpen">
              {{ t('buttons.cancel') }}
            </v-btn>

            <div class="d-flex gap-2">
              <v-btn
                     v-if="currentStep >= 2 && currentStep <= 5 && !isManualConsultationDialogOpen"
                     @click="previousStep"
                     color="primary"
                     variant="outlined">
                {{ t('buttons.previous') }}
              </v-btn>

              <v-btn
                     v-if="currentStep === 3 && !createdSurgery"
                     @click="handleSkipSurgery"
                     color="warning"
                     variant="outlined">
                {{ t('creationFlow.skipSurgery') }}
              </v-btn>

              <v-btn
                     v-if="currentStep < 5 && !isManualConsultationDialogOpen"
                     @click="nextStep"
                     color="primary"
                     variant="elevated"
                     :loading="isLoading"
                     :disabled="(currentStep === 1 && !canProceedFromStep1) ||
                      (currentStep === 2 && !canProceedFromStep2)">
                {{ t('buttons.next') }}
              </v-btn>

              <v-btn
                     v-if="currentStep === 5"
                     @click="finishFlow"
                     color="success"
                     variant="elevated">
                {{ t('buttons.finish') }}
              </v-btn>
            </div>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.gap-2 {
  gap: 8px;
}

.cursor-pointer {
  cursor: pointer;
}
</style>
