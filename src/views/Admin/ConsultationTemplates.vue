<template>
  <v-container>
    <v-card>
      <v-card-title>
        <v-icon start>mdi-file-document-multiple</v-icon>
        {{ t('consultationTemplates.title') }}
      </v-card-title>

      <v-card-text>
        <v-alert type="info" variant="tonal" class="mb-4">
          {{ t('consultationTemplates.description') }}
        </v-alert>

        <!-- Add New Template and Show Archived Buttons -->
        <v-row class="mb-4">
          <v-col>
            <v-btn
              color="primary"
              @click="openCreateDialog"
              prepend-icon="mdi-plus"
              class="mr-2"
            >
              {{ t('consultationTemplates.addTemplate') }}
            </v-btn>
            <v-btn
              :color="showArchived ? 'secondary' : 'default'"
              @click="toggleShowArchived"
              :prepend-icon="showArchived ? 'mdi-eye-off' : 'mdi-eye'"
            >
              {{ showArchived ? t('consultationTemplates.hideArchived') : t('consultationTemplates.showArchived') }}
            </v-btn>
          </v-col>
        </v-row>

        <!-- Templates Table -->
        <v-data-table
          :headers="headers"
          :items="filteredTemplates"
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
                {{ t('consultationTemplates.archived') }}
              </v-chip>
            </div>
          </template>

          <template #[`item.timeDelta`]="{ item }">
            <v-chip size="small" color="primary" variant="tonal">
              {{ item.timeDelta }}
            </v-chip>
          </template>

          <template #[`item.formTemplates`]="{ item }">
            <div class="d-flex flex-wrap gap-1">
              <v-chip
                v-for="formTemplateId in (item.content?.formTemplates || [])"
                :key="formTemplateId"
                size="small"
                color="primary"
                variant="tonal"
              >
                {{ getFormTemplateName(formTemplateId) }}
              </v-chip>
              <span v-if="!item.content?.formTemplates?.length" class="text-caption text-grey">
                {{ t('consultationTemplates.noForms') }}
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
              @click.stop="unarchiveTemplate(item)"
            />
            <v-btn
              v-if="!item.isArchived"
              icon="mdi-delete"
              size="small"
              variant="text"
              color="error"
              @click.stop="confirmArchive(item)"
            />
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Create/Edit Dialog -->
    <v-dialog v-model="dialog" max-width="800px" persistent>
      <v-card>
        <v-card-title>
          <span class="text-h5">{{ dialogTitle }}</span>
        </v-card-title>

        <v-card-text>
          <v-alert
            v-if="formTemplatesChanged"
            type="warning"
            variant="tonal"
            class="mb-4"
            icon="mdi-alert"
          >
            {{ t('consultationTemplates.formTemplatesChangeWarning') }}
          </v-alert>

          <v-form ref="formRef">
            <v-text-field
              v-model="editedTemplate.title"
              :label="t('consultationTemplates.fields.name')"
              :rules="[rules.required]"
              required
            />

            <v-textarea
              v-model="editedTemplate.description"
              :label="t('consultationTemplates.fields.description')"
              :rules="[rules.required]"
              rows="3"
              required
            />

            <v-text-field
              v-model="editedTemplate.timeDelta"
              :label="t('consultationTemplates.fields.timeDelta')"
              :rules="[rules.required, rules.timeDelta]"
              :hint="t('consultationTemplates.fields.timeDeltaHint')"
              persistent-hint
              required
            />

            <v-autocomplete
              v-model="selectedFormTemplates"
              :items="formTemplates"
              :label="t('consultationTemplates.fields.proms')"
              :loading="loadingFormTemplates"
              item-title="title"
              item-value="id"
              multiple
              chips
              closable-chips
              :rules="[rules.required]"
              required
            >
              <template #prepend-item>
                <v-text-field
                  v-model="formTemplateSearch"
                  :placeholder="t('consultationTemplates.searchProms')"
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                  class="ma-2"
                />
              </template>
            </v-autocomplete>

            <v-textarea
              v-model="editedTemplate.notes"
              :label="t('consultationTemplates.fields.notes')"
              :hint="t('consultationTemplates.fields.notesHint')"
              persistent-hint
              rows="3"
            />
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn text @click="closeDialog">
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn
            color="primary"
            @click="saveTemplate"
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
          {{ t('consultationTemplates.confirmArchive') }}
        </v-card-title>
        <v-card-text>
          {{ t('consultationTemplates.archiveWarning', { name: templateToArchive?.title }) }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="archiveDialog = false">
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn
            color="error"
            @click="confirmArchiveSecondStep"
          >
            {{ t('common.continue') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Second Archive Confirmation Dialog -->
    <v-dialog v-model="archiveDialogSecond" max-width="500px">
      <v-card>
        <v-card-title class="text-h5 text-error">
          {{ t('consultationTemplates.finalConfirmation') }}
        </v-card-title>
        <v-card-text>
          {{ t('consultationTemplates.archiveFinalWarning', { name: templateToArchive?.title }) }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="cancelArchive">
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn
            color="error"
            @click="archiveTemplate"
            :loading="deleting"
          >
            {{ t('consultationTemplates.archiveNow') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { blueprintApi, formtemplateApi } from '@/api'
import { useNotifierStore } from '@/stores/notifierStore'
import type { 
  GetFormTemplatesShortlist200ResponseResponseObjectInner
} from '@/api'

const { t } = useI18n()
const notifierStore = useNotifierStore()

interface TemplateContent {
  patientCaseId?: string
  dateAndTime?: string
  reasonForConsultation?: string[]
  notes?: Array<{ note: string; dateCreated: string }>
  visitedBy?: string[]
  formTemplates?: string[]
}

interface TemplateItem {
  id?: string | null
  v?: number
  createdOn: string
  createdBy: string | null
  modifiedOn?: string
  modifiedBy?: string | null
  blueprintFor: string
  title: string
  timeDelta: string
  description: string
  content?: TemplateContent
  tags?: string[]
  isArchived?: boolean
  notes?: string
}

// State
const loading = ref(false)
const loadingFormTemplates = ref(false)
const saving = ref(false)
const deleting = ref(false)
const dialog = ref(false)
const archiveDialog = ref(false)
const archiveDialogSecond = ref(false)
const showArchived = ref(false)
const templates = ref<TemplateItem[]>([])
const formTemplates = ref<GetFormTemplatesShortlist200ResponseResponseObjectInner[]>([])
const formTemplateSearch = ref('')
const selectedFormTemplates = ref<string[]>([])
const originalFormTemplates = ref<string[]>([])
const templateToArchive = ref<TemplateItem | null>(null)
const editedTemplate = ref<{
  title: string
  description: string
  timeDelta: string
  notes: string
}>({
  title: '',
  description: '',
  timeDelta: '',
  notes: '',
})
const editedIndex = ref(-1)
const formRef = ref()

// Computed
const dialogTitle = computed(() => {
  return editedIndex.value === -1
    ? t('consultationTemplates.createTemplate')
    : t('consultationTemplates.editTemplate')
})

const formTemplatesChanged = computed(() => {
  if (editedIndex.value === -1) return false
  const current = [...selectedFormTemplates.value].sort()
  const original = [...originalFormTemplates.value].sort()
  return JSON.stringify(current) !== JSON.stringify(original)
})

const filteredTemplates = computed(() => {
  if (showArchived.value) {
    return templates.value
  }
  return templates.value.filter(t => !t.isArchived)
})

const headers = computed(() => [
  { title: t('consultationTemplates.fields.name'), key: 'title', sortable: true },
  { title: t('consultationTemplates.fields.description'), key: 'description', sortable: false },
  { title: t('consultationTemplates.fields.timeDelta'), key: 'timeDelta', sortable: true },
  { title: t('consultationTemplates.fields.proms'), key: 'formTemplates', sortable: false },
  { title: t('common.actions'), key: 'actions', sortable: false, align: 'end' as const },
])

// Validation rules
const rules = {
  required: (v: string | undefined) => !!v || t('validation.required'),
  email: (v: string | undefined) => !v || /.+@.+\..+/.test(v) || t('validation.email'),
  timeDelta: (v: string) => {
    if (!v) return t('validation.required')
    // Validate format like +6W, +3M, +1Y, +7d
    const regex = /^[+-]?\d+[wWmMdDyY]$/
    return regex.test(v) || t('consultationTemplates.validation.timeDeltaFormat')
  }
}

// Methods
const fetchTemplates = async () => {
  loading.value = true
  try {
    const response = await blueprintApi.getBlueprints({
      blueprintFor: 'consultation',
      limit: '100'
    })
    
    if (response.responseObject) {
      templates.value = response.responseObject.blueprints.map((blueprint) => {
        const content = blueprint.content as TemplateContent
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
      t('consultationTemplates.errors.fetchFailed')
    )
    console.error('Error fetching templates:', error)
  } finally {
    loading.value = false
  }
}

const fetchFormTemplates = async () => {
  loadingFormTemplates.value = true
  try {
    const response = await formtemplateApi.getFormTemplatesShortlist()
    if (response.responseObject) {
      formTemplates.value = response.responseObject
    }
  } catch (error) {
    notifierStore.error(
      t('consultationTemplates.errors.fetchPromsFailed')
    )
    console.error('Error fetching form templates:', error)
  } finally {
    loadingFormTemplates.value = false
  }
}

const openCreateDialog = () => {
  editedIndex.value = -1
  editedTemplate.value = {
    title: '',
    description: '',
    timeDelta: '',
    notes: '',
  }
  selectedFormTemplates.value = []
  originalFormTemplates.value = []
  dialog.value = true
}

const openEditDialog = (item: TemplateItem) => {
  editedIndex.value = templates.value.indexOf(item)
  editedTemplate.value = {
    ...item,
    notes: item.notes || '',
  }
  const formTemplatesList = item.content?.formTemplates || []
  selectedFormTemplates.value = [...formTemplatesList]
  originalFormTemplates.value = [...formTemplatesList]
  dialog.value = true
}

const closeDialog = () => {
  dialog.value = false
  setTimeout(() => {
    editedTemplate.value = {
      title: '',
      description: '',
      timeDelta: '',
      notes: '',
    }
    selectedFormTemplates.value = []
    originalFormTemplates.value = []
    editedIndex.value = -1
    formRef.value?.resetValidation()
  }, 300)
}

const saveTemplate = async () => {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    const templateData = {
      blueprintFor: 'consultation' as const,
      title: editedTemplate.value.title,
      description: editedTemplate.value.description,
      timeDelta: editedTemplate.value.timeDelta,
      content: {
        patientCaseId: '',
        dateAndTime: editedTemplate.value.timeDelta,
        reasonForConsultation: ['planned'],
        notes: editedTemplate.value.notes ? [{
          note: editedTemplate.value.notes,
          dateCreated: new Date().toISOString(),
        }] : [],
        visitedBy: [],
        formTemplates: selectedFormTemplates.value,
      },
      tags: ['consultation', 'template'],
    }

    if (editedIndex.value > -1) {
      // Update existing template
      const templateId = templates.value[editedIndex.value].id
      if (!templateId) {
        throw new Error('Template ID is missing')
      }
      await blueprintApi.updateBlueprint({
        id: templateId,
        updateBlueprintRequest: templateData
      })
      notifierStore.success(
        t('consultationTemplates.success.updated')
      )
    } else {
      // Create new template
      await blueprintApi.createBlueprint({
        createBlueprintRequest: templateData
      })
      notifierStore.success(
        t('consultationTemplates.success.created')
      )
    }

    await fetchTemplates()
    closeDialog()
  } catch (error) {
    notifierStore.error(
      editedIndex.value > -1
        ? t('consultationTemplates.errors.updateFailed')
        : t('consultationTemplates.errors.createFailed')
    )
    console.error('Error saving template:', error)
  } finally {
    saving.value = false
  }
}

const confirmArchive = (item: TemplateItem) => {
  templateToArchive.value = item
  archiveDialog.value = true
}

const confirmArchiveSecondStep = () => {
  archiveDialog.value = false
  archiveDialogSecond.value = true
}

const cancelArchive = () => {
  archiveDialog.value = false
  archiveDialogSecond.value = false
  templateToArchive.value = null
}

const archiveTemplate = async () => {
  if (!templateToArchive.value) return

  deleting.value = true
  try {
    const item = templateToArchive.value
    if (!item.id) {
      throw new Error('Template ID is missing')
    }
    const updatedTags = [...(item.tags || []).filter((t: string) => t !== 'archived'), 'archived']
    
    await blueprintApi.updateBlueprint({
      id: item.id,
      updateBlueprintRequest: {
        tags: updatedTags
      }
    })

    notifierStore.success(
      t('consultationTemplates.success.archived')
    )
    await fetchTemplates()
    cancelArchive()
  } catch (error) {
    notifierStore.error(
      t('consultationTemplates.errors.archiveFailed')
    )
    console.error('Error archiving template:', error)
  } finally {
    deleting.value = false
  }
}

const unarchiveTemplate = async (item: TemplateItem) => {
  try {
    if (!item.id) {
      throw new Error('Template ID is missing')
    }
    const updatedTags = (item.tags || []).filter((t: string) => t !== 'archived')
    
    await blueprintApi.updateBlueprint({
      id: item.id,
      updateBlueprintRequest: {
        tags: updatedTags
      }
    })

    notifierStore.success(
      t('consultationTemplates.success.unarchived')
    )
    await fetchTemplates()
  } catch (error) {
    notifierStore.error(
      t('consultationTemplates.errors.unarchiveFailed')
    )
    console.error('Error unarchiving template:', error)
  }
}

const toggleShowArchived = () => {
  showArchived.value = !showArchived.value
}

const getFormTemplatesCount = (item: TemplateItem) => {
  return item.content?.formTemplates?.length || 0
}

const getFormTemplateName = (formTemplateId: string) => {
  const template = formTemplates.value.find(ft => ft.id === formTemplateId)
  return template?.title || formTemplateId
}

const handleRowClick = (_event: PointerEvent, row: { item: TemplateItem }) => {
  if (!row.item.isArchived) {
    openEditDialog(row.item)
  }
}

// Lifecycle
onMounted(() => {
  fetchTemplates()
  fetchFormTemplates()
})
</script>

<style scoped>
.v-data-table {
  background-color: transparent;
}
</style>
