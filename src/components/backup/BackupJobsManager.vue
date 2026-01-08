<script setup lang="ts">
import { ref, computed } from 'vue';
import { useNotifierStore } from '@/stores/';
import { backupApi } from '@/api';
import { useI18n } from 'vue-i18n';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import 'dayjs/locale/en';
import 'dayjs/locale/de';
import type { GetAllBackupJobs200ResponseResponseObjectInner } from '@/api/models/GetAllBackupJobs200ResponseResponseObjectInner';
import type { GetAllCredentials200ResponseResponseObjectInner } from '@/api/models/GetAllCredentials200ResponseResponseObjectInner';
import type { CollectionMetadata } from '@/api/models/CollectionMetadata';
import type { CreateBackupJobRequest } from '@/api/models/CreateBackupJobRequest';
import type { UpdateBackupJobRequest } from '@/api/models/UpdateBackupJobRequest';

dayjs.extend(localizedFormat);

interface Props {
  credentials: GetAllCredentials200ResponseResponseObjectInner[];
  collections: CollectionMetadata[];
}

const props = defineProps<Props>();

const notifierStore = useNotifierStore();
const { t } = useI18n();
const loading = ref(false);

// Set dayjs locale based on i18n locale
const locale = computed(() => {
  const i18nLocale = t('locale');
  return i18nLocale.startsWith('de') ? 'de' : 'en';
});

const backupJobs = ref<GetAllBackupJobs200ResponseResponseObjectInner[]>([]);
const showJobDialog = ref(false);
const editingJob = ref<GetAllBackupJobs200ResponseResponseObjectInner | null>(null);

const jobHeaders = [
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Schedule', key: 'frequency', sortable: true },
  { title: 'Storage', key: 'storageType', sortable: true },
  { title: 'Enabled', key: 'enabled', sortable: true },
  { title: 'Last Run', key: 'lastRunAt', sortable: true },
  { title: 'Status', key: 'lastRunStatus', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false },
];

const frequencyOptions = [
  { title: 'Daily', value: 'daily' },
  { title: 'Weekly (Sunday)', value: 'weekly' },
  { title: 'Monthly (1st day)', value: 'monthly' },
  { title: 'Custom (Cron Expression)', value: 'custom' },
];

const storageTypeOptions = [
  { title: 'Local Storage', value: 'local' },
  { title: 'Amazon S3', value: 's3' },
  { title: 'SFTP Server', value: 'sftp' },
  { title: 'WebDAV', value: 'webdav' },
];

interface JobForm {
  name: string;
  description: string;
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  scheduleTime: string;
  cronExpression: string;
  storageType: 'local' | 's3' | 'sftp' | 'webdav';
  credentialId: string | null;
  encryptionEnabled: boolean;
  encryptionPassword: string;
  encryptionPasswordConfirm: string;
  collections: string[];
  retentionDays: number;
}

const newJob = ref<JobForm>({
  name: '',
  description: '',
  enabled: true,
  frequency: 'daily',
  scheduleTime: '02:00',
  cronExpression: '',
  storageType: 'local',
  credentialId: null,
  encryptionEnabled: false,
  encryptionPassword: '',
  encryptionPasswordConfirm: '',
  collections: [],
  retentionDays: 30,
});

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Never';
  return dayjs(dateString).locale(locale.value).format('L LTS');
};

