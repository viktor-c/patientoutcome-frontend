<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useNotifierStore } from '@/stores/';
import { backupApi } from '@/api';
import { useI18n } from 'vue-i18n';
import CredentialsManager from '@/components/backup/CredentialsManager.vue';
import type { GetBackupHistory200ResponseResponseObjectInner } from '@/api/models/GetBackupHistory200ResponseResponseObjectInner';
import type { CollectionMetadata } from '@/api/models/CollectionMetadata';
import type { GetBackupMetadata200ResponseResponseObject } from '@/api/models/GetBackupMetadata200ResponseResponseObject';
import type { GetAllCredentials200ResponseResponseObjectInner } from '@/api/models/GetAllCredentials200ResponseResponseObjectInner';
import type { GetAllBackupJobs200ResponseResponseObjectInner } from '@/api/models/GetAllBackupJobs200ResponseResponseObjectInner';
import type { CreateBackupJobRequest } from '@/api/models/CreateBackupJobRequest';
import type { UpdateBackupJobRequest } from '@/api/models/UpdateBackupJobRequest';

const notifierStore = useNotifierStore();
const { t } = useI18n();
const loading = ref(false);
const tab = ref('manual');

// Shared data
const collections = ref<CollectionMetadata[]>([]);
const credentials = ref<GetAllCredentials200ResponseResponseObjectInner[]>([]);

// Manual backup data
const backupHistory = ref<GetBackupHistory200ResponseResponseObjectInner[]>([]);
const selectedBackup = ref<GetBackupHistory200ResponseResponseObjectInner | null>(null);
const showRestoreDialog = ref(false);
const selectedCollections = ref<string[]>([]);
const restoreMode = ref<'merge' | 'replace'>('merge');
const backupPassword = ref('');
const currentMetadata = ref<GetBackupMetadata200ResponseResponseObject | null>(null);
const manualBackupLoading = ref(false);
const selectedBackupCollections = ref<string[]>([]);
const encryptBackup = ref(false);
const encryptionPassword = ref('');
const uploadFile = ref<File | null>(null);
const uploadDialog = ref(false);
const selectedDestination = ref<string>('local');

// Delete confirmation
const deleteDialog = ref(false);
const deleteConfirmDialog = ref(false);
const backupToDelete = ref<GetBackupHistory200ResponseResponseObjectInner | null>(null);
const deleteConfirmationWord = ref('');
const requiredConfirmationWord = ref('');
const deleteLoading = ref(false);

// Automated backup data
const backupJobs = ref<GetAllBackupJobs200ResponseResponseObjectInner[]>([]);
const showJobDialog = ref(false);
const editingJob = ref<GetAllBackupJobs200ResponseResponseObjectInner | null>(null);

const backupHistoryHeaders = [
  { title: 'Filename', key: 'filename', sortable: true },
  { title: 'Storage', key: 'storage', sortable: false },
  { title: 'Encryption', key: 'encryption', sortable: false },
  { title: 'Created', key: 'startedAt', sortable: true },
  { title: 'Size', key: 'sizeBytes', sortable: true },
  { title: 'Collections', key: 'collections', sortable: false },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false },
];

const jobHeaders = [
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Schedule', key: 'frequency', sortable: true },
  { title: 'Storage', key: 'storageType', sortable: true },
  { title: 'Enabled', key: 'enabled', sortable: true },
  { title: 'Last Run', key: 'lastRunAt', sortable: true },
  { title: 'Status', key: 'lastRunStatus', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false },
];

const collectionHeaders = [
  { title: 'Collection', key: 'name' },
  { title: 'Documents', key: 'documentCount' },
  { title: 'Last Modified', key: 'lastModified' },
  { title: 'Size', key: 'sizeBytes' },
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

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleString();
};

// Load data functions
const loadBackupHistory = async () => {
  loading.value = true;
  try {
    const response = await backupApi.getBackupHistory();
    if (response.success && response.responseObject) {
      backupHistory.value = response.responseObject;
    }
  } catch (error) {
    notifierStore.notify('Failed to load backup history', 'error');
    console.error('Error loading backup history:', error);
  } finally {
    loading.value = false;
  }
};

