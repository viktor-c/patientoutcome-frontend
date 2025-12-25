<template>
  <v-container>
    <v-card>
      <v-card-title>
        <v-icon start>mdi-account-multiple-plus</v-icon>
        {{ t('batchUserCreation.title') }}
      </v-card-title>

      <v-card-text>
        <v-alert type="info" variant="tonal" class="mb-4">
          {{ t('batchUserCreation.description') }}
        </v-alert>

        <v-form ref="formRef" @submit.prevent="createBatch">
          <!-- Department and Center Selection -->
          <v-row>
            <v-col cols="12" md="2" sm="6">
              <v-select
                        v-model="form.departmentId"
                        :label="t('batchUserCreation.department')"
                        :items="departments"
                        item-title="name"
                        item-value="id"
                        :rules="[rules.required]"
                        :loading="loadingDepartments"
                        required />
            </v-col>
            <v-col cols="12" md="2" sm="6">
              <v-select
                        v-model="form.belongsToCenter"
                        :label="t('batchUserCreation.centers')"
                        :items="availableCenters"
                        multiple
                        chips
                        closable-chips
                        :rules="[rules.requiredArray]"
                        required />
            </v-col>
          </v-row>

          <!-- Roles and User Count -->
          <v-card variant="outlined" class="mb-4">
            <v-card-title class="text-subtitle-1">
              {{ t('batchUserCreation.roleConfiguration') }}
            </v-card-title>
            <v-card-text>
              <v-row>
                <v-col v-for="role in availableRoles" :key="role.value" cols="12" sm="6" md="2">
                  <v-text-field
                                v-model.number="form.roleCounts[role.value]"
                                :label="role.title"
                                type="number"
                                min="0"
                                max="100"
                                hide-details />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Expiry Configuration -->
          <v-card variant="outlined" class="mb-4">
            <v-card-title class="text-subtitle-1">
              {{ t('batchUserCreation.expiryConfiguration') }}
            </v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="12" md="2" sm="6">
                  <v-select
                            v-model="form.expiryType"
                            :label="t('batchUserCreation.expiryType')"
                            :items="expiryTypes"
                            item-title="title"
                            item-value="value" />
                </v-col>
                <v-col cols="12" md="2" sm="6">
                  <v-text-field
                                v-if="form.expiryType !== 'date'"
                                v-model.number="form.expiryValue"
                                :label="expiryValueLabel"
                                type="number"
                                min="1"
                                :rules="[rules.required]" />
                  <v-text-field
                                v-else
                                v-model="form.expiryValue"
                                :label="t('batchUserCreation.expiryDate')"
                                type="date"
                                :rules="[rules.required]" />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Action Buttons -->
          <v-row>
            <v-col>
              <v-btn
                     color="primary"
                     type="submit"
                     :loading="loading"
                     :disabled="!canSubmit"
                     block>
                <v-icon start>mdi-account-multiple-plus</v-icon>
                {{ t('batchUserCreation.generate') }}
              </v-btn>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
    </v-card>

    <!-- Results Section -->
    <v-card v-if="generatedCodes && Object.keys(generatedCodes).length > 0" class="mt-4">
      <v-card-title>
        <v-icon start>mdi-check-circle</v-icon>
        {{ t('batchUserCreation.generatedCodesTitle') }}
      </v-card-title>
      <v-card-text>
        <v-alert type="success" variant="tonal" class="mb-4">
          {{ t('batchUserCreation.successMessage', { count: totalGeneratedCodes }) }}
        </v-alert>

        <v-expansion-panels>
          <v-expansion-panel v-for="(codes, role) in generatedCodes" :key="role">
            <v-expansion-panel-title>
              <v-icon start>mdi-account</v-icon>
              {{ getRoleTitle(role) }} ({{ codes.length }} {{ t('batchUserCreation.codes') }})
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-chip
                      v-for="code in codes"
                      :key="code"
                      class="ma-1"
                      color="primary"
                      variant="outlined">
                {{ code }}
              </v-chip>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <v-row class="mt-4">
          <v-col>
            <v-btn
                   color="success"
                   @click="generatePDF"
                   :loading="generatingPDF"
                   block>
              <v-icon start>mdi-file-pdf-box</v-icon>
              {{ t('batchUserCreation.downloadPDF') }}
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
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

const formRef = ref()
const loading = ref(false)
const generatingPDF = ref(false)
const loadingDepartments = ref(false)

const departments = ref<UserDepartment[]>([])

const form = ref({
  departmentId: '',
  belongsToCenter: [] as string[],
  roleCounts: {} as Record<string, number>,
  expiryType: 'years' as 'days' | 'months' | 'years' | 'date',
  expiryValue: 1 as number | string,
})

const generatedCodes = ref<Record<string, string[]> | null>(null)

// Available roles
const availableRoles = computed(() => [
  { value: 'doctor', title: t('roles.doctor') },
  { value: 'mfa', title: t('roles.mfa') },
  { value: 'study-nurse', title: t('roles.study-nurse') },
  { value: 'kiosk', title: t('roles.kiosk') },
  { value: 'project-manager', title: t('roles.project-manager') },
])

// Initialize role counts
availableRoles.value.forEach(role => {
  form.value.roleCounts[role.value] = 0
})

const availableCenters = ['1', '2', '3', '4', '5']

