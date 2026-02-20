# Form Versioning Frontend Implementation Plan

## Backend API Endpoints (Ready to Use)

All endpoints require authentication. Version management requires admin or doctor role.

### 1. Get Version History
```
GET /form/:formId/versions
Response: Array of version metadata (without large data fields)
```

### 2. Get Specific Version
```
GET /form/:formId/version/:versionNumber
Response: Full version data including rawData
```

### 3. Compare Two Versions (Diff)
```
GET /form/:formId/diff?v1=1&v2=2
Response: { formId, v1: {...}, v2: {...} }
```

### 4. Get Change List
```
GET /form/:formId/changes?v1=1&v2=3
Response: Array of changes between versions (for non-consecutive versions)
```

### 5. Restore Version
```
POST /form/:formId/restore-version/:versionNumber
Body: { changeNotes?: string }
Response: Updated form with incremented version
```

## Frontend Components to Create

### 1. FormVersionHistory.vue
**Location**: `src/components/forms/FormVersionHistory.vue`

**Purpose**: Display list of all versions for a form

**Features**:
- Timeline view of versions (newest first)
- Show: version number, date/time, user who made change, notes
- Actions: View version, Compare with another, Restore
- Filter by date range or user
- Only visible to admin/doctor roles

**Props**:
```typescript
{
  formId: string,
  currentVersion: number
}
```

**Template Structure**:
```vue
<template>
  <v-dialog v-model="dialog" max-width="900px">
    <template #activator="{ props }">
      <v-btn v-bind="props" icon="mdi-history">
        <v-icon>mdi-history</v-icon>
        <v-tooltip activator="parent">View Version History</v-tooltip>
      </v-btn>
    </template>

    <v-card>
      <v-card-title>
        Form Version History
        <v-chip class="ml-2">Current: v{{ currentVersion }}</v-chip>
      </v-card-title>

      <v-card-text>
        <v-timeline side="end" density="compact">
          <v-timeline-item
            v-for="version in versions"
            :key="version.version"
            :dot-color="version.isRestoration ? 'warning' : 'primary'"
          >
            <template #opposite>
              <v-chip size="small">v{{ version.version }}</v-chip>
            </template>

            <v-card>
              <v-card-title class="text-body-1">
                {{ formatDate(version.changedAt) }}
                <v-chip v-if="version.isRestoration" size="small" class="ml-2">
                  Restored from v{{ version.restoredFromVersion }}
                </v-chip>
              </v-card-title>

              <v-card-subtitle>
                Changed by: {{ version.changedBy }}
              </v-card-subtitle>

              <v-card-text>
                {{ version.changeNotes || 'No notes provided' }}
              </v-card-text>

              <v-card-actions>
                <v-btn size="small" @click="viewVersion(version.version)">
                  View
                </v-btn>
                <v-btn size="small" @click="selectForCompare(version.version)">
                  Compare
                </v-btn>
                <v-btn 
                  v-if="canRestore"
                  size="small" 
                  color="warning" 
                  @click="confirmRestore(version.version)"
                >
                  Restore
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-timeline-item>
        </v-timeline>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
```

### 2. FormVersionDiff.vue
**Location**: `src/components/forms/FormVersionDiff.vue`

**Purpose**: Show differences between two versions

**Features**:
- Side-by-side comparison of form data
- Highlight changed fields (red=removed, green=added, yellow=modified)
- Show change metadata (dates, users, notes) for each version
- Navigate through changes
- Export diff report

**Props**:
```typescript
{
  formId: string,
  version1: number,
  version2: number
}
```

**Template Structure**:
```vue
<template>
  <v-dialog v-model="dialog" max-width="1200px" scrollable>
    <v-card>
      <v-card-title>
        Compare Versions
        <v-spacer />
        <v-chip class="mr-2">v{{ version1 }}</v-chip>
        <v-icon>mdi-arrow-right</v-icon>
        <v-chip class="ml-2">v{{ version2 }}</v-chip>
      </v-card-title>

      <v-card-text>
        <!-- Change Summary -->
        <v-alert v-if="changeList.length" type="info" class="mb-4">
          {{ changeList.length }} changes between these versions
        </v-alert>

        <!-- Side-by-side diff -->
        <v-row>
          <v-col cols="6">
            <h3>Version {{ version1 }}</h3>
            <p class="text-caption">{{ v1Data.changedAt }} by {{ v1Data.changedBy }}</p>
            <div class="form-data-display">
              <PluginFormRenderer
                :template-id="templateId"
                :initial-data="v1Data.rawData"
                :readonly="true"
                :highlight-changes="diffChanges"
                diff-mode="old"
              />
            </div>
          </v-col>

          <v-col cols="6">
            <h3>Version {{ version2 }}</h3>
            <p class="text-caption">{{ v2Data.changedAt }} by {{ v2Data.changedBy }}</p>
            <div class="form-data-display">
              <PluginFormRenderer
                :template-id="templateId"
                :initial-data="v2Data.rawData"
                :readonly="true"
                :highlight-changes="diffChanges"
                diff-mode="new"
              />
            </div>
          </v-col>
        </v-row>

        <!-- Change List (for non-consecutive versions) -->
        <v-expansion-panels v-if="changeList.length > 2" class="mt-4">
          <v-expansion-panel>
            <v-expansion-panel-title>
              Intermediate Changes ({{ changeList.length - 2 }})
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-timeline density="compact">
                <v-timeline-item
                  v-for="change in intermediateChanges"
                  :key="change.version"
                >
                  <strong>v{{ change.version }}</strong>
                  - {{ formatDate(change.changedAt) }}
                  by {{ change.changedBy }}
                  <br />
                  <em>{{ change.changeNotes }}</em>
                </v-timeline-item>
              </v-timeline>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>

      <v-card-actions>
        <v-btn @click="dialog = false">Close</v-btn>
        <v-spacer />
        <v-btn color="primary" @click="exportDiff">Export Report</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
```

