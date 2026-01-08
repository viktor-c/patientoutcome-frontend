<script setup lang="ts">
import { ref, computed } from 'vue';
import { useNotifierStore } from '@/stores/';
import { backupApi } from '@/api';
import { useI18n } from 'vue-i18n';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import 'dayjs/locale/en';
import 'dayjs/locale/de';
import type { GetBackupHistory200ResponseResponseObjectInner } from '@/api/models/GetBackupHistory200ResponseResponseObjectInner';
import type { GetAllCredentials200ResponseResponseObjectInner } from '@/api/models/GetAllCredentials200ResponseResponseObjectInner';

dayjs.extend(localizedFormat);

interface Props {
  backupHistory: GetBackupHistory200ResponseResponseObjectInner[];
  credentials: GetAllCredentials200ResponseResponseObjectInner[];
  loading: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  refresh: [];
  restore: [backup: GetBackupHistory200ResponseResponseObjectInner];
}>();

const notifierStore = useNotifierStore();
const { t } = useI18n();

// Set dayjs locale based on i18n locale
const locale = computed(() => {
  const i18nLocale = t('locale');
  return i18nLocale.startsWith('de') ? 'de' : 'en';
});

// Delete confirmation
const deleteDialog = ref(false);
const deleteConfirmDialog = ref(false);
const backupToDelete = ref<GetBackupHistory200ResponseResponseObjectInner | null>(null);
const deleteConfirmationWord = ref('');
const requiredConfirmationWord = ref('');
const deleteLoading = ref(false);

const backupHistoryHeaders = [
  { title: 'Filename', key: 'filename', sortable: true },
  { title: 'Storage', key: 'storage', sortable: false },
  { title: 'Credential', key: 'credential', sortable: false },
  { title: 'Encryption', key: 'encryption', sortable: false },
  { title: 'Created', key: 'startedAt', sortable: true },
  { title: 'Size', key: 'sizeBytes', sortable: true },
  { title: 'Collections', key: 'collections', sortable: false },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false },
];

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

const openRestoreDialog = (backup: GetBackupHistory200ResponseResponseObjectInner) => {
  emit('restore', backup);
};

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
    emit('refresh');
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

const getStorageDisplayName = (backup: GetBackupHistory200ResponseResponseObjectInner): string => {
  if (backup.storageType === 'local') {
    return 'Server Storage';
  }

  const typeLabels: Record<string, string> = {
    's3': 'Amazon S3',
    'sftp': 'SFTP',
    'webdav': 'WebDAV'
  };

  return typeLabels[backup.storageType] || backup.storageType;
};

const getCredentialName = (backup: GetBackupHistory200ResponseResponseObjectInner): string => {
  if (backup.storageType === 'local') {
    return 'Server';
  }

  if (backup.credentialId) {
    const credential = props.credentials.find(c => c.id === backup.credentialId);
    if (credential) {
      return credential.name;
    }
  }

  return '-';
};

const getLocationDetails = (backup: GetBackupHistory200ResponseResponseObjectInner): string => {
  const parts: string[] = [];

  const credName = getCredentialName(backup);
  if (credName !== '-') {
    parts.push(`Credential: ${credName}`);
  }

  parts.push(`Storage: ${getStorageDisplayName(backup)}`);

  if (backup.storageLocation) {
    parts.push(`Location: ${backup.storageLocation}`);
  }

  return parts.join('\n');
};
</script>

<template>
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
          <v-tooltip location="top">
            <template v-slot:activator="{ props }">
              <v-chip v-bind="props" size="small" variant="tonal">
                {{ getStorageDisplayName(item) }}
              </v-chip>
            </template>
            <div style="white-space: pre-line;">{{ getLocationDetails(item) }}</div>
          </v-tooltip>
        </template>
        <template v-slot:[`item.credential`]="{ item }">
          <span>{{ getCredentialName(item) }}</span>
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
  </v-card>
</template>

<style scoped>
.v-data-table {
  font-size: 0.875rem;
}
</style>
