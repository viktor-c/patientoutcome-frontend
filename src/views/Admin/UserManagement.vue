<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useNotifierStore } from '@/stores/';
import { userApi, userDepartmentApi } from '@/api';
import type { UpdateUserByIdRequest } from '@/api/models/UpdateUserByIdRequest';
import { useUserStore } from '@/stores/userStore';
import type { GetUsers200ResponseResponseObjectInner } from '@/api/models/GetUsers200ResponseResponseObjectInner';
import type { UserDepartment } from '@/api/models/UserDepartment';
import EditUserDialog from '@/components/dialogs/EditUserDialog.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const notifierStore = useNotifierStore();
const users = ref<GetUsers200ResponseResponseObjectInner[]>([]);
const loading = ref(false);
const search = ref('');
const showEditDialog = ref(false);
const selectedUser = ref<GetUsers200ResponseResponseObjectInner | null>(null);
const showDeleteConfirm = ref(false);
const userToDelete = ref<GetUsers200ResponseResponseObjectInner | null>(null);
const departments = ref<UserDepartment[]>([]);

const headers = [
  { title: 'Username', key: 'username', sortable: true },
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Email', key: 'email', sortable: true },
  { title: 'Department', key: 'department', sortable: true },
  { title: 'Roles', key: 'roles', sortable: false },
  { title: 'Last Login', key: 'lastLogin', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false },
];

const loadUsers = async () => {
  loading.value = true;
  try {
    const response = await userApi.getUsers();
    if (response.responseObject) {
      users.value = response.responseObject;
    }
  } catch (error) {
    notifierStore.notify(t('userManagement.loadError'), 'error');
    console.error('Error loading users:', error);
  } finally {
    loading.value = false;
  }
};

const loadDepartments = async () => {
  try {
    const response = await userDepartmentApi.getAllDepartments();
    if (response.success && response.responseObject) {
      departments.value = response.responseObject;
    }
  } catch (error) {
    console.error('Error loading departments:', error);
  }
};

const cloneUser = (user: GetUsers200ResponseResponseObjectInner) => {
  // Use structuredClone where available for deep cloning, otherwise fall back to JSON clone
  // We only do this to avoid mutating objects referenced by the data table through Vue reactivity.
  try {
    // Use structuredClone if available for deep clone
    if (typeof structuredClone === 'function') return structuredClone(user);
  } catch (e) {
    // ignore
  }
  return JSON.parse(JSON.stringify(user));
};

const editUser = (user: GetUsers200ResponseResponseObjectInner) => {
  selectedUser.value = cloneUser(user);
  showEditDialog.value = true;
};

const userStore = useUserStore();

const saveUser = async (updatedUser: GetUsers200ResponseResponseObjectInner) => {
  console.debug('UserManagement.saveUser: updating user', updatedUser?.username, 'as admin', userStore.username);
  try {
    // Build the update payload
    const updatePayload: UpdateUserByIdRequest & { roles?: string[], password?: string } = {
      name: updatedUser.name,
      email: updatedUser.email,
      department: updatedUser.department,
      roles: updatedUser.roles,
      belongsToCenter: updatedUser.belongsToCenter,
      ...(updatedUser.password && { password: updatedUser.password }),
    };

    // Use ID-based endpoint if available (for targeted user updates)
    // The ID field comes from MongoDB's _id field in the API response
    if (updatedUser.id) {
      console.debug('UserManagement.saveUser: using ID-based update for user', updatedUser.id);
      await userApi.updateUserById({ id: updatedUser.id, updateUserByIdRequest: updatePayload });
    } else {
      // User updating their own profile
      console.debug('UserManagement.saveUser: updating own profile');
      await userApi.updateUser({
        updateUserByIdRequest: updatePayload,
      });
    }
    console.debug('UserManagement.saveUser: updateUser response complete for', updatedUser?.username);
    notifierStore.notify(t('userManagement.updateSuccess'), 'success');
    await loadUsers();
    // close the dialog and clear the selected user to avoid keeping a reference
    showEditDialog.value = false;
    selectedUser.value = null;
  } catch (error) {
    notifierStore.notify(t('userManagement.updateError'), 'error');
    console.error('Error updating user:', error);
  }
};