const expiryTypes = computed(() => [
  { value: 'days', title: t('batchUserCreation.expiryTypes.days') },
  { value: 'months', title: t('batchUserCreation.expiryTypes.months') },
  { value: 'years', title: t('batchUserCreation.expiryTypes.years') },
  { value: 'date', title: t('batchUserCreation.expiryTypes.date') },
])

const expiryValueLabel = computed(() => {
  switch (form.value.expiryType) {
    case 'days':
      return t('batchUserCreation.daysLabel')
    case 'months':
      return t('batchUserCreation.monthsLabel')
    case 'years':
      return t('batchUserCreation.yearsLabel')
    default:
      return t('batchUserCreation.expiryDate')
  }
})

const canSubmit = computed(() => {
  const hasValidCount = Object.values(form.value.roleCounts).some(count => count > 0)

  return hasValidCount && form.value.departmentId && form.value.belongsToCenter.length > 0
})

const totalGeneratedCodes = computed(() => {
  if (!generatedCodes.value) return 0
  return Object.values(generatedCodes.value).reduce((sum, codes) => sum + codes.length, 0)
})

const selectedDepartmentName = computed(() => {
  const dept = departments.value.find(d => d.id === form.value.departmentId)
  return dept?.name || ''
})

const rules = {
  required: (v: string | number | boolean | null | undefined) => !!v || t('validation.required'),
  requiredArray: (v: unknown[]) => (v && v.length > 0) || t('validation.required'),
}

onMounted(() => {
  loadDepartments()
})

async function loadDepartments() {
  loadingDepartments.value = true
  try {
    const response = await userDepartmentApi.getAllDepartments()
    if (response.success && response.responseObject) {
      departments.value = response.responseObject
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    notifierStore.notify(message || t('departmentManagement.loadError'), 'error')
  } finally {
    loadingDepartments.value = false
  }
}

function getRoleTitle(roleValue: string) {
  const role = availableRoles.value.find(r => r.value === roleValue)
  return role ? role.title : roleValue
}

async function createBatch() {
  if (!formRef.value?.validate()) return

  loading.value = true

  try {
    // Build roles array with counts (only include roles with count > 0)
    const roles = Object.entries(form.value.roleCounts)
      .filter(([, count]) => count > 0)
      .map(([role, count]) => ({
        role,
        count,
      }))

    const payload = {
      roles,
      department: form.value.departmentId,
      belongsToCenter: form.value.belongsToCenter,
      expiryType: form.value.expiryType,
      expiryValue: form.value.expiryType === 'date'
        ? new Date(form.value.expiryValue as string).toISOString()
        : form.value.expiryValue,
    }

    const response = await fetch(`${import.meta.env.VITE_API_URL}/user/batch-registration-codes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (data.success) {
      generatedCodes.value = data.responseObject
      notifierStore.notify(t('batchUserCreation.success'), 'success')
    } else {
      notifierStore.notify(t('batchUserCreation.error'), 'error')
    }
  } catch (error) {
    console.error('Batch creation error:', error)
    notifierStore.notify(t('batchUserCreation.error'), 'error')
  } finally {
    loading.value = false
  }
}

async function generatePDF() {
  if (!generatedCodes.value) return

  generatingPDF.value = true

  try {
    // Dynamic import for jsPDF and QRCode
    const { default: jsPDF } = await import('jspdf')
    const QRCode = await import('qrcode')

    const doc = new jsPDF()
    const pageWidth = 210 // A4 width in mm
    const pageHeight = 297 // A4 height in mm
    const margin = 10
    const qrSize = 40
    const boxWidth = (pageWidth - 3 * margin) / 2
    const boxHeight = (pageHeight - 5 * margin) / 2

    let itemsOnPage = 0

    for (const [role, codes] of Object.entries(generatedCodes.value)) {
      for (const code of codes) {
        if (itemsOnPage === 4) {
          doc.addPage()
          itemsOnPage = 0
        }

        const row = Math.floor(itemsOnPage / 2)
        const col = itemsOnPage % 2

        const x = margin + col * (boxWidth + margin)
        const y = margin + row * (boxHeight + margin)

        // Draw box
        doc.rect(x, y, boxWidth, boxHeight)

        // Add role title
        doc.setFontSize(14)
        doc.text(getRoleTitle(role), x + boxWidth / 2, y + 10, { align: 'center' })

        // Add instructions
        doc.setFontSize(10)
        const instructions = t('batchUserCreation.pdfInstructions')
        const splitInstructions = doc.splitTextToSize(instructions, boxWidth - 10)
        doc.text(splitInstructions, x + 5, y + 20)

        // Generate QR code
        const registrationUrl = `${window.location.origin}/register?code=${code}`
        const qrDataUrl = await QRCode.toDataURL(registrationUrl, { width: 200 })

        // Add QR code
        const qrX = x + (boxWidth - qrSize) / 2
        const qrY = y + 40
        doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)

        // Add code text
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text(code, x + boxWidth / 2, qrY + qrSize + 10, { align: 'center' })

        // Add department and expiry info
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(`${t('batchUserCreation.department')}: ${selectedDepartmentName.value}`, x + 5, qrY + qrSize + 20)

        itemsOnPage++
      }
    }

    // Save PDF
    doc.save(`registration-codes-${Date.now()}.pdf`)
    notifierStore.notify(t('batchUserCreation.pdfGenerated'), 'success')
  } catch (error) {
    console.error('PDF generation error:', error)
    notifierStore.notify(t('batchUserCreation.pdfError'), 'error')
  } finally {
    generatingPDF.value = false
  }
}
</script>
