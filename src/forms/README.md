# Form Plugin System

This directory contains the new plugin-based form architecture that replaces JsonForms.

## Overview

The plugin system provides a modular, type-safe way to define and render forms. Each form is a self-contained plugin that includes:

- **Vue Component**: Renders the form UI
- **Translations**: All text in multiple languages
- **Scoring Logic**: Calculates scores from answers
- **Validation**: Validates form data

## Benefits

✅ **No database bloat**: Translations are embedded in plugins, not duplicated per form submission  
✅ **Type-safe**: Full TypeScript support throughout  
✅ **Auto-discovery**: New plugins are automatically registered  
✅ **Reusable**: Shared utilities for common patterns  
✅ **No JsonForms overhead**: Direct Vue components, better performance  
✅ **Easy to test**: Each plugin is independently testable

## Directory Structure

```
src/forms/
├── types.ts                    # Plugin interface definitions
├── registry.ts                 # Auto-discovery and registration
├── composables/
│   └── useForm.ts             # Shared form logic
├── utils/
│   └── scoring.ts             # Shared scoring utilities
├── components/
│   └── PluginFormRenderer.vue # Generic plugin renderer
└── plugins/
    ├── moxfq/                 # MOXFQ plugin
    │   ├── index.ts           # Plugin registration
    │   ├── MoxfqForm.vue      # Form component
    │   ├── scoring.ts         # Scoring logic
    │   └── translations.ts    # Translations
    ├── visaa/                 # VISA-A plugin
    ├── vas/                   # VAS plugin
    ├── aofas/                 # AOFAS plugin
    └── efas/                  # EFAS plugin
```

## Creating a New Form Plugin

### 1. Create Plugin Directory

```bash
mkdir -p src/forms/plugins/myform
```

### 2. Create Translations (`translations.ts`)

```typescript
import type { FormTranslations } from '../../types'

export const translations: FormTranslations = {
  en: {
    'form.title': 'My Form',
    'form.instructions': 'Please answer all questions',
    'q1': 'Question 1 text',
    'q2': 'Question 2 text',
    // ...
  },
  de: {
    'form.title': 'Mein Formular',
    // ...
  }
}
```

### 3. Create Scoring Logic (`scoring.ts`)

```typescript
import type { FormData } from '../../types'
import type { ScoringData } from '@/types/backend/scoring'
import { calculateSubscaleScore, extractQuestions } from '../../utils/scoring'

export function calculateScore(data: FormData): ScoringData {
  const section = data.myform || {}
  
  const questions = extractQuestions(section, ['q1', 'q2', 'q3'])
  
  const totalScore = calculateSubscaleScore(
    'Total',
    questions,
    5, // max score per question
    { description: 'Total score' }
  )
  
  return {
    rawData: { myform: section },
    subscales: {},
    total: totalScore
  }
}

export function validateFormData(data: FormData): boolean {
  // Implement validation logic
  return true
}

export function getInitialData(): FormData {
  return {
    myform: {
      q1: null,
      q2: null,
      q3: null
    }
  }
}
```

### 4. Create Vue Component (`MyForm.vue`)

```vue
<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useForm } from '../../composables/useForm'
import { calculateScore } from './scoring'
import { translations } from './translations'
import type { FormComponentProps, FormComponentEvents } from '../../types'

const props = withDefaults(defineProps<FormComponentProps>(), {
  readonly: false,
  locale: 'en'
})

const emit = defineEmits<FormComponentEvents>()

const { updateQuestion, getQuestion, t } = useForm({
  modelValue: toRef(props, 'modelValue'),
  calculateScore,
  translations,
  locale: toRef(props, 'locale'),
  emit
})

const questions = computed(() => [
  { key: 'q1', label: t('q1') },
  { key: 'q2', label: t('q2') },
  { key: 'q3', label: t('q3') }
])
</script>

<template>
  <div class="my-form">
    <h3>{{ t('form.title') }}</h3>
    <p>{{ t('form.instructions') }}</p>
    
    <div v-for="question in questions" :key="question.key">
      <v-radio-group
        :model-value="getQuestion('myform', question.key)"
        :readonly="readonly"
        @update:model-value="(v) => updateQuestion('myform', question.key, v)"
        :label="question.label"
      >
        <v-radio :value="0" label="Never" />
        <v-radio :value="1" label="Sometimes" />
        <v-radio :value="2" label="Often" />
      </v-radio-group>
    </div>
  </div>
</template>
```

### 5. Create Plugin Registration (`index.ts`)