### 3. Update PluginFormRenderer.vue
**Location**: `src/forms/components/PluginFormRenderer.vue`

**Add to existing component**:

```vue
<script setup lang="ts">
// Add props
const props = withDefaults(
  defineProps<{
    // ... existing props
    showVersionControls?: boolean
    currentVersion?: number
    readonly?: boolean // For viewing old versions
    highlightChanges?: Array<string> // Field paths that changed
    diffMode?: 'old' | 'new' | null // For diff view styling
  }>(),
  {
    showVersionControls: false,
    readonly: false,
    diffMode: null
  }
)

// Add to computed
const canViewVersions = computed(() => {
  return props.showVersionControls && 
         userStore.hasRole(['admin', 'doctor'])
})

// Add version-related state
const versionHistoryDialog = ref(false)
const selectedVersion = ref<number | null>(null)
</script>

<template>
  <div class="plugin-form-renderer">
    <!-- Version Controls Header (only for admin/doctor) -->
    <v-card v-if="canViewVersions" class="mb-4" variant="outlined">
      <v-card-text class="d-flex align-center">
        <v-chip class="mr-2" color="primary">
          <v-icon start>mdi-file-document</v-icon>
          Version {{ currentVersion }}
        </v-chip>
        
        <v-spacer />
        
        <FormVersionHistory
          :form-id="formId"
          :current-version="currentVersion"
          @view-version="handleViewVersion"
          @compare-versions="handleCompareVersions"
          @restore-version="handleRestoreVersion"
        />
      </v-card-text>
    </v-card>

    <!-- Viewing Old Version Banner -->
    <v-alert
      v-if="selectedVersion && selectedVersion !== currentVersion"
      type="warning"
      class="mb-4"
      prominent
    >
      <v-row align="center">
        <v-col class="grow">
          You are viewing version {{ selectedVersion }} (not current)
        </v-col>
        <v-col class="shrink">
          <v-btn @click="viewCurrentVersion">
            View Current Version
          </v-btn>
        </v-col>
      </v-row>
    </v-alert>

    <!-- Existing form renderer -->
    <component
      :is="plugin?.component"
      v-bind="formProps"
      :readonly="readonly || (selectedVersion !== null && selectedVersion !== currentVersion)"
      :class="diffModeClass"
    />
  </div>
</template>

<style scoped>
.diff-mode-old .field-changed {
  background-color: #ffebee; /* Light red for removed/old values */
}

.diff-mode-new .field-changed {
  background-color: #e8f5e9; /* Light green for added/new values */
}
</style>
```

### 4. API Service Methods
**Location**: `src/services/formService.ts` or create `src/services/formVersionService.ts`

```typescript
import axiosInstance from './api'
import type { ServiceResponse } from '@/types'

export interface FormVersion {
  _id: string
  formId: string
  version: number
  rawData: any
  previousRawData: any | null
  changedBy: string
  changedAt: string
  changeNotes: string
  isRestoration: boolean
  restoredFromVersion: number | null
}

export interface VersionCompareResult {
  formId: string
  v1: {
    version: number
    changedBy: string
    changedAt: string
    changeNotes: string
    rawData: any
  }
  v2: {
    version: number
    changedBy: string
    changedAt: string
    changeNotes: string
    rawData: any
  }
}

export const formVersionService = {
  /**
   * Get version history for a form
   */
  async getVersionHistory(formId: string): Promise<ServiceResponse<FormVersion[]>> {
    const response = await axiosInstance.get(`/form/${formId}/versions`)
    return response.data
  },

  /**
   * Get a specific version with full data
   */
  async getVersion(formId: string, versionNumber: number): Promise<ServiceResponse<FormVersion>> {
    const response = await axiosInstance.get(`/form/${formId}/version/${versionNumber}`)
    return response.data
  },

  /**
   * Compare two versions
   */
  async compareVersions(
    formId: string,
    v1: number,
    v2: number
  ): Promise<ServiceResponse<VersionCompareResult>> {
    const response = await axiosInstance.get(`/form/${formId}/diff`, {
      params: { v1, v2 }
    })
    return response.data
  },

  /**
   * Get list of changes between two versions
   */
  async getChangeList(
    formId: string,
    v1: number,
    v2: number
  ): Promise<ServiceResponse<FormVersion[]>> {
    const response = await axiosInstance.get(`/form/${formId}/changes`, {
      params: { v1, v2 }
    })
    return response.data
  },

  /**
   * Restore a previous version
   */
  async restoreVersion(
    formId: string,
    versionNumber: number,
    changeNotes?: string
  ): Promise<ServiceResponse<any>> {
    const response = await axiosInstance.post(
      `/form/${formId}/restore-version/${versionNumber}`,
      { changeNotes }
    )
    return response.data
  }
}
```

