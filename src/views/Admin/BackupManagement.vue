<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useNotifierStore } from '@/stores/';
import { backupApi } from '@/api';
import { useI18n } from 'vue-i18n';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import 'dayjs/locale/en';
import 'dayjs/locale/de';
import CredentialsManager from '@/components/backup/CredentialsManager.vue';
import BackupJobsManager from '@/components/backup/BackupJobsManager.vue';
import BackupHistoryList from '@/components/backup/BackupHistoryList.vue';
import type { GetBackupHistory200ResponseResponseObjectInner } from '@/api/models/GetBackupHistory200ResponseResponseObjectInner';
import type { CollectionMetadata } from '@/api/models/CollectionMetadata';
import type { GetBackupMetadata200ResponseResponseObject } from '@/api/models/GetBackupMetadata200ResponseResponseObject';
import type { GetAllCredentials200ResponseResponseObjectInner } from '@/api/models/GetAllCredentials200ResponseResponseObjectInner';

dayjs.extend(localizedFormat);

const notifierStore = useNotifierStore();
const { t } = useI18n();
const loading = ref(false);
const tab = ref('manual');

// Set dayjs locale based on i18n locale
const locale = computed(() => {
  const i18nLocale = t('locale');
  return i18nLocale.startsWith('de') ? 'de' : 'en';
});

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
const encryptionPasswordConfirm = ref('');
const uploadFile = ref<File | null>(null);
const uploadDialog = ref(false);
const selectedDestination = ref<string>('local');

const collectionHeaders = [
  { title: 'Collection', key: 'name' },
  { title: 'Documents', key: 'documentCount' },
  { title: 'Last Modified', key: 'lastModified' },
  { title: 'Size', key: 'sizeBytes' },
];

interface CollectionComparison {
  name: string;
  backupCount?: number;
  currentCount?: number;
  backupLastModified?: string | null;
  currentLastModified?: string | null;
  sizeBytes?: number;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Never';
  return dayjs(dateString).locale(locale.value).format('L LTS');
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

// Manual backup functions
const createManualBackup = async () => {
  if (encryptBackup.value && !encryptionPassword.value) {
    notifierStore.notify('Please provide an encryption password', 'info');
    return;
  }

  if (encryptBackup.value && !passwordsMatch.value) {
    notifierStore.notify('Encryption passwords do not match', 'error');
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
      encryptionPasswordConfirm.value = '';
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

const passwordsMatch = computed(() => {
  if (!encryptBackup.value) return true;
  return encryptionPassword.value === encryptionPasswordConfirm.value && encryptionPassword.value.length > 0;
});

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
  await Promise.all([loadBackupHistory(), loadCollections(), loadCredentials()]);
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
                        <v-text-field
                          v-if="encryptBackup"
                          v-model="encryptionPasswordConfirm"
                          label="Confirm Encryption Password"
                          type="password"
                          class="mt-2"
                          :error="!passwordsMatch"
                          :hint="!passwordsMatch ? 'Passwords do not match' : 'Re-enter password to confirm'"
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
          </v-window-item>

          <!-- Automated Backup Jobs Tab -->
          <v-window-item value="automated">
            <v-row>
              <v-col cols="12">
                <BackupJobsManager
                  :credentials="credentials"
                  :collections="collections"
                />
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
                    <div class="text-caption">Backup: {{ formatDate(item.backupLastModified || '') }}</div>
                    <div v-if="item.currentLastModified" class="text-caption">
                      Current: {{ formatDate(item.currentLastModified || '') }}
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

    <!-- Backup History - Always displayed at the bottom -->
    <v-row class="mt-4">
      <v-col cols="12">
        <BackupHistoryList
          :backup-history="backupHistory"
          :credentials="credentials"
          :loading="loading"
          @refresh="loadBackupHistory"
          @restore="openRestoreDialog"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.v-data-table {
  font-size: 0.875rem;
}
</style>