```typescript
import MyForm from './MyForm.vue'
import { translations } from './translations'
import { calculateScore, validateFormData, getInitialData } from './scoring'
import type { FormPlugin } from '../../types'

const plugin: FormPlugin = {
  metadata: {
    id: 'YOUR_TEMPLATE_ID_HERE', // Must match backend
    name: 'My Form',
    description: 'Brief description of what this form measures',
    version: '1.0.0',
    supportedLocales: ['en', 'de']
  },
  
  component: MyForm,
  translations,
  calculateScore,
  validateFormData,
  getInitialData
}

export default plugin
```

### 6. Auto-Registration

The plugin will be automatically discovered and registered when you create the `index.ts` file. No manual registration needed!

## Usage

### In Templates

```vue
<script setup>
import PluginFormRenderer from '@/forms/components/PluginFormRenderer.vue'

const formData = ref({ myform: { q1: null, q2: null } })
const templateId = '67b4e612d0feb4ad99ae2e85' // MOXFQ example

function handleDataChange(newData) {
  formData.value = newData
}

function handleScoreChange(scoring) {
  console.log('New score:', scoring)
}
</script>

<template>
  <PluginFormRenderer
    :template-id="templateId"
    v-model="formData"
    :readonly="false"
    locale="en"
    @score-change="handleScoreChange"
  />
</template>
```

### In TypeScript

```typescript
import { getFormPlugin, getAllFormPlugins } from '@/forms/registry'

// Get a specific plugin
const plugin = getFormPlugin('67b4e612d0feb4ad99ae2e85')
if (plugin) {
  // Calculate score
  const scoring = plugin.calculateScore(formData)
  
  // Validate
  const isValid = plugin.validateFormData(formData)
  
  // Get translations
  const title = plugin.translations.en['form.title']
}

// Get all available plugins
const allPlugins = getAllFormPlugins()
console.log('Available forms:', allPlugins.map(p => p.metadata.name))
```

## Migration from JsonForms

### Before (JsonForms)
- Form data included translations ❌
- Manual renderer registration ❌
- Duplicate scoring in frontend/backend ❌
- JsonForms abstraction overhead ❌

### After (Plugins)
- Translations in plugin, not data ✅
- Auto-discovery ✅
- Shared scoring logic ✅
- Direct Vue components ✅

### Migration Steps

1. Create plugin directory structure
2. Extract translations from JSON template
3. Copy scoring logic (can share with backend)
4. Adapt Vue component (remove JsonForms dependencies)
5. Register plugin
6. Update parent components to use `PluginFormRenderer`
7. Remove JsonForms dependencies

## Shared Utilities

### `useForm` Composable

Provides common form functionality:
- v-model integration
- Score calculation with auto-emit
- Validation tracking
- Translation helper

### Scoring Utilities

- `calculateSubscaleScore`: Calculate a subscale score
- `calculateTotalScore`: Sum multiple subscales
- `extractQuestions`: Extract specific questions from data
- `getFormCompletionStatus`: Determine if form is complete

## Backend Integration

The plugin ID must match the backend `templateId`. The backend will use the same scoring logic (can be shared if using TypeScript on backend).

### Sharing Scoring Logic

For maximum code reuse, the scoring logic in `scoring.ts` can be imported by both:
- Frontend: For real-time score display
- Backend: For server-side validation and persistence

Make sure the scoring function is pure (no DOM or browser APIs) so it works in both environments.

## Testing

Each plugin can be tested independently:

```typescript
import { describe, it, expect } from 'vitest'
import { calculateScore, validateFormData } from './scoring'

describe('MyForm Scoring', () => {
  it('calculates correct score', () => {
    const data = { myform: { q1: 1, q2: 2, q3: 3 } }
    const scoring = calculateScore(data)
    expect(scoring.total?.rawScore).toBe(6)
  })
  
  it('validates data correctly', () => {
    const validData = { myform: { q1: 1, q2: 2 } }
    expect(validateFormData(validData)).toBe(true)
    
    const invalidData = { myform: { q1: 99 } } // out of range
    expect(validateFormData(invalidData)).toBe(false)
  })
})
```

## Performance

- **Eager loading**: All plugins loaded at build time
- **Tree-shaking**: Unused plugins are removed in production builds
- **No runtime compilation**: Components are pre-compiled
- **Minimal bundle size**: No JsonForms overhead

## Troubleshooting

### Plugin not found

Check that:
1. Plugin directory is in `src/forms/plugins/`
2. `index.ts` exports default plugin object
3. Plugin ID matches backend templateId

### Translations not working

Check that:
1. Translation keys match what's used in `t()` calls
2. Supported locales are declared in metadata
3. Fallback to English is working

### Scoring doesn't update

Check that:
1. `updateQuestion` is called when values change
2. emit is passed to `useForm`
3. Parent component listens to `@score-change`

## Example: MOXFQ

See `src/forms/plugins/moxfq/` for a complete, real-world example of:
- Complex table layout
- Multiple question scales
- Subscale scoring
- Responsive design
- Full EN/DE translations
