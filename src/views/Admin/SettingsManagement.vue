<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useNotifierStore } from '@/stores/';
import { useI18n } from 'vue-i18n';
import { settingsApi } from '@/api';
import type { 
  GetSettings200ResponseResponseObject,
  GetSettings200ResponseResponseObjectSettingsValueFieldsValue 
} from '@/api';

type SettingField = GetSettings200ResponseResponseObjectSettingsValueFieldsValue;

const notifierStore = useNotifierStore();
const { t, locale } = useI18n();
const loading = ref(false);
const saving = ref(false);
const settings = ref<GetSettings200ResponseResponseObject | null>(null);
const editedValues = ref<Record<string, Record<string, string | number | boolean>>>({});
const expandedPanels = ref<string[]>([]);

// Load settings from backend
const loadSettings = async () => {
  loading.value = true;
  try {
    const response = await settingsApi.getSettings();
    if (response.success && response.responseObject) {
      settings.value = response.responseObject;
      // Initialize edited values
      editedValues.value = {};
      for (const [categoryKey, category] of Object.entries(settings.value.settings)) {
        editedValues.value[categoryKey] = {};
        for (const [fieldKey, field] of Object.entries(category.fields)) {
          editedValues.value[categoryKey][fieldKey] = field.value;
        }
      }
      // Expand all panels by default
      expandedPanels.value = Object.keys(settings.value.settings);
    }
  } catch (error) {
    notifierStore.notify(t('settings.loadError'), 'error');
    console.error('Error loading settings:', error);
  } finally {
    loading.value = false;
  }
};

// Save settings to backend
const saveSettings = async () => {
  saving.value = true;
  try {
    const response = await settingsApi.updateSettings({
      requestBody: editedValues.value
    });
    if (response.success) {
      notifierStore.notify(t('settings.saveSuccess'), 'success');
      await loadSettings(); // Reload to get masked sensitive values
    } else {
      notifierStore.notify(t('settings.saveError'), 'error');
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : t('settings.saveError');
    notifierStore.notify(errorMessage, 'error');
    console.error('Error saving settings:', error);
  } finally {
    saving.value = false;
  }
};

// Reset to original values
const resetChanges = () => {
  if (settings.value) {
    editedValues.value = {};
    for (const [categoryKey, category] of Object.entries(settings.value.settings)) {
      editedValues.value[categoryKey] = {};
      for (const [fieldKey, field] of Object.entries(category.fields)) {
        editedValues.value[categoryKey][fieldKey] = field.value;
      }
    }
    notifierStore.notify(t('settings.resetSuccess'), 'info');
  }
};

// Check if there are unsaved changes
const hasChanges = computed(() => {
  if (!settings.value) return false;
  
  for (const [categoryKey, category] of Object.entries(settings.value.settings)) {
    for (const [fieldKey, field] of Object.entries(category.fields)) {
      if (editedValues.value[categoryKey]?.[fieldKey] !== field.value) {
        return true;
      }
    }
  }
  return false;
});

// Get localized text
const getLocalizedText = (translation: { en: string; de: string }): string => {
  return locale.value === 'de' ? translation.de : translation.en;
};

// Get category title
const getCategoryTitle = (categoryKey: string): string => {
  const titles: Record<string, { en: string; de: string }> = {
    smtp: { en: 'Email Configuration (SMTP)', de: 'E-Mail-Konfiguration (SMTP)' },
    backup: { en: 'Backup Configuration', de: 'Backup-Konfiguration' },
  };
  return getLocalizedText(titles[categoryKey] || { en: categoryKey, de: categoryKey });
};

// Get sorted categories by priority
const sortedCategories = computed(() => {
  if (!settings.value) return [];
  return Object.entries(settings.value.settings)
    .sort(([, a], [, b]) => a.priority - b.priority)
    .map(([key, value]) => ({ key, ...value }));
});

// Validate field
const validateField = (field: SettingField, value: string | number | boolean): string | null => {
  if (field.required && (value === '' || value === null || value === undefined)) {
    return getLocalizedText({ 
      en: 'This field is required', 
      de: 'Dieses Feld ist erforderlich' 
    });
  }

  if (field.type === 'string' && typeof value === 'string') {
    if (field.validation?.minLength && value.length < field.validation.minLength) {
      return getLocalizedText({
        en: `Minimum length is ${field.validation.minLength} characters`,
        de: `Mindestlänge ist ${field.validation.minLength} Zeichen`
      });
    }
    if (field.validation?.maxLength && value.length > field.validation.maxLength) {
      return getLocalizedText({
        en: `Maximum length is ${field.validation.maxLength} characters`,
        de: `Maximallänge ist ${field.validation.maxLength} Zeichen`
      });
    }
    if (field.validation?.pattern && value) {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(value)) {
        return getLocalizedText({
          en: 'Invalid format',
          de: 'Ungültiges Format'
        });
      }
    }
  }

  if (field.type === 'number' && typeof value === 'number') {
    if (field.validation?.min !== undefined && value < field.validation.min) {
      return getLocalizedText({
        en: `Minimum value is ${field.validation.min}`,
        de: `Mindestwert ist ${field.validation.min}`
      });
    }
    if (field.validation?.max !== undefined && value > field.validation.max) {
      return getLocalizedText({
        en: `Maximum value is ${field.validation.max}`,
        de: `Maximalwert ist ${field.validation.max}`
      });
    }
  }

  return null;
};

