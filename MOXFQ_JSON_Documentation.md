# MANCHESTER-OXFORD FOOT QUESTIONNAIRE (MOXFQ) - JSON Form Data

This document provides the complete JSON structure for the MOXFQ form as implemented in the test page.

## Form Overview

The MOXFQ is a 16-question form designed to assess foot/ankle-related quality of life and pain levels. The form uses different scoring scales:

- **Questions 1-14**: 5-point Likert scale (0-4)
  - 0 = "None of the time"
  - 1 = "Rarely"
  - 2 = "Some of the time"
  - 3 = "Most of the time"
  - 4 = "All of the time"

- **Question 15**: Pain severity scale (0-4)
  - 0 = "None"
  - 1 = "Very mild"
  - 2 = "Mild"
  - 3 = "Moderate"
  - 4 = "Severe"

- **Question 16**: Night pain frequency (0-4)
  - 0 = "No nights"
  - 1 = "Only 1 or 2 nights"
  - 2 = "Some nights"
  - 3 = "Most nights"
  - 4 = "Every night"

## Complete JSON Schema

```json
{
  "type": "object",
  "properties": {
    "moxfq": {
      "type": "object",
      "title": "MANCHESTER-OXFORD FOOT QUESTIONNAIRE (MOXFQ)",
      "properties": {
        "q1": {
          "type": "integer",
          "title": "I have pain in my foot/ankle",
          "enum": [0, 1, 2, 3, 4],
          "enumNames": [
            "None of the time",
            "Rarely",
            "Some of the time",
            "Most of the time",
            "All of the time"
          ]
        },
        "q2": {
          "type": "integer",
          "title": "I avoid walking long distances because of pain in my foot/ankle",
          "enum": [0, 1, 2, 3, 4],
          "enumNames": [
            "None of the time",
            "Rarely",
            "Some of the time",
            "Most of the time",
            "All of the time"
          ]
        },
        "q3": {
          "type": "integer",
          "title": "I change the way I walk due to pain in my foot/ankle",
          "enum": [0, 1, 2, 3, 4],
          "enumNames": [
            "None of the time",
            "Rarely",
            "Some of the time",
            "Most of the time",
            "All of the time"
          ]
        },
        "q4": {
          "type": "integer",
          "title": "I walk slowly because of pain in my foot/ankle",
          "enum": [0, 1, 2, 3, 4],
          "enumNames": [
            "None of the time",
            "Rarely",
            "Some of the time",
            "Most of the time",
            "All of the time"
          ]
        },
        "q5": {
          "type": "integer",
          "title": "I have to stop and rest my foot/ankle because of pain",
          "enum": [0, 1, 2, 3, 4],
          "enumNames": [
            "None of the time",
            "Rarely",
            "Some of the time",
            "Most of the time",
            "All of the time"
          ]
        },
        "q6": {
          "type": "integer",
          "title": "I avoid some hard or rough surfaces because of pain in my foot/ankle",
          "enum": [0, 1, 2, 3, 4],
          "enumNames": [
            "None of the time",
            "Rarely",
            "Some of the time",
            "Most of the time",
            "All of the time"
          ]
        },
        "q7": {
          "type": "integer",
          "title": "I avoid standing for a long time because of pain in my foot/ankle",
          "enum": [0, 1, 2, 3, 4],
          "enumNames": [
            "None of the time",
            "Rarely",
            "Some of the time",
            "Most of the time",
            "All of the time"
          ]
        },
        "q8": {
          "type": "integer",
          "title": "I catch the bus or use the car instead of walking, because of pain in my foot/ankle",
          "enum": [0, 1, 2, 3, 4],
          "enumNames": [
            "None of the time",
            "Rarely",
            "Some of the time",
            "Most of the time",
            "All of the time"
          ]
        },
        "q9": {
          "type": "integer",
          "title": "I feel self-conscious about my foot/ankle",
          "enum": [0, 1, 2, 3, 4],
          "enumNames": [
            "None of the time",
            "Rarely",
            "Some of the time",
            "Most of the time",
            "All of the time"
          ]
        },
        "q10": {
          "type": "integer",
          "title": "I feel self-conscious about the shoes I have to wear",
          "enum": [0, 1, 2, 3, 4],
          "enumNames": [
            "None of the time",
            "Rarely",
            "Some of the time",
            "Most of the time",
            "All of the time"
          ]
        },
        "q11": {
          "type": "integer",
          "title": "The pain in my foot/ankle is more painful in the evening",
          "enum": [0, 1, 2, 3, 4],
          "enumNames": [
            "None of the time",
            "Rarely",
            "Some of the time",
            "Most of the time",
            "All of the time"
          ]
        },
        "q12": {
          "type": "integer",
          "title": "I get shooting pains in my foot/ankle",
          "enum": [0, 1, 2, 3, 4],
          "enumNames": [
            "None of the time",
            "Rarely",
            "Some of the time",
            "Most of the time",
            "All of the time"
          ]
        },
        "q13": {
          "type": "integer",
          "title": "The pain in my foot/ankle prevents me from carrying out my work/everyday activities",
          "enum": [0, 1, 2, 3, 4],
          "enumNames": [
            "None of the time",
            "Rarely",
            "Some of the time",
            "Most of the time",
            "All of the time"
          ]
        },
        "q14": {
          "type": "integer",
          "title": "I am unable to do all my social or recreational activities because of pain in my foot/ankle",
          "enum": [0, 1, 2, 3, 4],
          "enumNames": [
            "None of the time",
            "Rarely",
            "Some of the time",
            "Most of the time",
            "All of the time"
          ]
        },
        "q15": {
          "type": "integer",
          "title": "During the past 4 weeks how would you describe the pain you usually have in your foot/ankle? (please tick one box)",
          "enum": [0, 1, 2, 3, 4],
          "enumNames": [
            "None",
            "Very mild",
            "Mild",
            "Moderate",
            "Severe"
          ]
        },
        "q16": {
          "type": "integer",
          "title": "During the past 4 weeks have you been troubled by pain from your foot/ankle in bed at night? (please tick one box)",
          "enum": [0, 1, 2, 3, 4],
          "enumNames": [
            "No nights",
            "Only 1 or 2 nights",
            "Some nights",
            "Most nights",
            "Every night"
          ]
        }
      },
      "required": [
        "q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", 
        "q9", "q10", "q11", "q12", "q13", "q14", "q15", "q16"
      ]
    }
  },
  "required": ["moxfq"]
}
```

