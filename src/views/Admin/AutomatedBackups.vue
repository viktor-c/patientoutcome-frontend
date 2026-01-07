<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useNotifierStore } from '@/stores/';
import { backupApi } from '@/api';
import type { CollectionMetadata } from '@/api/models/CollectionMetadata';
import type { GetAllCredentials200ResponseResponseObjectInner } from '@/api/models/GetAllCredentials200ResponseResponseObjectInner';
import type { GetAllBackupJobs200ResponseResponseObjectInner } from '@/api/models/GetAllBackupJobs200ResponseResponseObjectInner';
import type { UpdateBackupJobRequest } from '@/api/models/UpdateBackupJobRequest';
import type { CreateBackupJobRequest } from '@/api/models/CreateBackupJobRequest';
import type { CreateCredentialsRequest } from '@/api/models/CreateCredentialsRequest';

const notifierStore = useNotifierStore();
const loading = ref(false);
const backupJobs = ref<GetAllBackupJobs200ResponseResponseObjectInner[]>([]);
const collections = ref<CollectionMetadata[]>([]);
const credentials = ref<GetAllCredentials200ResponseResponseObjectInner[]>([]);
const showJobDialog = ref(false);
const showCredentialDialog = ref(false);
const editingJob = ref<GetAllBackupJobs200ResponseResponseObjectInner | null>(null);
const editingCredential = ref<GetAllCredentials200ResponseResponseObjectInner | null>(null);

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
  { title: 'Daily (2:00 AM UTC)', value: 'daily' },
  { title: 'Weekly (Sunday 2:00 AM UTC)', value: 'weekly' },
  { title: 'Monthly (1st day 2:00 AM UTC)', value: 'monthly' },
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
  cronExpression: string;
  storageType: 'local' | 's3' | 'sftp' | 'webdav';
  credentialId: string | null;
  encryptionEnabled: boolean;
  encryptionPassword: string;
  collections: string[];
  retentionDays: number;
}

const newJob = ref<JobForm>({
  name: '',
  description: '',
  enabled: true,
  frequency: 'daily',
  cronExpression: '',
  storageType: 'local',
  credentialId: null,
  encryptionEnabled: false,
  encryptionPassword: '',
  collections: [],
  retentionDays: 30,
});

interface CredentialForm {
  name: string;
  storageType: 's3' | 'sftp' | 'webdav';
  credentials: Record<string, string | number>;
}

const newCredential = ref<CredentialForm>({
  name: '',
  storageType: 's3',
  credentials: {},
});

// Storage-specific credential fields
const s3Fields = ['region', 'bucket', 'accessKeyId', 'secretAccessKey', 'prefix'];
const sftpFields = ['host', 'port', 'username', 'password', 'remotePath'];
const webdavFields = ['url', 'username', 'password', 'basePath'];

const credentialFields = computed(() => {
  switch (newCredential.value.storageType) {
    case 's3':
      return s3Fields.map(key => ({ key, label: key.charAt(0).toUpperCase() + key.slice(1), type: key.includes('secret') || key.includes('password') ? 'password' : 'text' }));
    case 'sftp':
      return sftpFields.map(key => ({ key, label: key.charAt(0).toUpperCase() + key.slice(1), type: key === 'password' ? 'password' : key === 'port' ? 'number' : 'text' }));
    case 'webdav':
      return webdavFields.map(key => ({ key, label: key.charAt(0).toUpperCase() + key.slice(1), type: key === 'password' ? 'password' : 'text' }));
    default:
      return [];
  }
});

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleString();
};

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

const loadCollections = async () => {
  try {
    const response = await backupApi.getCollections();
    if (response.success && response.responseObject) {
      collections.value = response.responseObject;
    }
  } catch (error) {
    console.error('Error loading collections:', error);
  }
};

const loadCredentials = async () => {
  try {
    const response = await backupApi.getAllCredentials();
    if (response.success && response.responseObject) {
      credentials.value = response.responseObject;
    }
  } catch (error) {
    console.error('Error loading credentials:', error);
  }
};

const openNewJobDialog = () => {
  editingJob.value = null;
  newJob.value = {
    name: '',
    description: '',
    enabled: true,
    frequency: 'daily',
    cronExpression: '',
    storageType: 'local',
    credentialId: null,
    encryptionEnabled: false,
    encryptionPassword: '',
    collections: [],
    retentionDays: 30,
  };
  showJobDialog.value = true;
};

const editJob = (job: GetAllBackupJobs200ResponseResponseObjectInner) => {
  editingJob.value = job;
  newJob.value = {
    name: job.name,
    description: job.description || '',
    enabled: job.enabled ?? true,
    frequency: (job.frequency || 'daily') as JobForm['frequency'],
    cronExpression: job.cronExpression || '',
    storageType: (job.storageType || 'local') as JobForm['storageType'],
    credentialId: job.credentialId || null,
    encryptionEnabled: job.encryptionEnabled ?? false,
    encryptionPassword: '',
    collections: job.collections || [],
    retentionDays: job.retentionDays ?? 30,
  };
  showJobDialog.value = true;
};

