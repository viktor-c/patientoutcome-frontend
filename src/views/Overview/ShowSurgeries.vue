<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  type GetAllPatientCases200ResponseResponseObjectInnerSurgeriesInner as Surgery,
  type GetAllPatientCases200ResponseResponseObjectInnerSurgeriesInnerSideEnum as SurgerySide,
  type GetAllPatientCases200ResponseResponseObjectInnerSurgeriesInnerAnaesthesiaType as AnaesthesiaType,
  type FindAllCodes200ResponseResponseObjectInnerConsultationIdNotesInner as Note
} from '@/api'
const { t } = useI18n()

// Emits
const emit = defineEmits(['update:surgeries'])

// Data
const props = defineProps({
  patientId: {
    type: String,
    required: true,
  },
  caseId: {
    type: String,
    required: true,
  },
  surgeries: {
    type: Array<Surgery>,
    required: true,
  },
})

const newSurgery = ref(<Surgery>{
  id: '',
  externalId: '',
  diagnosis: [''],
  diagnosisICD10: [''],
  therapy: '',
  OPSCodes: [''],
  side: '' as SurgerySide, //left, right, none
  surgeryDate: '',
  surgeryTime: 0,
  tourniquet: 0,
  anaesthesiaType: {} as AnaesthesiaType,
  roentgenDosis: 0,
  roentgenTime: "",
  additionalData: [] as Note[],
  surgeons: [],
  patientCase: ''
})


// Methods
const addSurgery = () => {
  const surgery: Surgery = { ...newSurgery.value, id: Date.now().toString() } // Generate a temporary ID
  const updatedSurgeries = [...props.surgeries, surgery]
  newSurgery.value = { ...newSurgery.value, id: '' } // Reset the new surgery
  emit('update:surgeries', updatedSurgeries)
}

const updateSurgery = (index: number, field: keyof Surgery, value: string | undefined) => {
  const updatedSurgeries = [...props.surgeries]
  updatedSurgeries[index] = { ...(updatedSurgeries[index] as Surgery), [field]: value ?? "" } as Surgery
  emit('update:surgeries', updatedSurgeries)
}

const deleteSurgery = (index: number) => {
  const updatedSurgeries = props.surgeries.filter((_, i) => i !== index)
  emit('update:surgeries', updatedSurgeries)
}
</script>

<template>
  <v-card>
    <v-card-title>{{ t('surgeries.title') }}</v-card-title>
    <v-card-text>
      <!-- List of Surgeries -->
      <v-list>
        <v-list-item v-for="(surgery, index) in surgeries" :key="surgery.id || index">
          <v-card>
            <v-card-title>{{ surgery.therapy || t('forms.surgeryTherapyPlaceholder') }}</v-card-title>
            <v-card-text>
              <v-text-field v-model="surgery.therapy" :label="t('forms.surgeryTherapy')" outlined dense
                            @input="updateSurgery(index, 'therapy', surgery.therapy)"></v-text-field>
              <v-textarea v-model="surgery.side" :label="t('forms.surgerySide')" outlined dense
                          @input="updateSurgery(index, 'side', surgery.side)"></v-textarea>
            </v-card-text>
            <v-card-actions>
              <v-btn color="error" @click="deleteSurgery(index)">
                {{ t('buttons.delete') }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-list-item>
      </v-list>

      <!-- Add New Surgery Form -->
      <v-form @submit.prevent="addSurgery">
        <v-text-field v-model="newSurgery.therapy" :label="t('forms.surgeryName')" outlined dense
                      required></v-text-field>
        <v-text-field v-model="newSurgery.surgeryDate" :label="t('forms.surgeryDate')" type="date" outlined dense
                      required></v-text-field>
        <v-textarea v-model="newSurgery.externalId" :label="t('forms.surgeryDescription')" outlined dense
                    required></v-textarea>
        <v-btn color="success" type="submit">
          {{ t('buttons.add') }}
        </v-btn>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<style scoped>
/* Add any custom styles here */
</style>
