# MOXFQ Table Renderer - Custom Implementation

This document describes the custom table renderer created for the MOXFQ (Manchester-Oxford Foot Questionnaire) form that displays questions in rows and answer options in columns.

## Overview

The custom table renderer provides an alternative view to the standard radio button form layout. Instead of showing each question with radio buttons below it, the table format displays:

- **Column 1**: Question text
- **Columns 2-6**: Answer options as radio buttons (0-4 scale)

## Implementation

### 1. MoxfqTableComponent.vue

A standalone Vue component that renders the MOXFQ form as a table:

**Location**: `/src/components/MoxfqTableComponent.vue`

**Features**:
- Responsive table layout with sticky question column
- Different answer scales for questions 15 and 16 (highlighted in orange)
- Hover effects and visual feedback
- Mobile-responsive design
- Proper TypeScript support

**Props**:
```typescript
interface Props {
  modelValue: MoxfqData // The form data object
}

interface MoxfqData {
  [key: string]: number | null
}
```

**Events**:
```typescript
interface Emits {
  (e: 'update:modelValue', value: MoxfqData): void
}
```

### 2. Integration with MOXFQ Test Page

The component is integrated into the existing test page with a view mode toggle:

**Location**: `/src/views/Misc/MoxfqTestView.vue`

**Features**:
- Toggle between "Standard Form View" and "Table View"
- Synchronized data between both views
- Same JSON generation functionality for both views

## Usage

### Basic Usage

```vue
<script setup lang="ts">
import MoxfqTableComponent from '@/components/MoxfqTableComponent.vue'
import { ref } from 'vue'

const formData = ref({
  q1: null,
  q2: null,
  // ... other questions
  q16: null
})
</script>

<template>
  <MoxfqTableComponent v-model="formData" />
</template>
```

### With Form Validation

```vue
<script setup lang="ts">
import MoxfqTableComponent from '@/components/MoxfqTableComponent.vue'
import { ref, computed } from 'vue'

const formData = ref({
  q1: null, q2: null, q3: null, q4: null,
  q5: null, q6: null, q7: null, q8: null,
  q9: null, q10: null, q11: null, q12: null,
  q13: null, q14: null, q15: null, q16: null
})

const isFormComplete = computed(() => {
  return Object.values(formData.value).every(value => value !== null)
})

const handleSubmit = () => {
  if (isFormComplete.value) {
    // Process form data
    console.log('Form data:', formData.value)
  }
}
</script>

<template>
  <div>
    <MoxfqTableComponent v-model="formData" />
    <v-btn 
      :disabled="!isFormComplete" 
      @click="handleSubmit"
      color="primary"
    >
      Submit Form
    </v-btn>
  </div>
</template>
```

## Table Layout Structure

### Header Row
| Question | (0) None of the time | (1) Rarely | (2) Some of the time | (3) Most of the time | (4) All of the time |
| -------- | -------------------- | ---------- | -------------------- | -------------------- | ------------------- |

### Question Rows (1-14)
Uses the standard 5-point Likert scale:
- 0 = "None of the time"
- 1 = "Rarely" 
- 2 = "Some of the time"
- 3 = "Most of the time"
- 4 = "All of the time"

### Question 15 (Special - Pain Severity)
Uses pain severity scale:
- 0 = "None"
- 1 = "Very mild"
- 2 = "Mild"
- 3 = "Moderate" 
- 4 = "Severe"

### Question 16 (Special - Night Pain)
Uses night pain frequency scale:
- 0 = "No nights"
- 1 = "Only 1 or 2 nights"
- 2 = "Some nights"
- 3 = "Most nights"
- 4 = "Every night"

## Visual Features

### Styling Highlights

1. **Sticky Header**: Column headers remain visible during scroll
2. **Sticky Question Column**: Question text stays visible when scrolling horizontally
3. **Special Question Highlighting**: Questions 15 & 16 have orange background
4. **Hover Effects**: Row highlighting on hover
5. **Responsive Design**: Adapts to different screen sizes
6. **Visual Indicators**: Warning icons (⚠) for special questions

### CSS Classes

```css
.moxfq-table-container     /* Main container */
.moxfq-table              /* Table styling */
.question-column          /* Question text column */
.answer-column            /* Answer option columns */
.question-row             /* Individual question rows */
.answer-cell              /* Individual answer cells */
```

## Responsive Behavior

### Desktop (>1024px)
- Full table layout with all columns visible
- Question column: 300px minimum width
- Answer columns: 100px each

### Tablet (768px-1024px)
- Compressed layout
- Question column: 250px minimum width
- Answer columns: 80px each
- Smaller font sizes

### Mobile (<768px)
- Further compressed layout
- Question column: 200px minimum width
- Answer columns: 60px each
- Smallest font sizes
- Horizontal scroll enabled

## Integration with JsonForms

While this is a standalone component, it can be integrated with JsonForms as a custom renderer:

### Custom Renderer Entry (Optional)

```typescript
// MoxfqTableRenderer.entry.ts
import {
  type JsonFormsRendererRegistryEntry,
  rankWith,
  and,
  isLayout,
  optionIs,
} from '@jsonforms/core';
import MoxfqTableComponent from './MoxfqTableComponent.vue';

export const entry: JsonFormsRendererRegistryEntry = {
  renderer: MoxfqTableComponent,
  tester: rankWith(50, and(isLayout, optionIs('format', 'moxfq-table'))),
};
```

### Usage in JsonForms Schema

```json
{
  "type": "VerticalLayout",
  "elements": [
    {
      "type": "Group",
      "label": "MOXFQ Questions",
      "options": {
        "format": "moxfq-table"
      },
      "elements": [
        // ... control elements for each question
      ]
    }
  ]
}
```

## Accessing the Table View

1. Navigate to the MOXFQ test page: `http://localhost:5174/moxfq-test`
2. Click on the "Table View" chip at the top of the form
3. The form will switch to the table layout
4. All interactions and data remain synchronized between views

## Benefits of Table Layout

1. **Compact Display**: All questions visible at once
2. **Easy Comparison**: Side-by-side answer options
3. **Efficient Input**: Quick selection across questions
4. **Professional Appearance**: Clean, medical form aesthetic
5. **Print-Friendly**: Better layout for printed versions
6. **Accessibility**: Clear column/row structure for screen readers

## Customization Options

The component can be easily customized by modifying:

1. **Color Scheme**: Change CSS variables for different themes
2. **Layout**: Adjust column widths and responsive breakpoints
3. **Question Ordering**: Modify the `questionsData` computed property
4. **Answer Options**: Update the `answerOptions` object
5. **Special Question Handling**: Add more highlighted question types

This table renderer provides a professional, efficient alternative to the standard form layout while maintaining full compatibility with the existing MOXFQ form data structure.
