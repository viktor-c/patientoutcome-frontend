# PatientCaseCreateEditForm Usage

## In Creation Flow (without buttons)
```vue
<PatientCaseCreateEditForm
  ref="caseFormRef"
  :patientId="patientId"
  :createNewCase="true"
  :showButtons="false"
  v-model="caseData"
  @submit="handleSubmit"
  @cancel="handleCancel" />

<!-- External submit -->
<v-btn @click="caseFormRef?.submit()">Next Step</v-btn>
```

## In Dialog or Standalone (with buttons)
```vue
<PatientCaseCreateEditForm
  :patientId="patientId"
  :createNewCase="true"
  v-model="caseData"
  @submit="handleSubmit"
  @cancel="handleCancel" />
<!-- showButtons defaults to true, so form handles its own submission -->
```

## Editing Existing Case
```vue
<PatientCaseCreateEditForm
  :patientId="patientId"
  :selectedCase="existingCase"
  :createNewCase="false"
  @submit="handleUpdate"
  @cancel="handleCancel" />
```
