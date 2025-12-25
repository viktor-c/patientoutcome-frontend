<template>
  <v-container>
    <v-card>
      <v-card-title>
        <v-icon start>mdi-content-cut</v-icon>
        {{ t('surgeryBlueprints.title') }}
      </v-card-title>

      <v-card-text>
        <v-alert type="info" variant="tonal" class="mb-4">
          {{ t('surgeryBlueprints.description') }}
        </v-alert>

        <!-- Add New Blueprint and Show Archived Buttons -->
        <v-row class="mb-4">
          <v-col>
            <v-btn
                   color="primary"
                   @click="openCreateDialog"
                   prepend-icon="mdi-plus"
                   class="mr-2">
              {{ t('surgeryBlueprints.addBlueprint') }}
            </v-btn>
            <v-btn
                   :color="showArchived ? 'secondary' : 'default'"
                   @click="toggleShowArchived"
                   :prepend-icon="showArchived ? 'mdi-eye-off' : 'mdi-eye'">
              {{ showArchived ? t('surgeryBlueprints.hideArchived') : t('surgeryBlueprints.showArchived') }}
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
                      hover>
          <template #[`item.title`]="{ item }">
            <div>
              <strong>{{ item.title }}</strong>
              <v-chip
                      v-if="item.isArchived"
                      size="x-small"
                      color="grey"
                      class="ml-2">
                {{ t('surgeryBlueprints.archived') }}
              </v-chip>
            </div>
          </template>

          <template #[`item.consultationBlueprints`]="{ item }">
            <div class="d-flex flex-wrap gap-1">
              <v-chip
                      v-for="consultationId in (item.content?.consultations || [])"
                      :key="consultationId"
                      size="small"
                      color="primary"
                      variant="tonal">
                {{ getConsultationBlueprintName(consultationId) }}
              </v-chip>
              <span v-if="!item.content?.consultations?.length" class="text-caption text-grey">
                {{ t('surgeryBlueprints.noConsultations') }}
              </span>
            </div>
          </template>

          <template #[`item.actions`]="{ item }">
            <v-btn
                   v-if="!item.isArchived"
                   icon="mdi-pencil"
                   size="small"
                   variant="text"
                   @click.stop="openEditDialog(item)" />
            <v-btn
                   v-if="item.isArchived"
                   icon="mdi-restore"
                   size="small"
                   variant="text"
                   color="success"
                   @click.stop="unarchiveBlueprint(item)" />
            <v-btn
                   v-if="!item.isArchived"
                   icon="mdi-archive"
                   size="small"
                   variant="text"
                   color="warning"
                   @click.stop="confirmArchive(item)" />
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Create/Edit Dialog -->
    <v-dialog v-model="dialog" max-width="900px" persistent>
      <v-card>
        <v-card-title>
          <span class="text-h5">{{ dialogTitle }}</span>
        </v-card-title>

        <v-card-text>
          <v-alert
                   type="info"
                   variant="tonal"
                   class="mb-4"
                   icon="mdi-information">
            {{ t('surgeryBlueprints.editWarning') }}
          </v-alert>

          <v-form ref="formRef">
            <v-text-field
                          v-model="editedBlueprint.title"
                          :label="t('surgeryBlueprints.fields.name')"
                          :rules="[rules.required]"
                          required />

            <v-textarea
                        v-model="editedBlueprint.description"
                        :label="t('surgeryBlueprints.fields.description')"
                        :rules="[rules.required]"
                        rows="3"
                        required />

            <v-text-field
                          v-model="editedBlueprint.therapy"
                          :label="t('surgeryBlueprints.fields.therapy')"
                          :rules="[rules.required]"
                          required />

            <v-combobox
                        v-model="editedBlueprint.diagnosis"
                        :label="t('surgeryBlueprints.fields.diagnosis')"
                        multiple
                        chips
                        closable-chips
                        :rules="[rules.required]"
                        required />

            <v-combobox
                        v-model="editedBlueprint.diagnosisICD10"
                        :label="t('surgeryBlueprints.fields.diagnosisICD10')"
                        multiple
                        chips
                        closable-chips />

            <v-combobox
                        v-model="editedBlueprint.opsCodes"
                        :label="t('surgeryBlueprints.fields.opsCodes')"
                        multiple
                        chips
                        closable-chips />

            <v-autocomplete
                            v-model="selectedConsultationBlueprints"
                            :items="consultationBlueprints"
                            :label="t('surgeryBlueprints.fields.consultationBlueprints')"
                            :loading="loadingConsultationBlueprints"
                            item-title="title"
                            item-value="id"
                            multiple
                            chips
                            closable-chips>
              <template #prepend-item>
                <v-text-field
                              v-model="consultationBlueprintSearch"
                              :placeholder="t('surgeryBlueprints.searchConsultations')"
                              prepend-inner-icon="mdi-magnify"
                              variant="outlined"
                              density="compact"
                              class="ma-2"
                              hide-details
                              clearable />
                <v-divider />
              </template>
            </v-autocomplete>

            <v-textarea
                        v-model="editedBlueprint.notes"
                        :label="t('surgeryBlueprints.fields.notes')"
                        :hint="t('surgeryBlueprints.fields.notesHint')"
                        persistent-hint
                        rows="3" />
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
                 :loading="saving">
            {{ t('common.save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Archive Confirmation Dialog -->
    <v-dialog v-model="archiveDialog" max-width="500px">
      <v-card>
        <v-card-title class="text-h5">
          {{ t('surgeryBlueprints.confirmArchive') }}
        </v-card-title>
        <v-card-text>
          {{ t('surgeryBlueprints.archiveWarning', { name: blueprintToArchive?.title }) }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="cancelArchive">
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn
                 color="warning"
                 @click="showFinalArchiveConfirmation">
            {{ t('common.continue') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Final Archive Confirmation Dialog -->
    <v-dialog v-model="archiveDialogSecond" max-width="500px">
      <v-card>
        <v-card-title class="text-h5">
          {{ t('surgeryBlueprints.finalConfirmation') }}
        </v-card-title>
        <v-card-text>
          {{ t('surgeryBlueprints.archiveFinalWarning', { name: blueprintToArchive?.title }) }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="cancelArchive">
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn
                 color="warning"
                 @click="archiveBlueprint"
                 :loading="deleting">
            {{ t('surgeryBlueprints.archiveNow') }}
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

interface SurgeryBlueprintContent {
  externalId?: string
  diagnosis?: string[]
  diagnosisICD10?: string[]
  therapy?: string
  OPSCodes?: string[]
  side?: string[]
  surgeryDate?: string
  surgeryTime?: number
  tourniquet?: number
  anaesthesiaType?: Array<{ id: number; type: string }>
  roentgenDosis?: string
  roentgenTime?: string
  surgeons?: string[]
  additionalData?: Array<{ note: string; dateCreated: string }>
  patientCase?: string
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
  content?: SurgeryBlueprintContent
  tags?: string[]
  isArchived?: boolean
  notes?: string
}

interface ConsultationBlueprint {
  id?: string | null
  title: string
  description?: string
}

// State
const loading = ref(false)
const loadingConsultationBlueprints = ref(false)
const saving = ref(false)
const deleting = ref(false)
const dialog = ref(false)
const archiveDialog = ref(false)
const archiveDialogSecond = ref(false)
const showArchived = ref(false)
const blueprints = ref<BlueprintItem[]>([])
const consultationBlueprints = ref<ConsultationBlueprint[]>([])
const consultationBlueprintSearch = ref('')
const selectedConsultationBlueprints = ref<string[]>([])
const blueprintToArchive = ref<BlueprintItem | null>(null)
const editedBlueprint = ref<{
  title: string
  description: string
  therapy: string
  diagnosis: string[]
  diagnosisICD10: string[]
  opsCodes: string[]
  notes: string
}>({
  title: '',
  description: '',
  therapy: '',
  diagnosis: [],
  diagnosisICD10: [],
  opsCodes: [],
  notes: '',
})
const editedIndex = ref(-1)
const formRef = ref()

// Computed
const dialogTitle = computed(() => {
  return editedIndex.value === -1
    ? t('surgeryBlueprints.createBlueprint')
    : t('surgeryBlueprints.editBlueprint')
})

const filteredBlueprints = computed(() => {
  if (showArchived.value) {
    return blueprints.value
  }
  return blueprints.value.filter(b => !b.isArchived)
})

const headers = computed(() => [
  { title: t('surgeryBlueprints.fields.name'), key: 'title', sortable: true },
  { title: t('surgeryBlueprints.fields.description'), key: 'description', sortable: false },
  { title: t('surgeryBlueprints.fields.therapy'), key: 'content.therapy', sortable: false },
  { title: t('surgeryBlueprints.fields.consultationBlueprints'), key: 'consultationBlueprints', sortable: false },
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
      blueprintFor: 'surgery',
      limit: '100'
    })

    if (response.responseObject) {
      blueprints.value = response.responseObject.blueprints.map((blueprint) => {
        const content = blueprint.content as SurgeryBlueprintContent
        return {
          ...blueprint,
          isArchived: blueprint.tags?.includes('archived') || false,
          notes: content?.additionalData?.[0]?.note || '',
          content,
        }
      })
    }
  } catch (error) {
    notifierStore.error(
      t('surgeryBlueprints.errors.fetchFailed')
    )
    console.error('Error fetching surgery blueprints:', error)
  } finally {
    loading.value = false
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
      t('surgeryBlueprints.errors.fetchConsultationsFailed')
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
    therapy: '',
    diagnosis: [],
    diagnosisICD10: [],
    opsCodes: [],
    notes: '',
  }
  selectedConsultationBlueprints.value = []
  dialog.value = true
}

const openEditDialog = (item: BlueprintItem) => {
  editedIndex.value = blueprints.value.indexOf(item)
  const content = item.content || {}
  editedBlueprint.value = {
    title: item.title,
    description: item.description,
    therapy: content.therapy || '',
    diagnosis: content.diagnosis || [],
    diagnosisICD10: content.diagnosisICD10 || [],
    opsCodes: content.OPSCodes || [],
    notes: item.notes || '',
  }
  selectedConsultationBlueprints.value = content.consultations || []
  dialog.value = true
}

const closeDialog = () => {
  dialog.value = false
  setTimeout(() => {
    editedBlueprint.value = {
      title: '',
      description: '',
      therapy: '',
      diagnosis: [],
      diagnosisICD10: [],
      opsCodes: [],
      notes: '',
    }
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
      blueprintFor: 'surgery' as const,
      title: editedBlueprint.value.title,
      description: editedBlueprint.value.description,
      timeDelta: '0',
      content: {
        externalId: '',
        diagnosis: editedBlueprint.value.diagnosis,
        diagnosisICD10: editedBlueprint.value.diagnosisICD10,
        therapy: editedBlueprint.value.therapy,
        OPSCodes: editedBlueprint.value.opsCodes,
        side: [],
        surgeryDate: '',
        surgeryTime: 0,
        tourniquet: 0,
        anaesthesiaType: [],
        roentgenDosis: '',
        roentgenTime: '',
        surgeons: [],
        additionalData: editedBlueprint.value.notes ? [{
          note: editedBlueprint.value.notes,
          dateCreated: new Date().toISOString(),
        }] : [],
        patientCase: '',
        consultations: selectedConsultationBlueprints.value,
      },
      tags: ['surgery', 'template'],
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
          t('surgeryBlueprints.success.updated')
        )
      }
    } else {
      // Create new blueprint
      await blueprintApi.createBlueprint({
        createBlueprintRequest: blueprintData,
      })
      notifierStore.success(
        t('surgeryBlueprints.success.created')
      )
    }

    await fetchBlueprints()
    closeDialog()
  } catch (error) {
    notifierStore.error(
      editedIndex.value > -1
        ? t('surgeryBlueprints.errors.updateFailed')
        : t('surgeryBlueprints.errors.createFailed')
    )
    console.error('Error saving surgery blueprint:', error)
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
      t('surgeryBlueprints.success.archived')
    )
    await fetchBlueprints()
    cancelArchive()
  } catch (error) {
    notifierStore.error(
      t('surgeryBlueprints.errors.archiveFailed')
    )
    console.error('Error archiving surgery blueprint:', error)
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
      t('surgeryBlueprints.success.unarchived')
    )
    await fetchBlueprints()
  } catch (error) {
    notifierStore.error(
      t('surgeryBlueprints.errors.unarchiveFailed')
    )
    console.error('Error unarchiving surgery blueprint:', error)
  }
}

const toggleShowArchived = () => {
  showArchived.value = !showArchived.value
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
  fetchConsultationBlueprints()
})
</script>

<style scoped>
.v-data-table {
  background-color: transparent;
}
</style>