// Get field rules for validation
const getFieldRules = (field: SettingField) => {
  return [(v: string | number | boolean) => {
    const error = validateField(field, v);
    return error === null || error;
  }];
};

onMounted(() => {
  loadSettings();
});
</script>

<template>
  <v-container fluid>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-cog</v-icon>
        {{ t('settings.title') }}
        <v-spacer></v-spacer>
        <v-btn
          v-if="hasChanges"
          color="warning"
          variant="text"
          @click="resetChanges"
          :disabled="saving"
          class="mr-2"
        >
          <v-icon left>mdi-undo</v-icon>
          {{ t('settings.reset') }}
        </v-btn>
        <v-btn
          color="primary"
          @click="saveSettings"
          :disabled="!hasChanges || saving"
          :loading="saving"
        >
          <v-icon left>mdi-content-save</v-icon>
          {{ t('settings.save') }}
        </v-btn>
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text>
        <v-alert v-if="hasChanges" type="info" variant="tonal" class="mb-4">
          {{ t('settings.unsavedChanges') }}
        </v-alert>

        <v-progress-linear v-if="loading" indeterminate color="primary"></v-progress-linear>

        <v-expansion-panels v-if="settings" v-model="expandedPanels" multiple>
          <v-expansion-panel
            v-for="category in sortedCategories"
            :key="category.key"
            :value="category.key"
          >
            <v-expansion-panel-title>
              <div class="d-flex align-center">
                <v-icon class="mr-2">
                  {{ category.category === 'email' ? 'mdi-email' : 'mdi-database' }}
                </v-icon>
                <strong>{{ getCategoryTitle(category.key) }}</strong>
              </div>
            </v-expansion-panel-title>

            <v-expansion-panel-text>
              <v-row>
                <v-col
                  v-for="(field, fieldKey) in category.fields"
                  :key="fieldKey"
                  cols="12"
                  md="6"
                >
                  <v-text-field
                    v-if="field.type === 'string'"
                    v-model="editedValues[category.key][fieldKey]"
                    :label="getLocalizedText(field.description)"
                    :hint="getLocalizedText(field.helpText)"
                    :type="field.sensitive ? 'password' : 'text'"
                    :rules="getFieldRules(field)"
                    :required="field.required"
                    persistent-hint
                    variant="outlined"
                    density="comfortable"
                  >
                    <template v-if="field.sensitive" v-slot:append-inner>
                      <v-icon size="small" color="warning">mdi-lock</v-icon>
                    </template>
                  </v-text-field>

                  <v-text-field
                    v-else-if="field.type === 'number'"
                    v-model.number="editedValues[category.key][fieldKey]"
                    :label="getLocalizedText(field.description)"
                    :hint="getLocalizedText(field.helpText)"
                    type="number"
                    :rules="getFieldRules(field)"
                    :required="field.required"
                    persistent-hint
                    variant="outlined"
                    density="comfortable"
                  ></v-text-field>

                  <v-checkbox
                    v-else-if="field.type === 'boolean'"
                    v-model="editedValues[category.key][fieldKey]"
                    :label="getLocalizedText(field.description)"
                    :hint="getLocalizedText(field.helpText)"
                    persistent-hint
                    density="comfortable"
                  ></v-checkbox>
                </v-col>
              </v-row>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <v-alert v-if="!loading && !settings" type="error" class="mt-4">
          {{ t('settings.noData') }}
        </v-alert>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<style scoped>
.v-expansion-panel-title {
  font-weight: 500;
}
</style>
