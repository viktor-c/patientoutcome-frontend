# MOXFQ Scoring Implementation

## Overview
The MOXFQ (Manchester-Oxford Foot Questionnaire) component now includes comprehensive scoring and interpretation functionality built directly into the frontend component.

## Scoring System

### Subscales
The MOXFQ questionnaire is divided into three validated subscales:

1. **Walking/Standing** (Questions 1-8)
   - 8 questions about mobility and weight-bearing activities
   - Maximum raw score: 32 points

2. **Pain** (Questions 9, 11, 12, 15)
   - 4 questions about pain experience and severity
   - Maximum raw score: 16 points

3. **Social Interaction** (Questions 10, 13, 14, 16)
   - 4 questions about social and recreational activities
   - Maximum raw score: 16 points

### Scoring Calculation

#### Raw Scores
- Each question is scored 0-4 points
- Subscale raw score = sum of answered questions in that subscale
- Total raw score = sum of all 16 questions (0-64 points)

#### Normalized Scores (0-100 scale)
- Normalized score = (Raw Score / Maximum Possible Score) × 100
- Allows for comparison across subscales and with clinical literature
- Higher scores indicate greater impairment/worse outcomes

### Interpretation Guidelines

The component provides automatic interpretation based on normalized scores:

- **0-25**: Mild Impact (Green)
- **26-50**: Moderate Impact (Yellow/Warning)
- **51-75**: Severe Impact (Red/Error)
- **76-100**: Very Severe Impact (Red/Error)

## Component Features

### Real-time Scoring
- Scores update automatically as questions are answered
- Progress tracking shows completion percentage
- Visual indicators for incomplete forms

### Visual Display
- Color-coded score cards for each subscale
- Icons representing each domain (walking, pain, social)
- Progress bars and completion status
- Responsive design for all screen sizes

### Data Export
The component emits scoring data via the `scoring-updated` event:

```typescript
interface SubscaleScore {
  rawScore: number
  normalizedScore: number
  maxPossibleScore: number
  answeredQuestions: number
  totalQuestions: number
  completionRate: number
  isComplete: boolean
}

interface MoxfqScoring {
  subscales: {
    walkingStanding: SubscaleScore | null
    pain: SubscaleScore | null
    socialInteraction: SubscaleScore | null
  }
  total: SubscaleScore | null
  summary: {
    isComplete: boolean
    completionPercentage: number
    answeredQuestions: number
    totalQuestions: number
  }
}
```

## Usage

### Basic Implementation
```vue
<template>
  <MoxfqTableComponent 
    v-model="moxfqData"
    @scoring-updated="handleScoringUpdate" />
</template>

<script setup>
const moxfqData = ref({
  q1: null, q2: null, /* ... q16: null */
})

const handleScoringUpdate = (scoring) => {
  console.log('Total Score:', scoring.total?.normalizedScore)
  console.log('Walking Score:', scoring.subscales.walkingStanding?.normalizedScore)
  console.log('Is Complete:', scoring.summary.isComplete)
}
</script>
```

### Backend Integration
The scoring data can be saved to your backend:

```typescript
// Save complete scoring analysis
const saveMoxfqResults = async (patientId: string, formData: any, scoring: MoxfqScoring) => {
  await api.savePatientMoxfq({
    patientId,
    responses: formData,
    scores: {
      totalScore: scoring.total?.normalizedScore,
      walkingStandingScore: scoring.subscales.walkingStanding?.normalizedScore,
      painScore: scoring.subscales.pain?.normalizedScore,
      socialInteractionScore: scoring.subscales.socialInteraction?.normalizedScore,
      completionDate: new Date(),
      isComplete: scoring.summary.isComplete
    }
  })
}
```

## Clinical Validation

The scoring implementation follows established MOXFQ protocols:

1. **Validated Subscales**: Uses the clinically validated three-factor structure
2. **Standard Scoring**: Implements the 0-100 normalized scoring system
3. **Missing Data Handling**: Calculates scores only when subscales are complete
4. **Interpretation Guidelines**: Based on published clinical research

## Internationalization

All scoring labels and interpretations support multiple languages:
- English: "Mild Impact", "Moderate Impact", etc.
- German: "Geringer Einfluss", "Moderater Einfluss", etc.

## Benefits

1. **Clinical Accuracy**: Standardized scoring reduces interpretation errors
2. **Real-time Feedback**: Immediate scoring provides clinical insights
3. **Data Quality**: Built-in validation ensures complete responses
4. **Workflow Integration**: Seamless integration with existing patient flow
5. **Research Support**: Structured data export supports clinical research

## Future Enhancements

Potential additions could include:
- Longitudinal tracking and change scores
- Normative data comparisons
- Clinical decision support recommendations
- Integration with other foot/ankle outcome measures
