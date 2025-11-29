# Consultation Blueprint Form Templates Update

## Changes Made

The frontend has been updated to handle consultation blueprints that use `formTemplates` instead of `forms`. The backend now returns blueprint content with form template IDs that will be converted to proper API objects during consultation creation.

## Blueprint Structure Examples

### Single Consultation with Form Templates

```json
{
  "id": "blueprint-123",
  "title": "Post-Op Follow-up",
  "content": {
    "consultation": {
      "timeDelta": "7d",
      "reasonForConsultation": ["followup"],
      "notes": ["Post-operative check"],
      "formTemplates": ["form-template-id-1", "form-template-id-2"]
    }
  }
}
```

### Multiple Consultations with Form Templates

```json
{
  "id": "blueprint-456",
  "title": "Full Recovery Program",
  "content": {
    "consultations": [
      {
        "timeDelta": "1w",
        "reasonForConsultation": ["followup"],
        "formTemplates": ["pain-scale-form", "mobility-assessment"]
      },
      {
        "timeDelta": "4w",
        "reasonForConsultation": ["followup"],
        "formTemplates": ["recovery-questionnaire", "satisfaction-survey"]
      },
      {
        "timeDelta": "12w",
        "reasonForConsultation": ["followup"],
        "formTemplates": ["final-assessment"]
      }
    ]
  }
}
```

### Blueprint-Level Form Templates (Legacy Support)

```json
{
  "id": "blueprint-789",
  "title": "Simple Follow-up",
  "timeDelta": "2w",
  "content": {
    "formTemplates": ["basic-followup-form"]
  }
}
```

## API Changes

### Consultation Creation API

The `CreateConsultation` interface now expects:

```typescript
{
  // ... other fields
  formTemplates: Array<{ id: string }>  // Array of objects with ID
}
```

### Processing

1. **Blueprint Processing**: Form template IDs from blueprints are converted to objects with `id` property
2. **Backward Compatibility**: Existing `proms` field is still supported for displaying consultations
3. **API Conversion**: The frontend converts string IDs to `{ id: string }` objects before sending to the API

## Files Updated

- `src/components/dialogs/ConsultationBlueprintSelectionDialog.vue`
- `src/components/dialogs/CreateBatchConsultationsDialog.vue` 
- `src/components/dialogs/CreateEditConsultationDialog.vue`

All files now properly handle the `formTemplates` field in blueprint content and convert form template IDs to the expected API format during consultation creation.