const saveJob = async () => {
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
      retentionDays: newJob.value.retentionDays,
    };

    if (newJob.value.frequency === 'custom') {
      payload.cronExpression = newJob.value.cronExpression;
    }

    if (newJob.value.storageType !== 'local') {
      payload.credentialId = newJob.value.credentialId;
    }

    if (newJob.value.encryptionEnabled && newJob.value.encryptionPassword) {
      // Note: Frontend sends password as encryptionPasswordHash, backend will handle hashing
      payload.encryptionPasswordHash = newJob.value.encryptionPassword;
    }

    if (editingJob.value) {
      // Update existing job
      await backupApi.updateBackupJob({
        id: editingJob.value.id!,
        updateBackupJobRequest: payload as UpdateBackupJobRequest,
      });
      notifierStore.notify('Backup job updated successfully', 'success');
    } else {
      // Create new job
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
    setTimeout(() => loadBackupJobs(), 2000); // Reload after 2 seconds
  } catch (error) {
    notifierStore.notify('Failed to trigger backup job', 'error');
    console.error('Error triggering backup job:', error);
  } finally {
    loading.value = false;
  }
};

// Credentials Management
const openNewCredentialDialog = () => {
  editingCredential.value = null;
  newCredential.value = {
    name: '',
    storageType: 's3',
    credentials: {},
  };
  showCredentialDialog.value = true;
};

const saveCredential = async () => {
  loading.value = true;
  try {
    await backupApi.createCredentials({
      createCredentialsRequest: newCredential.value as CreateCredentialsRequest,
    });
    notifierStore.notify('Credentials saved successfully', 'success');
    showCredentialDialog.value = false;
    await loadCredentials();
  } catch (error) {
    notifierStore.notify('Failed to save credentials', 'error');
    console.error('Error saving credentials:', error);
  } finally {
    loading.value = false;
  }
};

const deleteCredential = async (credential: GetAllCredentials200ResponseResponseObjectInner) => {
  if (!confirm(`Are you sure you want to delete the credential "${credential.name}"?`)) {
    return;
  }

  loading.value = true;
  try {
    await backupApi.deleteCredentials({ id: credential.id });
    notifierStore.notify('Credential deleted successfully', 'success');
    await loadCredentials();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete credential';
    notifierStore.notify(message, 'error');
    console.error('Error deleting credential:', error);
  } finally {
    loading.value = false;
  }
};

const availableCredentials = computed(() => {
  return credentials.value.filter(c => c.storageType === newJob.value.storageType);
});

onMounted(async () => {
  await Promise.all([loadBackupJobs(), loadCollections(), loadCredentials()]);
});
</script>

<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">Automated Backups</h1>
      </v-col>
    </v-row>

    <!-- Backup Jobs Table -->
    <v-row>
      <v-col cols="12">
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
                <span v-if="item.frequency === 'daily'">Daily (2:00 AM)</span>
                <span v-else-if="item.frequency === 'weekly'">Weekly (Sunday)</span>
                <span v-else-if="item.frequency === 'monthly'">Monthly (1st)</span>
                <span v-else>Custom: {{ item.cronExpression }}</span>
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
        </v-card>
      </v-col>
    </v-row>

    <!-- Credentials Section -->
    <v-row class="mt-4">
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <span>Storage Credentials</span>
            <v-spacer />
            <v-btn color="secondary" @click="openNewCredentialDialog">
              <v-icon left>mdi-key-plus</v-icon>
              Add Credentials
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item
                v-for="credential in credentials"
                :key="credential.id"
                :title="credential.name"
                :subtitle="credential.storageType.toUpperCase()"
              >
                <template #append>
                  <v-btn
                    icon="mdi-delete"
                    size="small"
                    variant="text"
                    color="error"
                    @click="deleteCredential(credential)"
                  />
                </template>
              </v-list-item>
              <v-list-item v-if="credentials.length === 0">
                <v-list-item-title class="text-caption text-medium-emphasis">
                  No credentials configured
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

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
                <v-text-field
                  v-if="newJob.frequency === 'custom'"
                  v-model="newJob.cronExpression"
                  label="Cron Expression"
                  placeholder="0 2 * * *"
                  hint="Unix cron format"
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
                  hint="Leave empty to keep existing password (if editing)"
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
            @click="saveJob"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Credential Dialog -->
    <v-dialog v-model="showCredentialDialog" max-width="600px" persistent>
      <v-card>
        <v-card-title>
          <span class="text-h5">Add Storage Credentials</span>
        </v-card-title>
        <v-card-text>
          <v-form>
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="newCredential.name"
                  label="Credential Name"
                  required
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12">
                <v-select
                  v-model="newCredential.storageType"
                  :items="storageTypeOptions.filter(s => s.value !== 'local')"
                  label="Storage Type"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col
                v-for="field in credentialFields"
                :key="field.key"
                cols="12"
              >
                <v-text-field
                  v-model="newCredential.credentials[field.key]"
                  :label="field.label"
                  :type="field.type"
                  required
                />
              </v-col>
            </v-row>

            <v-alert type="info" density="compact" class="mt-2">
              Credentials are encrypted and stored securely. They cannot be retrieved once saved.
            </v-alert>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="showCredentialDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="loading"
            @click="saveCredential"
          >
            Save Credentials
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.v-data-table {
  font-size: 0.875rem;
}
</style>
