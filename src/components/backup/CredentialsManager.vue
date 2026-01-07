<script setup lang="ts">
import { ref, computed } from 'vue';
import { useNotifierStore } from '@/stores/';
import { backupApi } from '@/api';
import type { GetAllCredentials200ResponseResponseObjectInner } from '@/api/models/GetAllCredentials200ResponseResponseObjectInner';
import type { CreateCredentialsRequest } from '@/api/models/CreateCredentialsRequest';

const notifierStore = useNotifierStore();
const loading = ref(false);
const expanded = ref(false);
const showCredentialDialog = ref(false);
const editingCredential = ref<GetAllCredentials200ResponseResponseObjectInner | null>(null);

const props = defineProps<{
  credentials: GetAllCredentials200ResponseResponseObjectInner[];
}>();

const emit = defineEmits<{
  refresh: [];
}>();

const storageTypeOptions = [
  { title: 'Amazon S3', value: 's3' },
  { title: 'SFTP Server', value: 'sftp' },
  { title: 'WebDAV', value: 'webdav' },
];

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
const s3Fields = [
  { key: 'region', label: 'AWS Region', type: 'text', placeholder: 'us-east-1' },
  { key: 'bucket', label: 'S3 Bucket Name', type: 'text', placeholder: 'my-backup-bucket' },
  { key: 'accessKeyId', label: 'Access Key ID', type: 'text', placeholder: 'AKIAIOSFODNN7EXAMPLE' },
  { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password', placeholder: '' },
  { key: 'prefix', label: 'Prefix (optional)', type: 'text', placeholder: 'backups/' },
];

const sftpFields = [
  { key: 'host', label: 'SFTP Host', type: 'text', placeholder: 'sftp.example.com' },
  { key: 'port', label: 'Port', type: 'number', placeholder: '22' },
  { key: 'username', label: 'Username', type: 'text', placeholder: '' },
  { key: 'password', label: 'Password', type: 'password', placeholder: '' },
  { key: 'remotePath', label: 'Remote Path', type: 'text', placeholder: '/backups' },
];

const webdavFields = [
  { key: 'url', label: 'WebDAV URL', type: 'text', placeholder: 'https://webdav.example.com' },
  { key: 'username', label: 'Username', type: 'text', placeholder: '' },
  { key: 'password', label: 'Password', type: 'password', placeholder: '' },
  { key: 'basePath', label: 'Base Path', type: 'text', placeholder: '/backups' },
];

const credentialFields = computed(() => {
  switch (newCredential.value.storageType) {
    case 's3':
      return s3Fields;
    case 'sftp':
      return sftpFields;
    case 'webdav':
      return webdavFields;
    default:
      return [];
  }
});

const openNewCredentialDialog = () => {
  editingCredential.value = null;
  newCredential.value = {
    name: '',
    storageType: 's3',
    credentials: {},
  };
  showCredentialDialog.value = true;
};

const openEditCredentialDialog = (credential: GetAllCredentials200ResponseResponseObjectInner) => {
  editingCredential.value = credential;
  newCredential.value = {
    name: credential.name,
    storageType: credential.storageType as 's3' | 'sftp' | 'webdav',
    credentials: {}, // Credentials cannot be retrieved for security
  };
  showCredentialDialog.value = true;
};

const saveCredential = async () => {
  if (!newCredential.value.name) {
    notifierStore.notify('Please provide a credential name', 'info');
    return;
  }

  // Validate required fields based on storage type
  const requiredFields = credentialFields.value.filter(f => !f.key.includes('optional'));
  const missingFields = requiredFields.filter(f => !newCredential.value.credentials[f.key]);
  
  if (missingFields.length > 0 && !editingCredential.value) {
    notifierStore.notify(`Please fill in all required fields`, 'info');
    return;
  }

  loading.value = true;
  try {
    if (editingCredential.value) {
      // For edit, only update if new credentials are provided
      const hasNewCredentials = Object.keys(newCredential.value.credentials).some(
        key => newCredential.value.credentials[key]
      );
      
      if (!hasNewCredentials) {
        notifierStore.notify('Please provide new credentials to update', 'info');
        loading.value = false;
        return;
      }
      
      // Delete old and create new (backend doesn't support update)
      await backupApi.deleteCredentials({ id: editingCredential.value.id });
      await backupApi.createCredentials({
        createCredentialsRequest: newCredential.value as CreateCredentialsRequest,
      });
      notifierStore.notify('Credentials updated successfully', 'success');
    } else {
      await backupApi.createCredentials({
        createCredentialsRequest: newCredential.value as CreateCredentialsRequest,
      });
      notifierStore.notify('Credentials saved successfully', 'success');
    }
    
    showCredentialDialog.value = false;
    emit('refresh');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save credentials';
    notifierStore.notify(message, 'error');
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
    emit('refresh');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete credential';
    notifierStore.notify(message, 'error');
    console.error('Error deleting credential:', error);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <v-card>
    <v-card-title>
      <div class="d-flex align-center w-100">
        <v-icon class="mr-2">mdi-key-chain</v-icon>
        <span>Storage Credentials</span>
        <v-spacer />
        <v-btn
          icon
          variant="text"
          size="small"
          @click="expanded = !expanded"
        >
          <v-icon>{{ expanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
        </v-btn>
      </div>
    </v-card-title>
    
    <v-expand-transition>
      <v-card-text v-show="expanded">
        <v-alert type="info" density="compact" class="mb-4">
          Credentials are required for remote storage (S3, SFTP, WebDAV). They are encrypted and stored securely.
        </v-alert>

        <div class="d-flex justify-end mb-3">
          <v-btn color="primary" @click="openNewCredentialDialog">
            <v-icon left>mdi-key-plus</v-icon>
            Add Credentials
          </v-btn>
        </div>

        <v-list v-if="props.credentials.length > 0">
          <v-list-item
            v-for="credential in props.credentials"
            :key="credential.id"
          >
            <template #prepend>
              <v-avatar color="primary" size="40">
                <v-icon>mdi-key</v-icon>
              </v-avatar>
            </template>

            <v-list-item-title>{{ credential.name }}</v-list-item-title>
            <v-list-item-subtitle>{{ credential.storageType.toUpperCase() }}</v-list-item-subtitle>

            <template #append>
              <v-btn
                icon="mdi-pencil"
                size="small"
                variant="text"
                @click="openEditCredentialDialog(credential)"
                title="Edit"
              />
              <v-btn
                icon="mdi-delete"
                size="small"
                variant="text"
                color="error"
                @click="deleteCredential(credential)"
                title="Delete"
              />
            </template>
          </v-list-item>
        </v-list>

        <v-alert v-else type="info" density="compact">
          No credentials configured. Local storage doesn't require credentials.
        </v-alert>
      </v-card-text>
    </v-expand-transition>

    <!-- Credential Dialog -->
    <v-dialog v-model="showCredentialDialog" max-width="600px" persistent>
      <v-card>
        <v-card-title>
          <span class="text-h5">{{ editingCredential ? 'Edit' : 'Add' }} Storage Credentials</span>
        </v-card-title>
        <v-card-text>
          <v-form>
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="newCredential.name"
                  label="Credential Name"
                  required
                  hint="A descriptive name for these credentials"
                  persistent-hint
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12">
                <v-select
                  v-model="newCredential.storageType"
                  :items="storageTypeOptions"
                  label="Storage Type"
                  :disabled="!!editingCredential"
                />
              </v-col>
            </v-row>

            <v-alert v-if="editingCredential" type="warning" density="compact" class="mb-4">
              For security reasons, existing credentials cannot be retrieved. Please provide new credentials to update.
            </v-alert>

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
                  :placeholder="field.placeholder"
                  :required="!field.key.includes('optional')"
                />
              </v-col>
            </v-row>

            <v-alert type="info" density="compact" class="mt-2">
              All credentials are encrypted using AES-256-GCM before storage and cannot be retrieved once saved.
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
            {{ editingCredential ? 'Update' : 'Save' }} Credentials
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<style scoped>
.v-list-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.v-list-item:last-child {
  border-bottom: none;
}
</style>
