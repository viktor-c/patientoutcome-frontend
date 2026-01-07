<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useNotifierStore } from '@/stores/';
import { backupApi } from '@/api';
import type { GetBackupHistory200ResponseResponseObjectInner } from '@/api/models/GetBackupHistory200ResponseResponseObjectInner';
import type { CollectionMetadata } from '@/api/models/CollectionMetadata';
import type { GetBackupMetadata200ResponseResponseObject } from '@/api/models/GetBackupMetadata200ResponseResponseObject';

const notifierStore = useNotifierStore();
const loading = ref(false);
const backupHistory = ref<GetBackupHistory200ResponseResponseObjectInner[]>([]);
const collections = ref<CollectionMetadata[]>([]);
const selectedBackup = ref<GetBackupHistory200ResponseResponseObjectInner | null>(null);
const showRestoreDialog = ref(false);
const selectedCollections = ref<string[]>([]);
const restoreMode = ref<'merge' | 'replace'>('merge');
const backupPassword = ref('');
const currentMetadata = ref<GetBackupMetadata200ResponseResponseObject | null>(null);

// Manual backup
const manualBackupLoading = ref(false);
const selectedBackupCollections = ref<string[]>([]);
const encryptBackup = ref(false);
const encryptionPassword = ref('');

// File upload
const uploadFile = ref<File | null>(null);
const uploadDialog = ref(false);

// Delete confirmation
const deleteDialog = ref(false);
const deleteConfirmDialog = ref(false);
const backupToDelete = ref<GetBackupHistory200ResponseResponseObjectInner | null>(null);
const deleteConfirmationWord = ref('');
const requiredConfirmationWord = ref('');
const deleteLoading = ref(false);

const headers = [
  { title: 'Filename', key: 'filename', sortable: true },
  { title: 'Encryption', key: 'encryption', sortable: false },
  { title: 'Created', key: 'startedAt', sortable: true },
  { title: 'Size', key: 'sizeBytes', sortable: true },
  { title: 'Collections', key: 'collections', sortable: false },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false },
];

const collectionHeaders = [
  { title: 'Collection', key: 'name' },
  { title: 'Documents', key: 'documentCount' },
  { title: 'Last Modified', key: 'lastModified' },
  { title: 'Size', key: 'sizeBytes' },
];

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

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
    notifierStore.notify('Failed to load collections', 'error');
    console.error('Error loading collections:', error);
  }
};

const createManualBackup = async () => {
  if (encryptBackup.value && !encryptionPassword.value) {
    notifierStore.notify('Please provide an encryption password', 'info');
    return;
  }

  manualBackupLoading.value = true;
  try {
    const response = await backupApi.createManualBackup({
      createManualBackupRequest: {
        collections: selectedBackupCollections.value.length === collections.value.length 
          ? [] // Empty means all collections
          : selectedBackupCollections.value,
        storageType: 'local',
        encryptionEnabled: encryptBackup.value,
        password: encryptBackup.value ? encryptionPassword.value : undefined,
      },
    });

    if (response.success) {
      notifierStore.notify('Backup created successfully', 'success');
      encryptionPassword.value = '';
      encryptBackup.value = false;
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

  // Load backup metadata
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

const openDeleteDialog = (backup: GetBackupHistory200ResponseResponseObjectInner) => {
  backupToDelete.value = backup;
  deleteDialog.value = true;
};

const confirmDeleteStep1 = () => {
  deleteDialog.value = false;
  // Randomly select one of the three confirmation words
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
  await Promise.all([loadBackupHistory(), loadCollections()]);
});
</script>

<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">Database Backup & Restore</h1>
      </v-col>
    </v-row>

    <!-- Manual Backup Section -->
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>Create Manual Backup</v-card-title>
          <v-card-text>
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
                  hint="Leave empty to backup all collections"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12" md="6">
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
              color="primary"
              :loading="manualBackupLoading"
              @click="createManualBackup"
            >
              <v-icon left>mdi-database-export</v-icon>
              Create Backup
            </v-btn>
            <v-btn
              color="secondary"
              @click="uploadDialog = true"
            >
              <v-icon left>mdi-upload</v-icon>
              Upload Backup
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
              :headers="headers"
              :items="backupHistory"
              :loading="loading"
              class="elevation-1"
            >
              <template v-slot:[`item.encryption`]="{ item }">
                <v-tooltip v-if="item.isEncrypted || item.encryptedWithPassword" :text="$t('backup.encrypted')" location="top">
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
                <v-tooltip :text="$t('backup.download')" location="top">
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
                <v-tooltip :text="$t('backup.restore')" location="top">
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
                <v-tooltip :text="$t('backup.delete')" location="top">
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
          <v-btn
            text
            @click="showRestoreDialog = false"
          >
            Cancel
          </v-btn>
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
  </v-container>
</template>

<style scoped>
.v-data-table {
  font-size: 0.875rem;
}
</style>