const formatSchedule = (frequency: string, cronExpression?: string | null): string => {
  if (frequency === 'custom' && cronExpression) {
    return `Custom: ${cronExpression}`;
  }
  
  // Extract time from cron expression
  let timeStr = '';
  if (cronExpression) {
    const parts = cronExpression.split(' ');
    if (parts.length >= 2) {
      const minute = parts[0] || '0';
      const hour = parts[1] || '2';
      timeStr = ` at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    }
  }
  
  if (frequency === 'daily') {
    return `Daily${timeStr}`;
  } else if (frequency === 'weekly') {
    return `Weekly (Sunday)${timeStr}`;
  } else if (frequency === 'monthly') {
    return `Monthly (1st)${timeStr}`;
  }
  
  return frequency;
};

const passwordsMatch = computed(() => {
  if (!newJob.value.encryptionEnabled) return true;
  return newJob.value.encryptionPassword === newJob.value.encryptionPasswordConfirm 
    && newJob.value.encryptionPassword.length > 0;
});

const availableCredentials = computed(() => {
  return props.credentials.filter(c => c.storageType === newJob.value.storageType);
});

const loadBackupJobs = async () => {
  loading.value = true;
  try {
    const response = await backupApi.getAllBackupJobs();
    if (response.success && response.responseObject) {
      backupJobs.value = response.responseObject;
    }
  } catch (error) {
    notifierStore.notify('Failed to load backup jobs', 'error');
    console.error('Error loading backup jobs:', error);
  } finally {
    loading.value = false;
  }
};

const openNewJobDialog = () => {
  editingJob.value = null;
  newJob.value = {
    name: '',
    description: '',
    enabled: true,
    frequency: 'daily',
    scheduleTime: '02:00',
    cronExpression: '',
    storageType: 'local',
    credentialId: null,
    encryptionEnabled: false,
    encryptionPassword: '',
    encryptionPasswordConfirm: '',
    collections: [],
    retentionDays: 30,
  };
  showJobDialog.value = true;
};

const editJob = (job: GetAllBackupJobs200ResponseResponseObjectInner) => {
  editingJob.value = job;
  
  // Extract time from cron expression if available
  let scheduleTime = '02:00';
  if (job.cronExpression) {
    const parts = job.cronExpression.split(' ');
    if (parts.length >= 2) {
      const minute = parts[0] || '0';
      const hour = parts[1] || '2';
      scheduleTime = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    }
  }
  
  newJob.value = {
    name: job.name,
    description: job.description || '',
    enabled: job.enabled ?? true,
    frequency: (job.frequency || 'daily') as JobForm['frequency'],
    scheduleTime,
    cronExpression: job.cronExpression || '',
    storageType: (job.storageType || 'local') as JobForm['storageType'],
    credentialId: job.credentialId || null,
    encryptionEnabled: job.encryptionEnabled ?? false,
    encryptionPassword: '',
    encryptionPasswordConfirm: '',
    collections: job.collections || [],
    retentionDays: job.retentionDays ?? 30,
  };
  showJobDialog.value = true;
};

const saveJob = async () => {
  if (newJob.value.encryptionEnabled && !passwordsMatch.value) {
    notifierStore.notify('Encryption passwords do not match', 'error');
    return;
  }

  loading.value = true;
  try {
    const payload: Partial<CreateBackupJobRequest> = {
      name: newJob.value.name,
      description: newJob.value.description,
      enabled: newJob.value.enabled,
      frequency: newJob.value.frequency as CreateBackupJobRequest['frequency'],
      storageType: newJob.value.storageType as CreateBackupJobRequest['storageType'],
      encryptionEnabled: newJob.value.encryptionEnabled,
      collections: newJob.value.collections,
      retentionDays: parseInt(newJob.value.retentionDays as unknown as string, 10),
    };

    // Generate cron expression based on frequency and time
    if (newJob.value.frequency === 'custom') {
      payload.cronExpression = newJob.value.cronExpression;
    } else {
      const [hour, minute] = newJob.value.scheduleTime.split(':');
      if (newJob.value.frequency === 'daily') {
        payload.cronExpression = `${minute} ${hour} * * *`;
      } else if (newJob.value.frequency === 'weekly') {
        payload.cronExpression = `${minute} ${hour} * * 0`;
      } else if (newJob.value.frequency === 'monthly') {
        payload.cronExpression = `${minute} ${hour} 1 * *`;
      }
    }

    if (newJob.value.storageType !== 'local') {
      payload.credentialId = newJob.value.credentialId;
    }

    if (newJob.value.encryptionEnabled && newJob.value.encryptionPassword) {
      payload.encryptionPasswordHash = newJob.value.encryptionPassword;
    }

    if (editingJob.value) {
      await backupApi.updateBackupJob({
        id: editingJob.value.id!,
        updateBackupJobRequest: payload as UpdateBackupJobRequest,
      });
      notifierStore.notify('Backup job updated successfully', 'success');
    } else {
      await backupApi.createBackupJob({
        createBackupJobRequest: payload as CreateBackupJobRequest,
      });
      notifierStore.notify('Backup job created successfully', 'success');
    }

    showJobDialog.value = false;
    await loadBackupJobs();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save backup job';
    notifierStore.notify(message, 'error');
    console.error('Error saving backup job:', error);
  } finally {
    loading.value = false;
  }
};

const deleteJob = async (job: GetAllBackupJobs200ResponseResponseObjectInner) => {
  if (!confirm(`Are you sure you want to delete the backup job "${job.name}"?`)) {
    return;
  }

  loading.value = true;
  try {
    await backupApi.deleteBackupJob({ id: job.id! });
    notifierStore.notify('Backup job deleted successfully', 'success');
    await loadBackupJobs();
  } catch (error) {
    notifierStore.notify('Failed to delete backup job', 'error');
    console.error('Error deleting backup job:', error);
  } finally {
    loading.value = false;
  }
};

const toggleJobEnabled = async (job: GetAllBackupJobs200ResponseResponseObjectInner) => {
  loading.value = true;
  try {
    await backupApi.updateBackupJob({
      id: job.id!,
      updateBackupJobRequest: { enabled: !job.enabled },
    });
    notifierStore.notify(`Backup job ${!job.enabled ? 'enabled' : 'disabled'}`, 'success');
    await loadBackupJobs();
  } catch (error) {
    notifierStore.notify('Failed to update backup job', 'error');
    console.error('Error updating backup job:', error);
  } finally {
    loading.value = false;
  }
};

const triggerJob = async (job: GetAllBackupJobs200ResponseResponseObjectInner) => {
  loading.value = true;
  try {
    await backupApi.triggerBackupJob({ id: job.id! });
    notifierStore.notify('Backup job triggered successfully', 'success');
    setTimeout(() => loadBackupJobs(), 2000);
  } catch (error) {
    notifierStore.notify('Failed to trigger backup job', 'error');
    console.error('Error triggering backup job:', error);
  } finally {
    loading.value = false;
  }
};

// Load jobs on mount
loadBackupJobs();

// Expose refresh method
defineExpose({
  refresh: loadBackupJobs
});
</script>

<template>
  <v-card>
    <v-card-title>
      <span>Backup Jobs</span>
      <v-spacer />
      <v-btn color="primary" @click="openNewJobDialog">
        <v-icon left>mdi-plus</v-icon>
        New Backup Job
      </v-btn>
    </v-card-title>
    <v-card-text>
      <v-data-table
        :headers="jobHeaders"
        :items="backupJobs"
        :loading="loading"
        class="elevation-1"
      >
        <template v-slot:[`item.frequency`]="{ item }">
          {{ formatSchedule(item.frequency, item.cronExpression) }}
        </template>
        <template v-slot:[`item.enabled`]="{ item }">
          <v-switch
            :model-value="item.enabled"
            color="success"
            hide-details
            density="compact"
            @click="toggleJobEnabled(item)"
          />
        </template>
        <template v-slot:[`item.lastRunAt`]="{ item }">
          {{ formatDate(item.lastRunAt) }}
        </template>
        <template v-slot:[`item.lastRunStatus`]="{ item }">
          <v-chip
            v-if="item.lastRunStatus"
            :color="item.lastRunStatus === 'success' ? 'success' : item.lastRunStatus === 'failed' ? 'error' : 'info'"
            size="small"
          >
            {{ item.lastRunStatus }}
          </v-chip>
          <span v-else class="text-caption">Not run yet</span>
        </template>
        <template v-slot:[`item.actions`]="{ item }">
          <v-btn
            icon="mdi-play"
            size="small"
            variant="text"
            color="success"
            @click="triggerJob(item)"
            title="Run now"
          />
          <v-btn
            icon="mdi-pencil"
            size="small"
            variant="text"
            @click="editJob(item)"
            title="Edit"
          />
          <v-btn
            icon="mdi-delete"
            size="small"
            variant="text"
            color="error"
            @click="deleteJob(item)"
            title="Delete"
          />
        </template>
      </v-data-table>
    </v-card-text>

    <!-- Job Dialog -->
    <v-dialog v-model="showJobDialog" max-width="800px" persistent>
      <v-card>
        <v-card-title>
          <span class="text-h5">{{ editingJob ? 'Edit' : 'Create' }} Backup Job</span>
        </v-card-title>
        <v-card-text>
          <v-form>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="newJob.name"
                  label="Job Name"
                  required
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="newJob.retentionDays"
                  label="Retention (days)"
                  type="number"
                  hint="How long to keep backups"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12">
                <v-textarea
                  v-model="newJob.description"
                  label="Description"
                  rows="2"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="newJob.frequency"
                  :items="frequencyOptions"
                  label="Schedule Frequency"
                />
                <input
                  v-if="newJob.frequency !== 'custom'"
                  v-model="newJob.scheduleTime"
                  type="time"
                  class="time-input mt-2"
                  step="60"
                />
                <div v-if="newJob.frequency !== 'custom'" class="text-caption text-medium-emphasis mt-1">
                  Time in 24-hour format (HH:MM)
                </div>
                <v-text-field
                  v-if="newJob.frequency === 'custom'"
                  v-model="newJob.cronExpression"
                  label="Cron Expression"
                  placeholder="0 2 * * *"
                  hint="Unix cron format"
                  class="mt-2"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="newJob.storageType"
                  :items="storageTypeOptions"
                  label="Storage Type"
                />
                <v-select
                  v-if="newJob.storageType !== 'local'"
                  v-model="newJob.credentialId"
                  :items="availableCredentials"
                  item-title="name"
                  item-value="_id"
                  label="Select Credentials"
                  class="mt-2"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12">
                <v-select
                  v-model="newJob.collections"
                  :items="collections"
                  item-title="name"
                  item-value="name"
                  label="Collections to Backup"
                  multiple
                  chips
                  closable-chips
                  hint="Leave empty to backup all collections"
                  persistent-hint
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12">
                <v-checkbox
                  v-model="newJob.encryptionEnabled"
                  label="Enable backup encryption"
                  hint="Encrypt backups with a password"
                />
                <v-text-field
                  v-if="newJob.encryptionEnabled"
                  v-model="newJob.encryptionPassword"
                  label="Encryption Password"
                  type="password"
                  class="mt-2"
                  hint="Leave empty to keep existing password (if editing)"
                  persistent-hint
                />
                <v-text-field
                  v-if="newJob.encryptionEnabled"
                  v-model="newJob.encryptionPasswordConfirm"
                  label="Confirm Encryption Password"
                  type="password"
                  class="mt-2"
                  :error="!passwordsMatch"
                  :hint="!passwordsMatch ? 'Passwords do not match' : 'Re-enter password to confirm'"
                  persistent-hint
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="showJobDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="loading"
            :disabled="newJob.encryptionEnabled && !passwordsMatch"
            @click="saveJob"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<style scoped>
.v-data-table {
  font-size: 0.875rem;
}

.time-input {
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  font-size: 16px;
  font-family: inherit;
  background-color: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}

.time-input:focus {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -1px;
}

.time-input::-webkit-calendar-picker-indicator {
  filter: invert(var(--v-theme-dark));
}
</style>