const confirmDelete = (user: GetUsers200ResponseResponseObjectInner) => {
  // Check if user being deleted is the logged-in user
  if (user.username === userStore.username) {
    // Check if user is an admin
    if (user.roles?.includes('admin')) {
      // Count total admins
      const adminCount = users.value.filter(u => u.roles?.includes('admin')).length;
      if (adminCount === 1) {
        notifierStore.notify(t('userManagement.cannotDeleteLastAdmin'), 'error');
        return;
      }
    }
  }
  
  userToDelete.value = user;
  showDeleteConfirm.value = true;
};

const deleteUser = async () => {
  if (!userToDelete.value) return;

  try {
    await userApi.deleteUser({ username: userToDelete.value.username });
    notifierStore.notify(t('userManagement.deleteSuccess'), 'success');
    showDeleteConfirm.value = false;
    userToDelete.value = null;
    await loadUsers();
  } catch (error) {
    notifierStore.notify(t('userManagement.deleteError'), 'error');
    console.error('Error deleting user:', error);
  }
};

const formatDate = (date: Date | undefined) => {
  if (!date) return 'Never';
  return new Date(date).toLocaleDateString();
};

const getDepartmentName = (departmentId: string) => {
  const dept = departments.value.find(d => d.id === departmentId);
  return dept?.name || departmentId;
};

onMounted(() => {
  loadUsers();
  loadDepartments();
});

// Clear selectedUser when the edit dialog closes (either cancelled or closed)
watch(showEditDialog, (isShown) => {
  if (!isShown) {
    selectedUser.value = null;
  }
});
</script>

<template>
  <v-container fluid class="pa-0">
    <v-row class="pa-0 ma-0">
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center mb-2">
          <h1 class="text-h4">User Management</h1>
        </div>
        <v-card>
          <v-card-title>
            <v-row class="align-start" style="width:100%">
              <v-col cols="10">
                <v-text-field
                              v-model="search"
                              aria-label="search-input"
                              label="Search users"
                              prepend-inner-icon="mdi-magnify"
                              variant="outlined"
                              q density="compact"
                              hide-details
                              class="mb-4" />
              </v-col>
              <v-col cols="2" class="d-flex justify-end align-start">
                <v-btn
                       color="primary"
                       prepend-icon="mdi-plus"
                       @click="() => notifierStore.notify('Add user functionality coming soon', 'info')"
                       class="ml-2">
                  Add User
                </v-btn>
              </v-col>
            </v-row>
          </v-card-title>

          <v-data-table
                        :headers="headers"
                        :items="users"
                        :search="search"
                        :loading="loading"
                        item-value="id"
                        class="elevation-1"
                        hover
                        @click:row="(_event: any, { item }: any) => editUser(item)">
            <template #[`item.roles`]="{ item }">
              <v-chip
                      v-for="role in item.roles"
                      :key="role"
                      size="small"
                      class="ma-1"
                      :color="getRoleColor(role)">
                {{ role }}
              </v-chip>
            </template>

            <template #[`item.lastLogin`]="{ item }">
              {{ formatDate(item.lastLogin) }}
            </template>

            <template #[`item.department`]="{ item }">
              {{ getDepartmentName(item.department) }}
            </template>

            <template #[`item.actions`]="{ item }">
              <v-btn
                     icon="mdi-pencil"
                     size="small"
                     variant="text"
                     @click.stop="editUser(item)" />
              <v-btn
                     icon="mdi-delete"
                     size="small"
                     variant="text"
                     color="error"
                     @click.stop="confirmDelete(item)" />
            </template>

            <template #loading>
              <v-skeleton-loader type="table-row@10" />
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <!-- Edit User Dialog -->
    <EditUserDialog
                    v-model:show="showEditDialog"
                    :user="selectedUser"
                    @save="saveUser" />

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteConfirm" max-width="500">
      <v-card>
        <v-card-title class="text-h5">
          {{ t('userManagement.confirmDelete') }}
        </v-card-title>
        <v-card-text>
          {{ t('userManagement.deleteWarning', { username: userToDelete?.username }) }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="grey" @click="showDeleteConfirm = false">
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn color="error" @click="deleteUser">
            {{ t('common.delete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts">
function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    admin: 'red',
    doctor: 'blue',
    mfa: 'green',
    kiosk: 'purple',
    developer: 'orange',
  };
  return colors[role] || 'grey';
}
</script>

<style scoped>
.v-data-table {
  background: transparent;
}
</style>
