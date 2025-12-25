<template>
  <v-container>
    <v-card>
      <v-card-title>
        <v-icon start>mdi-domain</v-icon>
        {{ t('departmentManagement.title') }}
      </v-card-title>

      <v-card-text>
        <v-alert type="info" variant="tonal" class="mb-4">
          {{ t('departmentManagement.description') }}
        </v-alert>

        <!-- Add New Department Button -->
        <v-row class="mb-4">
          <v-col>
            <v-btn
              color="primary"
              @click="openCreateDialog"
              prepend-icon="mdi-plus"
            >
              {{ t('departmentManagement.addDepartment') }}
            </v-btn>
          </v-col>
        </v-row>

        <!-- Departments Table -->
        <v-data-table
          :headers="headers"
          :items="departments"
          :loading="loading"
          :items-per-page="10"
          class="elevation-1"
        >
          <template #[`item.actions`]="{ item }">
            <v-btn
              icon="mdi-pencil"
              size="small"
              variant="text"
              @click="openEditDialog(item)"
            />
            <v-btn
              icon="mdi-delete"
              size="small"
              variant="text"
              color="error"
              @click="confirmDelete(item)"
            />
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Create/Edit Dialog -->
    <v-dialog v-model="dialog" max-width="600px">
      <v-card>
        <v-card-title>
          <span class="text-h5">{{ dialogTitle }}</span>
        </v-card-title>

        <v-card-text>
          <v-form ref="formRef">
            <v-text-field
              v-model="editedDepartment.name"
              :label="t('departmentManagement.fields.name')"
              :rules="[rules.required]"
              required
            />

            <v-text-field
              v-model="editedDepartment.shortName"
              :label="t('departmentManagement.fields.shortName')"
            />

            <v-textarea
              v-model="editedDepartment.description"
              :label="t('departmentManagement.fields.description')"
              rows="3"
            />

            <v-text-field
              v-model="editedDepartment.contactEmail"
              :label="t('departmentManagement.fields.contactEmail')"
              :rules="[rules.email]"
              type="email"
            />

            <v-text-field
              v-model="editedDepartment.contactPhone"
              :label="t('departmentManagement.fields.contactPhone')"
              type="tel"
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
            :loading="saving"
            @click="saveDepartment"
          >
            {{ t('common.save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="500px">
      <v-card>
        <v-card-title class="text-h5">
          {{ t('departmentManagement.confirmDelete') }}
        </v-card-title>

        <v-card-text>
          {{ t('departmentManagement.deleteWarning', { name: departmentToDelete?.name }) }}
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn text @click="deleteDialog = false">
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn
            color="error"
            :loading="deleting"
            @click="deleteDepartment"
          >
            {{ t('common.delete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Second Confirmation Dialog for Users Still Assigned -->
    <v-dialog v-model="usersAssignedDialog" max-width="600px">
      <v-card>
        <v-card-title class="text-h5">
          {{ t('departmentManagement.usersStillAssigned') }}
        </v-card-title>

        <v-card-text>
          <p>{{ t('departmentManagement.usersAssignedMessage') }}</p>
          <p class="mt-2">
            <router-link to="/admin/users" @click="usersAssignedDialog = false">
              {{ t('departmentManagement.goToUserManagement') }}
            </router-link>
          </p>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn text @click="usersAssignedDialog = false">
            {{ t('common.close') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNotifierStore } from '@/stores/notifierStore'
import { userDepartmentApi } from '@/api.ts'
import type { UserDepartment } from '@/api'

const { t } = useI18n()
const notifierStore = useNotifierStore()

const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const dialog = ref(false)
const deleteDialog = ref(false)
const usersAssignedDialog = ref(false)
const formRef = ref()

const departments = ref<UserDepartment[]>([])
const editedDepartment = ref<UserDepartment>({
  name: '',
  shortName: '',
  description: '',
  contactEmail: '',
  contactPhone: '',
})
const editedIndex = ref(-1)
const departmentToDelete = ref<UserDepartment | null>(null)

const headers = computed(() => [
  { title: t('departmentManagement.fields.name'), key: 'name', sortable: true },
  { title: t('departmentManagement.fields.shortName'), key: 'shortName', sortable: true },
  { title: t('departmentManagement.fields.description'), key: 'description', sortable: false },
  { title: t('departmentManagement.fields.contactEmail'), key: 'contactEmail', sortable: false },
  { title: t('departmentManagement.fields.contactPhone'), key: 'contactPhone', sortable: false },
  { title: t('common.actions'), key: 'actions', sortable: false, align: 'end' as const },
])

const dialogTitle = computed(() => {
  return editedIndex.value === -1
    ? t('departmentManagement.addDepartment')
    : t('departmentManagement.editDepartment')
})

const rules = {
  required: (v: string | number | boolean | null | undefined) => !!v || t('validation.required'),
  email: (v: string | null | undefined) => !v || /.+@.+\..+/.test(v) || t('validation.email'),
}

onMounted(() => {
  loadDepartments()
})

async function loadDepartments() {
  loading.value = true
  try {
    const response = await userDepartmentApi.getAllDepartments()
    if (response.success && response.responseObject) {
      departments.value = response.responseObject
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    notifierStore.notify(message || t('departmentManagement.loadError'), 'error')
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  editedIndex.value = -1
  editedDepartment.value = {
    name: '',
    shortName: '',
    description: '',
    contactEmail: '',
    contactPhone: '',
  }
  dialog.value = true
}

function openEditDialog(department: UserDepartment) {
  editedIndex.value = departments.value.findIndex(d => d.id === department.id)
  editedDepartment.value = { ...department }
  dialog.value = true
}

function closeDialog() {
  dialog.value = false
  editedIndex.value = -1
  editedDepartment.value = {
    name: '',
    shortName: '',
    description: '',
    contactEmail: '',
    contactPhone: '',
  }
}

async function saveDepartment() {
  if (!formRef.value?.validate()) return

  saving.value = true
  try {
    if (editedIndex.value === -1) {
      // Create new department
      const response = await userDepartmentApi.createUserDepartment({
        createUserDepartmentRequest: editedDepartment.value
      })
      if (response.success) {
        notifierStore.notify(t('departmentManagement.createSuccess'), 'success')
        await loadDepartments()
        closeDialog()
      }
    } else {
      // Update existing department
      const id = editedDepartment.value.id!
      const response = await userDepartmentApi.updateDepartmentById({
        id,
        updateDepartmentByIdRequest: editedDepartment.value
      })
      if (response.success) {
        notifierStore.notify(t('departmentManagement.updateSuccess'), 'success')
        await loadDepartments()
        closeDialog()
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    notifierStore.notify(message || t('departmentManagement.deleteError'), 'error')
    notifierStore.notify(message || t('departmentManagement.saveError'), 'error')
  } finally {
    saving.value = false
  }
}

function confirmDelete(department: UserDepartment) {
  departmentToDelete.value = department
  deleteDialog.value = true
}

async function deleteDepartment() {
  if (!departmentToDelete.value?.id) return

  deleting.value = true
  try {
    const response = await userDepartmentApi.deleteDepartmentById({
      id: departmentToDelete.value.id
    })
    if (response.success) {
      notifierStore.notify(t('departmentManagement.deleteSuccess'), 'success')
      await loadDepartments()
      deleteDialog.value = false
      departmentToDelete.value = null
    }
  } catch (error: unknown) {
    deleteDialog.value = false
    
    // Check if error is due to users still assigned (409 Conflict)
    const message = error instanceof Error ? error.message : String(error)
    if (message?.includes('409') || message?.includes('still assigned')) {
      usersAssignedDialog.value = true
    } else {
      notifierStore.notify(message || t('departmentManagement.deleteError'), 'error')
    }
  } finally {
    deleting.value = false
  }
}
</script>
