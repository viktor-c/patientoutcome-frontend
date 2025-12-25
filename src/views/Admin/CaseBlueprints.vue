<template>
  <v-container>
    <v-card>
      <v-card-title>
        <v-icon start>mdi-folder-open</v-icon>
        {{ t('caseBlueprints.title') }}
      </v-card-title>

      <v-card-text>
        <v-alert type="info" variant="tonal" class="mb-4">
          {{ t('caseBlueprints.description') }}
        </v-alert>

        <!-- Add New Blueprint and Show Archived Buttons -->
        <v-row class="mb-4">
          <v-col>
            <v-btn
              color="primary"
              @click="openCreateDialog"
              prepend-icon="mdi-plus"
              class="mr-2"
            >
              {{ t('caseBlueprints.addBlueprint') }}
            </v-btn>
            <v-btn
              :color="showArchived ? 'secondary' : 'default'"
              @click="toggleShowArchived"
              :prepend-icon="showArchived ? 'mdi-eye-off' : 'mdi-eye'"
            >
              {{ showArchived ? t('caseBlueprints.hideArchived') : t('caseBlueprints.showArchived') }}
            </v-btn>
          </v-col>
        </v-row>

        <!-- Blueprints Table -->
        <v-data-table
          :headers="headers"
          :items="filteredBlueprints"
          :loading="loading"
          :items-per-page="10"
          class="elevation-1"
          @click:row="handleRowClick"
          hover
        >
          <template #[`item.title`]="{ item }">
            <div>
              <strong>{{ item.title }}</strong>
              <v-chip
                v-if="item.isArchived"
                size="x-small"
                color="grey"
                class="ml-2"
              >
                {{ t('caseBlueprints.archived') }}
              </v-chip>
            </div>
          </template>

          <template #[`item.mainDiagnosis`]="{ item }">
            <div class="d-flex flex-wrap gap-1">
              <v-chip
                v-for="(diagnosis, index) in (item.content?.mainDiagnosis || [])"
                :key="index"
                size="small"
                color="info"
                variant="tonal"
              >
                {{ diagnosis }}
              </v-chip>
              <span v-if="!item.content?.mainDiagnosis?.length" class="text-caption text-grey">
                {{ t('caseBlueprints.noDiagnosis') }}
              </span>
            </div>
          </template>

          <template #[`item.surgeryBlueprint`]="{ item }">
            <v-chip
              v-if="item.content?.surgeries?.[0]"
              size="small"
              color="secondary"
              variant="tonal"
            >
              {{ getSurgeryBlueprintName(item.content.surgeries[0]) }}
            </v-chip>
            <span v-else class="text-caption text-grey">
              {{ t('caseBlueprints.noSurgery') }}
            </span>
          </template>

          <template #[`item.consultationBlueprints`]="{ item }">
            <div class="d-flex flex-wrap gap-1">
              <v-chip
                v-for="consultationId in (item.content?.consultations || [])"
                :key="consultationId"
                size="small"
                color="primary"
                variant="tonal"
              >
                {{ getConsultationBlueprintName(consultationId) }}
              </v-chip>
              <span v-if="!item.content?.consultations?.length" class="text-caption text-grey">
                {{ t('caseBlueprints.noConsultations') }}
              </span>
            </div>
          </template>

          <template #[`item.actions`]="{ item }">
            <v-btn
              v-if="!item.isArchived"
              icon="mdi-pencil"
              size="small"
              variant="text"
              @click.stop="openEditDialog(item)"
            />
            <v-btn
              v-if="item.isArchived"
              icon="mdi-restore"
              size="small"
              variant="text"
              color="success"
              @click.stop="unarchiveBlueprint(item)"
            />
            <v-btn
              v-if="!item.isArchived"
              icon="mdi-archive"
              size="small"
              variant="text"
              color="warning"
              @click.stop="confirmArchive(item)"
            />
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Create/Edit Dialog -->
    <v-dialog v-model="dialog" max-width="1000px" persistent>
      <v-card>
        <v-card-title>
          <span class="text-h5">{{ dialogTitle }}</span>
        </v-card-title>

        <v-card-text>
          <v-alert
            type="info"
            variant="tonal"
            class="mb-4"
            icon="mdi-information"
          >
            {{ t('caseBlueprints.editWarning') }}
          </v-alert>

          <v-form ref="formRef">
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="editedBlueprint.title"
                  :label="t('caseBlueprints.fields.name')"
                  :rules="[rules.required]"
                  required
                />
              </v-col>

              <v-col cols="12">
                <v-textarea
                  v-model="editedBlueprint.description"
                  :label="t('caseBlueprints.fields.description')"
                  :rules="[rules.required]"
                  rows="3"
                  required
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-combobox
                  v-model="editedBlueprint.mainDiagnosis"
                  :label="t('caseBlueprints.fields.mainDiagnosis')"
                  multiple
                  chips
                  closable-chips
                  :rules="[rules.required]"
                  required
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-combobox
                  v-model="editedBlueprint.mainDiagnosisICD10"
                  :label="t('caseBlueprints.fields.mainDiagnosisICD10')"
                  multiple
                  chips
                  closable-chips
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-combobox
                  v-model="editedBlueprint.studyDiagnosis"
                  :label="t('caseBlueprints.fields.studyDiagnosis')"
                  multiple
                  chips
                  closable-chips
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-combobox
                  v-model="editedBlueprint.studyDiagnosisICD10"
                  :label="t('caseBlueprints.fields.studyDiagnosisICD10')"
                  multiple
                  chips
                  closable-chips
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-combobox
                  v-model="editedBlueprint.otherDiagnosis"
                  :label="t('caseBlueprints.fields.otherDiagnosis')"
                  multiple
                  chips
                  closable-chips
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-combobox
                  v-model="editedBlueprint.otherDiagnosisICD10"
                  :label="t('caseBlueprints.fields.otherDiagnosisICD10')"
                  multiple
                  chips
                  closable-chips
                />
              </v-col>

              <v-col cols="12">
                <v-autocomplete
                  v-model="selectedSurgeryBlueprint"
                  :items="surgeryBlueprints"
                  :label="t('caseBlueprints.fields.surgeryBlueprint')"
                  :loading="loadingSurgeryBlueprints"
                  item-title="title"
                  item-value="id"
                  clearable
                >
                  <template #prepend-item>
                    <v-text-field
                      v-model="surgeryBlueprintSearch"
                      :placeholder="t('caseBlueprints.searchSurgery')"
                      prepend-inner-icon="mdi-magnify"
                      variant="outlined"
                      density="compact"
                      class="ma-2"
                      hide-details
                      clearable
                    />
                    <v-divider />
                  </template>
                </v-autocomplete>
              </v-col>

              <v-col cols="12">
                <v-autocomplete
                  v-model="selectedConsultationBlueprints"
                  :items="consultationBlueprints"
                  :label="t('caseBlueprints.fields.consultationBlueprints')"
                  :loading="loadingConsultationBlueprints"
                  item-title="title"
                  item-value="id"
                  multiple
                  chips
                  closable-chips
                >
                  <template #prepend-item>
                    <v-text-field
                      v-model="consultationBlueprintSearch"
                      :placeholder="t('caseBlueprints.searchConsultations')"
                      prepend-inner-icon="mdi-magnify"
                      variant="outlined"
                      density="compact"
                      class="ma-2"
                      hide-details
                      clearable
                    />
                    <v-divider />
                  </template>
                </v-autocomplete>
              </v-col>

              <v-col cols="12">
                <v-textarea
                  v-model="editedBlueprint.medicalHistory"
                  :label="t('caseBlueprints.fields.medicalHistory')"
                  :hint="t('caseBlueprints.fields.medicalHistoryHint')"
                  persistent-hint
                  rows="3"
                />
              </v-col>

              <v-col cols="12">
                <v-textarea
                  v-model="editedBlueprint.notes"
                  :label="t('caseBlueprints.fields.notes')"
                  :hint="t('caseBlueprints.fields.notesHint')"
                  persistent-hint
                  rows="2"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn text @click="closeDialog">
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn
            color="primary"
            @click="saveBlueprint"
            :loading="saving"
          >
            {{ t('common.save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Archive Confirmation Dialog -->
    <v-dialog v-model="archiveDialog" max-width="500px">
      <v-card>
        <v-card-title class="text-h5">
          {{ t('caseBlueprints.confirmArchive') }}
        </v-card-title>
        <v-card-text>
          {{ t('caseBlueprints.archiveWarning', { name: blueprintToArchive?.title }) }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="cancelArchive">
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn
            color="warning"
            @click="showFinalArchiveConfirmation"
          >
            {{ t('common.continue') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Final Archive Confirmation Dialog -->
    <v-dialog v-model="archiveDialogSecond" max-width="500px">
      <v-card>
        <v-card-title class="text-h5">
          {{ t('caseBlueprints.finalConfirmation') }}
        </v-card-title>
        <v-card-text>
          {{ t('caseBlueprints.archiveFinalWarning', { name: blueprintToArchive?.title }) }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="cancelArchive">
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn
            color="warning"
            @click="archiveBlueprint"
            :loading="deleting"
          >
            {{ t('caseBlueprints.archiveNow') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { blueprintApi } from '@/api'
import { useNotifierStore } from '@/stores/notifierStore'

const { t } = useI18n()
const notifierStore = useNotifierStore()

interface CaseBlueprintContent {
  externalId?: string
  patient?: string
  mainDiagnosis?: string[]
  studyDiagnosis?: string[]
  mainDiagnosisICD10?: string[]
  studyDiagnosisICD10?: string[]
  otherDiagnosis?: string[]
  otherDiagnosisICD10?: string[]
  surgeries?: string[]
  supervisors?: string
  notes?: Array<{ note: string; dateCreated: string }>
  medicalHistory?: string
  consultations?: string[]
}

interface BlueprintItem {
  id?: string | null
  v?: number
  createdOn: string
  createdBy: string | null
  modifiedOn?: string
  modifiedBy?: string | null
  blueprintFor: string
  title: string
  timeDelta?: string
  description: string
  content?: CaseBlueprintContent
  tags?: string[]
  isArchived?: boolean
  notes?: string
}

interface SurgeryBlueprint {
  id?: string | null
  title: string
  description?: string
}

interface ConsultationBlueprint {
  id?: string | null
  title: string
  description?: string
}

// State
const loading = ref(false)
const loadingSurgeryBlueprints = ref(false)
const loadingConsultationBlueprints = ref(false)
const saving = ref(false)
const deleting = ref(false)
const dialog = ref(false)
const archiveDialog = ref(false)
const archiveDialogSecond = ref(false)
const showArchived = ref(false)
const blueprints = ref<BlueprintItem[]>([])
const surgeryBlueprints = ref<SurgeryBlueprint[]>([])
const consultationBlueprints = ref<ConsultationBlueprint[]>([])
const surgeryBlueprintSearch = ref('')
const consultationBlueprintSearch = ref('')
const selectedSurgeryBlueprint = ref<string | null>(null)
const selectedConsultationBlueprints = ref<string[]>([])
const blueprintToArchive = ref<BlueprintItem | null>(null)
const editedBlueprint = ref<{
  title: string
  description: string
  mainDiagnosis: string[]
  mainDiagnosisICD10: string[]
  studyDiagnosis: string[]
  studyDiagnosisICD10: string[]
  otherDiagnosis: string[]
  otherDiagnosisICD10: string[]
  medicalHistory: string
  notes: string
}>({
  title: '',
  description: '',
  mainDiagnosis: [],
  mainDiagnosisICD10: [],
  studyDiagnosis: [],
  studyDiagnosisICD10: [],
  otherDiagnosis: [],
  otherDiagnosisICD10: [],
  medicalHistory: '',
  notes: '',
})
const editedIndex = ref(-1)
const formRef = ref()

// Computed
const dialogTitle = computed(() => {
  return editedIndex.value === -1
    ? t('caseBlueprints.createBlueprint')
    : t('caseBlueprints.editBlueprint')
})

const filteredBlueprints = computed(() => {
  if (showArchived.value) {
    return blueprints.value
  }
  return blueprints.value.filter(b => !b.isArchived)
})

const headers = computed(() => [
  { title: t('caseBlueprints.fields.name'), key: 'title', sortable: true },
  { title: t('caseBlueprints.fields.description'), key: 'description', sortable: false },
  { title: t('caseBlueprints.fields.mainDiagnosis'), key: 'mainDiagnosis', sortable: false },
  { title: t('caseBlueprints.fields.surgeryBlueprint'), key: 'surgeryBlueprint', sortable: false },
  { title: t('caseBlueprints.fields.consultationBlueprints'), key: 'consultationBlueprints', sortable: false },
  { title: t('common.actions'), key: 'actions', sortable: false, align: 'end' as const },
])

// Validation rules
const rules = {
  required: (v: string | string[] | undefined) => {
    if (Array.isArray(v)) {
      return v.length > 0 || t('validation.required')
    }
    return !!v || t('validation.required')
  },
}

// Methods
const fetchBlueprints = async () => {
  loading.value = true
  try {
    const response = await blueprintApi.getBlueprints({
      blueprintFor: 'case',
      limit: '100'
    })
    
    if (response.responseObject) {
      blueprints.value = response.responseObject.blueprints.map((blueprint) => {
        const content = blueprint.content as CaseBlueprintContent
        return {
          ...blueprint,
          isArchived: blueprint.tags?.includes('archived') || false,
          notes: content?.notes?.[0]?.note || '',
          content,
        }
      })
    }
  } catch (error) {
    notifierStore.error(
      t('caseBlueprints.errors.fetchFailed')
    )
    console.error('Error fetching case blueprints:', error)
  } finally {
    loading.value = false
  }
}

const fetchSurgeryBlueprints = async () => {
  loadingSurgeryBlueprints.value = true
  try {
    const response = await blueprintApi.getBlueprints({
      blueprintFor: 'surgery',
      limit: '100'
    })
    if (response.responseObject) {
      surgeryBlueprints.value = response.responseObject.blueprints
        .filter(bp => !bp.tags?.includes('archived'))
        .map(bp => ({
          id: bp.id,
          title: bp.title,
          description: bp.description,
        }))
    }
  } catch (error) {
    notifierStore.error(
      t('caseBlueprints.errors.fetchSurgeryFailed')
    )
    console.error('Error fetching surgery blueprints:', error)
  } finally {
    loadingSurgeryBlueprints.value = false
  }
}

const fetchConsultationBlueprints = async () => {
  loadingConsultationBlueprints.value = true
  try {
    const response = await blueprintApi.getBlueprints({
      blueprintFor: 'consultation',
      limit: '100'
    })
    if (response.responseObject) {
      consultationBlueprints.value = response.responseObject.blueprints
        .filter(bp => !bp.tags?.includes('archived'))
        .map(bp => ({
          id: bp.id,
          title: bp.title,
          description: bp.description,
        }))
    }
  } catch (error) {
    notifierStore.error(
      t('caseBlueprints.errors.fetchConsultationsFailed')
    )
    console.error('Error fetching consultation blueprints:', error)
  } finally {
    loadingConsultationBlueprints.value = false
  }
}

const openCreateDialog = () => {
  editedIndex.value = -1
  editedBlueprint.value = {
    title: '',
    description: '',
    mainDiagnosis: [],
    mainDiagnosisICD10: [],
    studyDiagnosis: [],
    studyDiagnosisICD10: [],
    otherDiagnosis: [],
    otherDiagnosisICD10: [],
    medicalHistory: '',
    notes: '',
  }
  selectedSurgeryBlueprint.value = null
  selectedConsultationBlueprints.value = []
  dialog.value = true
}

const openEditDialog = (item: BlueprintItem) => {
  editedIndex.value = blueprints.value.indexOf(item)
  const content = item.content || {}
  editedBlueprint.value = {
    title: item.title,
    description: item.description,
    mainDiagnosis: content.mainDiagnosis || [],
    mainDiagnosisICD10: content.mainDiagnosisICD10 || [],
    studyDiagnosis: content.studyDiagnosis || [],
    studyDiagnosisICD10: content.studyDiagnosisICD10 || [],
    otherDiagnosis: content.otherDiagnosis || [],
    otherDiagnosisICD10: content.otherDiagnosisICD10 || [],
    medicalHistory: content.medicalHistory || '',
    notes: item.notes || '',
  }
  selectedSurgeryBlueprint.value = content.surgeries?.[0] || null
  selectedConsultationBlueprints.value = content.consultations || []
  dialog.value = true
}

const closeDialog = () => {
  dialog.value = false
  setTimeout(() => {
    editedBlueprint.value = {
      title: '',
      description: '',
      mainDiagnosis: [],
      mainDiagnosisICD10: [],
      studyDiagnosis: [],
      studyDiagnosisICD10: [],
      otherDiagnosis: [],
      otherDiagnosisICD10: [],
      medicalHistory: '',
      notes: '',
    }
    selectedSurgeryBlueprint.value = null
    selectedConsultationBlueprints.value = []
    editedIndex.value = -1
    formRef.value?.resetValidation()
  }, 300)
}

const saveBlueprint = async () => {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    const blueprintData = {
      blueprintFor: 'case' as const,
      title: editedBlueprint.value.title,
      description: editedBlueprint.value.description,
      timeDelta: 'x',
      content: {
        externalId: '',
        patient: '',
        mainDiagnosis: editedBlueprint.value.mainDiagnosis,
        studyDiagnosis: editedBlueprint.value.studyDiagnosis,
        mainDiagnosisICD10: editedBlueprint.value.mainDiagnosisICD10,
        studyDiagnosisICD10: editedBlueprint.value.studyDiagnosisICD10,
        otherDiagnosis: editedBlueprint.value.otherDiagnosis,
        otherDiagnosisICD10: editedBlueprint.value.otherDiagnosisICD10,
        surgeries: selectedSurgeryBlueprint.value ? [selectedSurgeryBlueprint.value] : [],
        supervisors: '',
        notes: editedBlueprint.value.notes ? [{
          note: editedBlueprint.value.notes,
          dateCreated: new Date().toISOString(),
        }] : [],
        medicalHistory: editedBlueprint.value.medicalHistory,
        consultations: selectedConsultationBlueprints.value,
      },
      tags: ['case', 'patient-care', 'template'],
    }

    if (editedIndex.value > -1) {
      // Update existing blueprint
      const blueprintId = blueprints.value[editedIndex.value].id
      if (blueprintId) {
        // Preserve existing tags when updating
        const existingBlueprint = blueprints.value[editedIndex.value]
        const updateData = {
          ...blueprintData,
          tags: existingBlueprint.tags || blueprintData.tags,
        }
        await blueprintApi.updateBlueprint({
          id: blueprintId,
          updateBlueprintRequest: updateData,
        })
        notifierStore.success(
          t('caseBlueprints.success.updated')
        )
      }
    } else {
      // Create new blueprint
      await blueprintApi.createBlueprint({
        createBlueprintRequest: blueprintData,
      })
      notifierStore.success(
        t('caseBlueprints.success.created')
      )
    }

    await fetchBlueprints()
    closeDialog()
  } catch (error) {
    notifierStore.error(
      editedIndex.value > -1
        ? t('caseBlueprints.errors.updateFailed')
        : t('caseBlueprints.errors.createFailed')
    )
    console.error('Error saving case blueprint:', error)
  } finally {
    saving.value = false
  }
}

const confirmArchive = (item: BlueprintItem) => {
  blueprintToArchive.value = item
  archiveDialog.value = true
}

const showFinalArchiveConfirmation = () => {
  archiveDialog.value = false
  archiveDialogSecond.value = true
}

const cancelArchive = () => {
  archiveDialog.value = false
  archiveDialogSecond.value = false
  blueprintToArchive.value = null
}

const archiveBlueprint = async () => {
  if (!blueprintToArchive.value?.id) return

  deleting.value = true
  try {
    const currentTags = blueprintToArchive.value.tags || []
    await blueprintApi.updateBlueprint({
      id: blueprintToArchive.value.id,
      updateBlueprintRequest: {
        tags: [...currentTags, 'archived'],
      },
    })

    notifierStore.success(
      t('caseBlueprints.success.archived')
    )
    await fetchBlueprints()
    cancelArchive()
  } catch (error) {
    notifierStore.error(
      t('caseBlueprints.errors.archiveFailed')
    )
    console.error('Error archiving case blueprint:', error)
  } finally {
    deleting.value = false
  }
}

const unarchiveBlueprint = async (item: BlueprintItem) => {
  if (!item.id) return

  try {
    const currentTags = item.tags || []
    const newTags = currentTags.filter(tag => tag !== 'archived')
    
    await blueprintApi.updateBlueprint({
      id: item.id,
      updateBlueprintRequest: {
        tags: newTags,
      },
    })

    notifierStore.success(
      t('caseBlueprints.success.unarchived')
    )
    await fetchBlueprints()
  } catch (error) {
    notifierStore.error(
      t('caseBlueprints.errors.unarchiveFailed')
    )
    console.error('Error unarchiving case blueprint:', error)
  }
}

const toggleShowArchived = () => {
  showArchived.value = !showArchived.value
}

const getSurgeryBlueprintName = (surgeryId: string) => {
  const surgery = surgeryBlueprints.value.find(sb => sb.id === surgeryId)
  return surgery?.title || surgeryId
}

const getConsultationBlueprintName = (consultationId: string) => {
  const consultation = consultationBlueprints.value.find(cb => cb.id === consultationId)
  return consultation?.title || consultationId
}

const handleRowClick = (_event: PointerEvent, row: { item: BlueprintItem }) => {
  if (!row.item.isArchived) {
    openEditDialog(row.item)
  }
}

// Lifecycle
onMounted(() => {
  fetchBlueprints()
  fetchSurgeryBlueprints()
  fetchConsultationBlueprints()
})
</script>

<style scoped>
.v-data-table {
  background-color: transparent;
}
</style>