## UI Schema

```json
{
  "type": "VerticalLayout",
  "elements": [
    {
      "type": "Group",
      "label": "MANCHESTER-OXFORD FOOT QUESTIONNAIRE (MOXFQ)",
      "elements": [
        { "type": "Control", "scope": "#/properties/moxfq/properties/q1", "options": { "format": "radio" } },
        { "type": "Control", "scope": "#/properties/moxfq/properties/q2", "options": { "format": "radio" } },
        { "type": "Control", "scope": "#/properties/moxfq/properties/q3", "options": { "format": "radio" } },
        { "type": "Control", "scope": "#/properties/moxfq/properties/q4", "options": { "format": "radio" } },
        { "type": "Control", "scope": "#/properties/moxfq/properties/q5", "options": { "format": "radio" } },
        { "type": "Control", "scope": "#/properties/moxfq/properties/q6", "options": { "format": "radio" } },
        { "type": "Control", "scope": "#/properties/moxfq/properties/q7", "options": { "format": "radio" } },
        { "type": "Control", "scope": "#/properties/moxfq/properties/q8", "options": { "format": "radio" } },
        { "type": "Control", "scope": "#/properties/moxfq/properties/q9", "options": { "format": "radio" } },
        { "type": "Control", "scope": "#/properties/moxfq/properties/q10", "options": { "format": "radio" } },
        { "type": "Control", "scope": "#/properties/moxfq/properties/q11", "options": { "format": "radio" } },
        { "type": "Control", "scope": "#/properties/moxfq/properties/q12", "options": { "format": "radio" } },
        { "type": "Control", "scope": "#/properties/moxfq/properties/q13", "options": { "format": "radio" } },
        { "type": "Control", "scope": "#/properties/moxfq/properties/q14", "options": { "format": "radio" } },
        { "type": "Control", "scope": "#/properties/moxfq/properties/q15", "options": { "format": "radio" } },
        { "type": "Control", "scope": "#/properties/moxfq/properties/q16", "options": { "format": "radio" } }
      ]
    }
  ]
}
```

## Sample Form Data Structure

```json
{
  "moxfq": {
    "q1": 2,
    "q2": 1,
    "q3": 0,
    "q4": 1,
    "q5": 2,
    "q6": 1,
    "q7": 3,
    "q8": 0,
    "q9": 1,
    "q10": 2,
    "q11": 2,
    "q12": 1,
    "q13": 2,
    "q14": 1,
    "q15": 2,
    "q16": 1
  }
}
```

## Scoring Information

### Domain Scores

The MOXFQ consists of three domains:

1. **Walking/Standing Domain** (Questions 1, 2, 3, 4, 5, 6, 7, 8)
2. **Pain Domain** (Questions 11, 12, 15, 16)  
3. **Social Interaction Domain** (Questions 9, 10, 13, 14)

### Calculation

- Each domain score is calculated by summing the individual question scores
- Scores are then converted to a 0-100 scale where:
  - 0 = no foot problems
  - 100 = worst possible foot problems
- Formula: (Sum of responses / Maximum possible sum) × 100

### Example Calculation for Walking/Standing Domain:
- Questions 1-8: If responses are [2,1,0,1,2,1,3,0]
- Sum = 10
- Maximum possible = 8 × 4 = 32
- Score = (10/32) × 100 = 31.25

## Implementation Notes

1. **All questions are required** - the form validates that every question has been answered
2. **Radio button format** - ensures single selection per question
3. **Internationalization support** - both English and German translations are provided
4. **Real-time validation** - form data is validated as user makes selections
5. **JSON export functionality** - allows copying the complete JSON structure for backend integration

## Usage

The test page is available at `/moxfq-test` and can be accessed through:
1. Direct navigation to the route
2. Link in the Testing view at `/testing`
3. The "MOXFQ Test Form" button in the Frontend Quick Links section

The page allows you to:
- Fill out the complete MOXFQ form
- Generate and view the JSON data structure
- Copy the schema, UI schema, and form data to clipboard
- Test the form behavior and validation