const loadCollections = async () => {
  try {
    const response = await backupApi.getCollections();
    if (response.success && response.responseObject) {
      collections.value = response.responseObject;
      selectedBackupCollections.value = collections.value.map(c => c.name);
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

// Manual backup functions
const createManualBackup = async () => {
  if (encryptBackup.value && !encryptionPassword.value) {
    notifierStore.notify('Please provide an encryption password', 'info');
    return;
  }

  if (selectedBackupCollections.value.length === 0) {
    notifierStore.notify('Please select at least one collection', 'info');
    return;
  }

  manualBackupLoading.value = true;
  try {
    const destination = backupDestinations.value.find(d => d.value === selectedDestination.value);

    const response = await backupApi.createManualBackup({
      createManualBackupRequest: {
        collections: selectedBackupCollections.value.length === collections.value.length
          ? [] // Empty means all collections
          : selectedBackupCollections.value,
        storageType: (destination?.storageType || 'local') as any,
        credentialId: destination?.credentialId || undefined,
        encryptionEnabled: encryptBackup.value,
        password: encryptBackup.value ? encryptionPassword.value : undefined,
      },
    });

    if (response.success) {
      notifierStore.notify('Backup created successfully', 'success');
      encryptionPassword.value = '';
      encryptBackup.value = false;
      selectedDestination.value = 'local';
      await loadBackupHistory();
    }
  } catch (error) {
    notifierStore.notify('Failed to create backup', 'error');
    console.error('Error creating backup:', error);
  } finally {
    manualBackupLoading.value = false;
  }
};

const downloadBackup = async (backup: GetBackupHistory200ResponseResponseObjectInner) => {
  try {
    const response = await backupApi.downloadBackupRaw({
      id: backup.id!,
    });

    const blob = await response.raw.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', backup.filename || 'backup.tar.gz');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    notifierStore.notify('Failed to download backup', 'error');
    console.error('Error downloading backup:', error);
  }
};

const openRestoreDialog = async (backup: GetBackupHistory200ResponseResponseObjectInner) => {
  selectedBackup.value = backup;
  showRestoreDialog.value = true;
  backupPassword.value = '';
  restoreMode.value = 'merge';

  try {
    const response = await backupApi.getBackupMetadata({
      id: backup.id!,
    });
    if (response.success && response.responseObject) {
      currentMetadata.value = response.responseObject;
      selectedCollections.value = currentMetadata.value.collections?.map((c) => c.name) || [];
    }
  } catch (error) {
    notifierStore.notify('Failed to load backup metadata', 'error');
    console.error('Error loading backup metadata:', error);
  }
};

const restoreBackup = async () => {
  if (!selectedBackup.value) return;

  if (selectedCollections.value.length === 0) {
    notifierStore.notify('Please select at least one collection to restore', 'info');
    return;
  }

  if (currentMetadata.value?.isEncrypted && !backupPassword.value) {
    notifierStore.notify('This backup is encrypted. Please provide the password', 'info');
    return;
  }

  loading.value = true;
  try {
    const response = await backupApi.restoreBackup({
      id: selectedBackup.value.id!,
      restoreBackupRequest: {
        collections: selectedCollections.value,
        mode: restoreMode.value,
        password: backupPassword.value || undefined,
      },
    });

    if (response.success && response.responseObject) {
      const result = response.responseObject;
      notifierStore.notify(
        `Restore completed: ${result.totalDocumentsRestored || 0} documents restored, ${result.totalDocumentsSkipped || 0} skipped`,
        'success'
      );
      showRestoreDialog.value = false;
      selectedBackup.value = null;
      backupPassword.value = '';
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to restore backup';
    notifierStore.notify(message, 'error');
    console.error('Error restoring backup:', error);
  } finally {
    loading.value = false;
  }
};

const handleFileUpload = async () => {
  if (!uploadFile.value) {
    notifierStore.notify('Please select a file to upload', 'info');
    return;
  }

  loading.value = true;
  try {
    const response = await backupApi.uploadBackup({
      file: uploadFile.value || undefined,
    });

    if (response.success) {
      notifierStore.notify('Backup uploaded successfully', 'success');
      uploadDialog.value = false;
      uploadFile.value = null;
      await loadBackupHistory();
    }
  } catch (error) {
    notifierStore.notify('Failed to upload backup', 'error');
    console.error('Error uploading backup:', error);
  } finally {
    loading.value = false;
  }
};

// Delete functions
const openDeleteDialog = (backup: GetBackupHistory200ResponseResponseObjectInner) => {
  backupToDelete.value = backup;
  deleteDialog.value = true;
};

const confirmDeleteStep1 = () => {
  deleteDialog.value = false;
  const words = ['delete', 'trash', 'yes'];
  requiredConfirmationWord.value = words[Math.floor(Math.random() * words.length)];
  deleteConfirmationWord.value = '';
  deleteConfirmDialog.value = true;
};

const confirmDeleteStep2 = async () => {
  if (deleteConfirmationWord.value.toLowerCase() !== requiredConfirmationWord.value) {
    notifierStore.notify(`Please type "${requiredConfirmationWord.value}" to confirm`, 'info');
    return;
  }

  if (!backupToDelete.value?.id) return;

  deleteLoading.value = true;
  try {
    await backupApi.deleteBackup({ id: backupToDelete.value.id });
    notifierStore.notify('Backup deleted successfully', 'success');
    deleteConfirmDialog.value = false;
    backupToDelete.value = null;
    await loadBackupHistory();
  } catch (error) {
    notifierStore.notify('Failed to delete backup', 'error');
    console.error('Error deleting backup:', error);
  } finally {
    deleteLoading.value = false;
  }
};

const cancelDelete = () => {
  deleteDialog.value = false;
  deleteConfirmDialog.value = false;
  backupToDelete.value = null;
  deleteConfirmationWord.value = '';
};

// Automated backup job functions
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

const availableCredentials = computed(() => {
  return credentials.value.filter(c => c.storageType === newJob.value.storageType);
});

const backupDestinations = computed(() => {
  const destinations = [
    {
      value: 'local',
      title: 'Server Storage',
      subtitle: 'Save to server filesystem',
      storageType: 'local',
      credentialId: ""
    }
  ];

  credentials.value.forEach(cred => {
    const typeLabel = {
      's3': 'Amazon S3',
      'sftp': 'SFTP',
      'webdav': 'WebDAV',
      'local': 'Local'
    }[cred.storageType] || cred.storageType;

    destinations.push({
      value: cred.id!,
      title: cred.name,
      subtitle: typeLabel,
      storageType: cred.storageType,
      credentialId: cred.id!
    });
  });

  return destinations;
});

const hasRemoteCredentials = computed(() => {
  return credentials.value.length > 0;
});

const getStorageDisplayName = (backup: GetBackupHistory200ResponseResponseObjectInner): string => {
  if (backup.storageType === 'local') {
    return 'Server Storage';
  }
  
  if (backup.credentialId) {
    const credential = credentials.value.find(c => c.id === backup.credentialId);
    if (credential) {
      return credential.name;
    }
  }
  
  // Fallback to storage type
  const typeLabels: Record<string, string> = {
    's3': 'Amazon S3',
    'sftp': 'SFTP',
    'webdav': 'WebDAV'
  };
  return typeLabels[backup.storageType] || backup.storageType;
};

interface CollectionComparison {
  name: string;
  backupCount: number;
  currentCount: number;
  backupLastModified?: string | null;
  currentLastModified?: string | null;
  sizeBytes?: number;
}

const collectionComparison = computed<CollectionComparison[]>(() => {
  if (!currentMetadata.value?.collections) return [];

  return currentMetadata.value.collections.map((backupCol) => {
    const currentCol = collections.value.find(c => c.name === backupCol.name);
    return {
      name: backupCol.name,
      backupCount: backupCol.documentCount,
      currentCount: currentCol?.documentCount || 0,
      backupLastModified: backupCol.lastModified,
      currentLastModified: currentCol?.lastModified,
      sizeBytes: backupCol.sizeBytes,
    };
  });
});

onMounted(async () => {
  await Promise.all([loadBackupHistory(), loadCollections(), loadCredentials(), loadBackupJobs()]);
});
</script>

<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">Backup Management</h1>
      </v-col>
    </v-row>

    <!-- Credentials Manager - Collapsed by default -->
    <v-row>
      <v-col cols="12">
        <CredentialsManager
          :credentials="credentials"
          @refresh="loadCredentials"
        />
      </v-col>
    </v-row>

    <!-- Tabs for Manual and Automated Backups -->
    <v-row class="mt-4">
      <v-col cols="12">
        <v-tabs v-model="tab" bg-color="primary">
          <v-tab value="manual">
            <v-icon left>mdi-database-export</v-icon>
            Manual Backup
          </v-tab>
          <v-tab value="automated">
            <v-icon left>mdi-database-clock</v-icon>
            Automated Jobs
          </v-tab>
        </v-tabs>

        <v-window v-model="tab" class="mt-4">
          <!-- Manual Backup Tab -->
          <v-window-item value="manual">
            <!-- Create Manual Backup -->
            <v-row>
              <v-col cols="12">
                <v-card>
                  <v-card-title>Create Manual Backup</v-card-title>
                  <v-card-text>
                    <v-row>
                      <v-col cols="12">
                        <v-alert
                          v-if="!hasRemoteCredentials"
                          type="info"
                          variant="tonal"
                          density="compact"
                          class="mb-4"
                        >
                          Backup will be saved to the server filesystem. Add remote storage credentials to enable cloud backup options.
                        </v-alert>
                      </v-col>
                    </v-row>
                    <v-row>
                      <v-col cols="12" md="6">
                        <v-select
                          v-model="selectedBackupCollections"
                          :items="collections"
                          item-title="name"
                          item-value="name"
                          label="Collections to Backup"
                          multiple
                          chips
                          closable-chips
                          hint="Select all collections you want to backup"
                          persistent-hint
                        />
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-select
                          v-model="selectedDestination"
                          :items="backupDestinations"
                          item-title="title"
                          item-value="value"
                          label="Backup Destination"
                          hint="Select where to save the backup"
                          persistent-hint
                        >
                          <template v-slot:item="{ props, item }">
                            <v-list-item v-bind="props">
                              <template v-slot:subtitle>
                                <span class="text-caption">{{ item.raw.subtitle }}</span>
                              </template>
                            </v-list-item>
                          </template>
                        </v-select>
                      </v-col>
                    </v-row>
                    <v-row>
                      <v-col cols="12">
                        <v-checkbox
                          v-model="encryptBackup"
                          label="Encrypt backup with password"
                          hint="Password cannot be changed once set"
                          persistent-hint
                        />
                        <v-text-field
                          v-if="encryptBackup"
                          v-model="encryptionPassword"
                          label="Encryption Password"
                          type="password"
                          class="mt-2"
                          hint="Keep this password safe - you'll need it to restore"
                          persistent-hint
                        />
                      </v-col>
                    </v-row>
                  </v-card-text>
                  <v-card-actions>
                    <v-spacer />
                    <v-btn
                      color="secondary"
                      @click="uploadDialog = true"
                    >
                      <v-icon left>mdi-upload</v-icon>
                      Upload Backup
                    </v-btn>
                    <v-btn
                      color="primary"
                      :loading="manualBackupLoading"
                      @click="createManualBackup"
                    >
                      <v-icon left>mdi-database-export</v-icon>
                      Create Backup
                    </v-btn>
                  </v-card-actions>
                </v-card>
              </v-col>
            </v-row>

            <!-- Backup History -->
            <v-row class="mt-4">
              <v-col cols="12">
                <v-card>
                  <v-card-title>Backup History</v-card-title>
                  <v-card-text>
                    <v-data-table
                      :headers="backupHistoryHeaders"
                      :items="backupHistory"
                      :loading="loading"
                      class="elevation-1"
                    >
                      <template v-slot:[`item.storage`]="{ item }">
                        <v-chip size="small" variant="tonal">
                          {{ getStorageDisplayName(item) }}
                        </v-chip>
                      </template>
                      <template v-slot:[`item.encryption`]="{ item }">
                        <v-tooltip v-if="item.isEncrypted || item.encryptedWithPassword" :text="t('backup.encrypted')" location="top">
                          <template v-slot:activator="{ props }">
                            <v-icon v-bind="props" size="small" color="warning">
                              mdi-key
                            </v-icon>
                          </template>
                        </v-tooltip>
                      </template>
                      <template v-slot:[`item.startedAt`]="{ item }">
                        {{ formatDate(item.startedAt) }}
                      </template>
                      <template v-slot:[`item.sizeBytes`]="{ item }">
                        {{ formatBytes(item.sizeBytes) }}
                      </template>
                      <template v-slot:[`item.collections`]="{ item }">
                        <v-chip size="small">
                          {{ item.collections.length }} collections
                        </v-chip>
                      </template>
                      <template v-slot:[`item.status`]="{ item }">
                        <v-chip
                          :color="item.status === 'completed' ? 'success' : item.status === 'failed' ? 'error' : 'info'"
                          size="small"
                        >
                          {{ item.status }}
                        </v-chip>
                      </template>
                      <template v-slot:[`item.actions`]="{ item }">
                        <v-tooltip :text="t('backup.download')" location="top">
                          <template v-slot:activator="{ props }">
                            <v-btn
                              v-bind="props"
                              icon="mdi-download"
                              size="small"
                              variant="text"
                              @click="downloadBackup(item)"
                              :disabled="item.status !== 'completed'"
                            />
                          </template>
                        </v-tooltip>
                        <v-tooltip :text="t('backup.restore')" location="top">
                          <template v-slot:activator="{ props }">
                            <v-btn
                              v-bind="props"
                              icon="mdi-database-import"
                              size="small"
                              variant="text"
                              color="primary"
                              @click="openRestoreDialog(item)"
                              :disabled="item.status !== 'completed'"
                            />
                          </template>
                        </v-tooltip>
                        <v-tooltip :text="t('backup.delete')" location="top">
                          <template v-slot:activator="{ props }">
                            <v-btn
                              v-bind="props"
                              icon="mdi-delete"
                              size="small"
                              variant="text"
                              color="error"
                              @click="openDeleteDialog(item)"
                            />
                          </template>
                        </v-tooltip>
                      </template>
                    </v-data-table>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-window-item>

          <!-- Automated Backup Jobs Tab -->
          <v-window-item value="automated">
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
          </v-window-item>
        </v-window>
      </v-col>
    </v-row>

    <!-- Restore Dialog -->
    <v-dialog v-model="showRestoreDialog" max-width="800px" persistent>
      <v-card>
        <v-card-title>
          <span class="text-h5">Restore Backup</span>
        </v-card-title>
        <v-card-text>
          <v-alert v-if="currentMetadata?.isEncrypted" type="warning" class="mb-4">
            This backup is encrypted. You need the encryption password to restore it.
          </v-alert>

          <v-row>
            <v-col cols="12">
              <v-radio-group v-model="restoreMode" inline>
                <v-radio label="Merge (skip existing documents)" value="merge" />
                <v-radio label="Replace (drop and restore)" value="replace" color="error" />
              </v-radio-group>
              <v-alert v-if="restoreMode === 'replace'" type="error" density="compact">
                Warning: Replace mode will delete all existing data in selected collections!
              </v-alert>
            </v-col>
          </v-row>

          <v-row v-if="currentMetadata?.isEncrypted">
            <v-col cols="12">
              <v-text-field
                v-model="backupPassword"
                label="Backup Password"
                type="password"
                required
              />
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12">
              <h4 class="mb-2">Select Collections to Restore</h4>
              <v-data-table
                v-model="selectedCollections"
                :headers="collectionHeaders"
                :items="collectionComparison"
                item-value="name"
                show-select
                density="compact"
              >
                <template v-slot:[`item.documentCount`]="{ item }">
                  <div>
                    <div>Backup: {{ item.backupCount }}</div>
                    <div class="text-caption">Current: {{ item.currentCount }}</div>
                  </div>
                </template>
                <template v-slot:[`item.lastModified`]="{ item }">
                  <div v-if="item.backupLastModified">
                    <div class="text-caption">Backup: {{ formatDate(item.backupLastModified) }}</div>
                    <div v-if="item.currentLastModified" class="text-caption">
                      Current: {{ formatDate(item.currentLastModified) }}
                    </div>
                  </div>
                  <span v-else class="text-caption">N/A</span>
                </template>
                <template v-slot:[`item.sizeBytes`]="{ item }">
                  {{ formatBytes(item.sizeBytes || 0) }}
                </template>
              </v-data-table>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="showRestoreDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="loading"
            @click="restoreBackup"
          >
            Restore Selected Collections
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Upload Dialog -->
    <v-dialog v-model="uploadDialog" max-width="500px">
      <v-card>
        <v-card-title>Upload Backup File</v-card-title>
        <v-card-text>
          <v-file-input
            v-model="uploadFile"
            label="Select backup file (.tar.gz)"
            accept=".tar.gz,.tgz"
            prepend-icon="mdi-file-upload"
            show-size
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="uploadDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="loading"
            @click="handleFileUpload"
          >
            Upload
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog - Step 1 -->
    <v-dialog v-model="deleteDialog" max-width="500px" persistent>
      <v-card>
        <v-card-title class="text-h5 text-error">
          <v-icon color="error" class="mr-2">mdi-alert-circle</v-icon>
          Delete Backup?
        </v-card-title>
        <v-card-text>
          <v-alert type="error" variant="tonal" class="mb-4">
            <div class="font-weight-bold">⚠️ WARNING: This action cannot be undone!</div>
            <div class="mt-2">The backup file and all associated data will be permanently deleted.</div>
          </v-alert>
          <div class="mt-4">
            <div><strong>Backup:</strong> {{ backupToDelete?.filename }}</div>
            <div><strong>Created:</strong> {{ backupToDelete?.startedAt ? formatDate(backupToDelete.startedAt) : 'N/A' }}</div>
            <div><strong>Size:</strong> {{ backupToDelete?.sizeBytes ? formatBytes(backupToDelete.sizeBytes) : 'N/A' }}</div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="cancelDelete">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="confirmDeleteStep1">
            Continue to Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog - Step 2 -->
    <v-dialog v-model="deleteConfirmDialog" max-width="500px" persistent>
      <v-card>
        <v-card-title class="text-h5 text-error">
          <v-icon color="error" class="mr-2">mdi-alert-octagon</v-icon>
          Final Confirmation Required
        </v-card-title>
        <v-card-text>
          <v-alert type="error" variant="tonal" prominent class="mb-4">
            <div class="font-weight-bold text-h6">⚠️ FINAL WARNING!</div>
            <div class="mt-2">This backup will be permanently deleted and CANNOT be recovered.</div>
          </v-alert>
          <div class="mt-4 mb-4">
            <p class="font-weight-bold">To confirm deletion, please type the word:</p>
            <p class="text-h5 text-center text-error my-3">"{{ requiredConfirmationWord }}"</p>
          </div>
          <v-text-field
            v-model="deleteConfirmationWord"
            label="Type confirmation word"
            variant="outlined"
            :hint="`Type '${requiredConfirmationWord}' to confirm`"
            persistent-hint
            autofocus
            @keyup.enter="confirmDeleteStep2"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="cancelDelete">Cancel</v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="deleteLoading"
            :disabled="deleteConfirmationWord.toLowerCase() !== requiredConfirmationWord"
            @click="confirmDeleteStep2"
          >
            Delete Permanently
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
  </v-container>
</template>

<style scoped>
.v-data-table {
  font-size: 0.875rem;
}
</style>