## Blueprint and Consultation Integration

### 1. Update Blueprint Store
**Location**: `src/stores/blueprintStore.ts`

```typescript
// Add to blueprint form template interface
interface BlueprintFormTemplate {
  formTemplateId: string
  title: string
  description: string
  accessLevel: 'patient' | 'authenticated' | 'inactive' // ADD THIS
  // ... existing fields
}

// When creating forms from blueprint
function createFormsFromBlueprint(blueprint: Blueprint) {
  blueprint.formTemplates.forEach(template => {
    // Use the accessLevel from the template
    const form = {
      ...formData,
      accessLevel: template.accessLevel || 'patient' // Default to patient
    }
  })
}
```

### 2. Update Consultation Creation UI
**Location**: `src/views/Overview/CreateConsultation.vue` or similar

```vue
<template>
  <!-- When showing available forms -->
  <v-list>
    <v-list-item
      v-for="form in availableForms"
      :key="form._id"
    >
      <v-list-item-title>
        {{ form.title }}
        <v-chip class="ml-2" size="small" :color="getAccessLevelColor(form.accessLevel)">
          {{ form.accessLevel }}
        </v-chip>
      </v-list-item-title>

      <!-- Show who can fill this form -->
      <v-list-item-subtitle>
        Can be filled by: {{ getAccessLevelDescription(form.accessLevel) }}
      </v-list-item-subtitle>

      <!-- Allow override for special cases (admin only) -->
      <v-list-item-action v-if="isAdmin">
        <v-select
          v-model="form.accessLevel"
          :items="['patient', 'authenticated', 'inactive']"
          density="compact"
          label="Override Access Level"
        />
      </v-list-item-action>
    </v-list-item>
  </v-list>
</template>

<script setup lang="ts">
function getAccessLevelColor(level: string) {
  return {
    patient: 'success',
    authenticated: 'info',
    inactive: 'grey'
  }[level]
}

function getAccessLevelDescription(level: string) {
  return {
    patient: 'Patients (via access code)',
    authenticated: 'Healthcare professionals only',
    inactive: 'Form is disabled'
  }[level]
}
</script>
```

## Testing Frontend

Create tests in `src/components/forms/__tests__/`:

```typescript
// FormVersionHistory.spec.ts
// FormVersionDiff.spec.ts
// Test version viewing, comparison, restoration
// Mock API responses from backend
```

## Implementation Steps

1. **Phase 1: API Integration**
   - Add formVersionService.ts with API methods
   - Test API calls work with backend

2. **Phase 2: Version History**
   - Create FormVersionHistory.vue component
   - Integrate into PluginFormRenderer
   - Wire up role-based visibility

3. **Phase 3: Diff View**
   - Create FormVersionDiff.vue component
   - Implement side-by-side rendering
   - Add change highlighting

4. **Phase 4: Restoration**
   - Add restore confirmation dialog
   - Implement restore with auto-generated notes
   - Allow user to override notes

5. **Phase 5: Blueprint/Consultation**
   - Update blueprint model with accessLevel
   - Update blueprint UI to show/edit access levels
   - Update consultation creation to respect access levels

6. **Phase 6: Testing & Polish**
   - Write component tests
   - Test all user flows
   - Polish UI/UX

## User Roles & Permissions

- **Patient**: Can fill forms with `accessLevel: 'patient'`, cannot view versions
- **Student**: Can view patient forms, cannot view versions  
- **Doctor**: Can fill `authenticated` forms, can view/compare/restore versions
- **Admin**: Full access to all features, can override access levels

## Notes

- All version operations require authentication
- Version history only visible to admin/doctor roles
- Restoration creates a new version (doesn't overwrite history)
- Access level determines who can fill the form, not who can view it
- AOFAS forms should be `authenticated` (clinical outcomes)
- EFAS, MOXFQ, VAS, VISA-A should be `patient` (PROMs)
