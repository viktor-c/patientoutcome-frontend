<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useNotifierStore } from '@/stores/';
import { userApi, userDepartmentApi } from '@/api';
import { useUserStore } from '@/stores/userStore';
import type { ApiUpdateUserRequest as UpdateUserRequest, ApiUserResponse, ApiUserDepartment as UserDepartment } from '@/types';
import EditUserDialog from '@/components/dialogs/EditUserDialog.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const notifierStore = useNotifierStore();
const users = ref<ApiUserResponse[]>([]);
const loading = ref(false);
const search = ref('');
const showEditDialog = ref(false);
const selectedUser = ref<ApiUserResponse | null>(null);
const showDeleteConfirm = ref(false);
const userToDelete = ref<ApiUserResponse | null>(null);
const departments = ref<UserDepartment[]>([]);
const showAddDialog = ref(false);
const creatingUser = ref(false);
const showAddUserPassword = ref(false);
const addUserForm = ref({
  username: '',
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  departmentId: '',
  belongsToCenter: '',
  role: 'doctor',
});

const headers = [
  { title: 'Username', key: 'username', sortable: true },
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Email', key: 'email', sortable: true },
  { title: 'Department', key: 'department', sortable: true },
  { title: 'Roles', key: 'roles', sortable: false },
  { title: 'Last Login', key: 'lastLogin', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false },
];

const availableRoles = ['admin', 'doctor', 'mfa', 'kiosk', 'developer'];

const departmentOptions = computed(() => {
  return departments.value
    .filter((dept) => dept.departmentType !== 'center')
    .map((dept) => ({
      title: dept.name,
      value: dept.id || '',
    }));
});

const centerOptions = computed(() => {
  return departments.value
    .filter((dept) => dept.departmentType === 'center')
    .map((dept) => ({
      title: dept.name,
      value: dept.id || '',
    }));
});

const isAddFormValid = computed(() => {
  return (
    addUserForm.value.username.trim().length >= 3
    && addUserForm.value.name.trim().length >= 3
    && /.+@.+\..+/.test(addUserForm.value.email)
    && addUserForm.value.password.length >= 6
    && addUserForm.value.confirmPassword.length >= 6
    && addUserForm.value.password === addUserForm.value.confirmPassword
    && addUserForm.value.departmentId.length > 0
    && addUserForm.value.role.length > 0
  );
});

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

const cloneUser = (user: ApiUserResponse) => {
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

const editUser = (user: ApiUserResponse) => {
  selectedUser.value = cloneUser(user);
  showEditDialog.value = true;
};

const resetAddUserForm = () => {
  addUserForm.value = {
    username: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    departmentId: '',
    belongsToCenter: '',
    role: 'doctor',
  };
  showAddUserPassword.value = false;
};

const openAddUserDialog = () => {
  resetAddUserForm();
  showAddDialog.value = true;
};

const createUser = async () => {
  if (!isAddFormValid.value) {
    notifierStore.notify(t('userManagement.createValidationError'), 'error');
    return;
  }

  const usernameExists = users.value.some(
    user => user.username.toLowerCase() === addUserForm.value.username.trim().toLowerCase(),
  );
  if (usernameExists) {
    notifierStore.notify(t('userManagement.createUsernameExists'), 'error');
    return;
  }

  creatingUser.value = true;
  try {
    const codeResponse = await userApi.batchCreateRegistrationCodes({
      batchCreateRegistrationCodesRequest: {
        roles: [{ role: addUserForm.value.role, count: 1 }],
        department: [addUserForm.value.departmentId],
        ...(addUserForm.value.belongsToCenter
          ? { belongsToCenter: addUserForm.value.belongsToCenter }
          : {}),
        expiryType: 'years',
        expiryValue: 1,
      },
    });

    const createdCodes = codeResponse.responseObject || {};
    const primaryRoleCodes = createdCodes[addUserForm.value.role] || [];
    const registrationCode = primaryRoleCodes[0]
      || Object.values(createdCodes)[0]?.[0]
      || '';

    if (!registrationCode) {
      throw new Error('No registration code returned from server');
    }

    await userApi.registerUser({
      registerUserRequest: {
        username: addUserForm.value.username.trim(),
        name: addUserForm.value.name.trim(),
        email: addUserForm.value.email.trim(),
        password: addUserForm.value.password,
        confirmPassword: addUserForm.value.confirmPassword,
        registrationCode,
      },
    });

    notifierStore.notify(t('userManagement.createSuccess'), 'success');
    showAddDialog.value = false;
    resetAddUserForm();
    await loadUsers();
  } catch (error) {
    notifierStore.notify(t('userManagement.createError'), 'error');
    console.error('Error creating user:', error);
  } finally {
    creatingUser.value = false;
  }
};

const userStore = useUserStore();

const saveUser = async (updatedUser: ApiUserResponse) => {
  console.debug('UserManagement.saveUser: updating user', updatedUser?.username, 'as admin', userStore.username);

  // User must have an id to be updated
  if (!updatedUser.id) {
    notifierStore.notify(t('userManagement.updateError'), 'error');
    console.error('Error updating user: User ID is missing');
    return;
  }

  try {
    // Build the update payload
    // The backend API now expects the id field in the JSON payload
    const updatePayload: UpdateUserRequest & { id?: string | null, roles?: string[], password?: string } = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      department: updatedUser.department,
      roles: updatedUser.roles,
      belongsToCenter: updatedUser.belongsToCenter,
      ...((updatedUser as unknown as { password?: string }).password && { password: (updatedUser as unknown as { password?: string }).password }),
    };

    console.debug('UserManagement.saveUser: updatePayload prepared for', updatedUser?.username, updatePayload);
    // Use the standard update endpoint
    await userApi.updateUser({
      updateUserRequest: updatePayload,
    });

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

const confirmDelete = (user: ApiUserResponse) => {
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

const getDepartmentName = (departmentIds: string | string[]) => {
  const departmentId = Array.isArray(departmentIds) ? departmentIds[0] : departmentIds;
  if (!departmentId) return 'N/A';
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
                              aria-label="user-search-input"
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
                    @click="openAddUserDialog"
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
                    :departments="departments"
                    @save="saveUser" />

    <!-- Add User Dialog -->
    <v-dialog v-model="showAddDialog" max-width="650">
      <v-card>
        <v-card-title class="text-h5">
          {{ t('userManagement.addUser') }}
        </v-card-title>
        <v-card-text>
          <v-text-field
                        v-model="addUserForm.username"
                        :label="t('register.username')"
                        class="mb-2"
                        variant="outlined"
                        density="compact" />
          <v-text-field
                        v-model="addUserForm.name"
                        :label="t('register.name')"
                        class="mb-2"
                        variant="outlined"
                        density="compact" />
          <v-text-field
                        v-model="addUserForm.email"
                        :label="t('register.email')"
                        class="mb-2"
                        variant="outlined"
                        density="compact" />
          <v-select
                    v-model="addUserForm.departmentId"
                    :items="departmentOptions"
                    :label="t('batchUserCreation.department')"
                    item-title="title"
                    item-value="value"
                    class="mb-2"
                    variant="outlined"
                    density="compact" />
          <v-select
                    v-model="addUserForm.belongsToCenter"
                    :items="centerOptions"
                    :label="t('batchUserCreation.centers')"
                    item-title="title"
                    item-value="value"
                    clearable
                    class="mb-2"
                    variant="outlined"
                    density="compact" />
          <v-select
                    v-model="addUserForm.role"
                    :items="availableRoles"
                    :label="t('batchUserCreation.roleConfiguration')"
                    class="mb-2"
                    variant="outlined"
                    density="compact" />
          <v-text-field
                        v-model="addUserForm.password"
                        :label="t('register.password')"
                        :type="showAddUserPassword ? 'text' : 'password'"
                        class="mb-2"
                        variant="outlined"
                        density="compact">
            <template #append-inner>
              <v-icon
                      style="cursor: pointer"
                      @mousedown.prevent="showAddUserPassword = true"
                      @mouseup="showAddUserPassword = false"
                      @mouseleave="showAddUserPassword = false">
                {{ showAddUserPassword ? 'mdi-eye' : 'mdi-eye-off' }}
              </v-icon>
            </template>
          </v-text-field>
          <v-text-field
                        v-model="addUserForm.confirmPassword"
                        :label="t('register.confirmPassword')"
                        :type="showAddUserPassword ? 'text' : 'password'"
                        :error="addUserForm.password !== addUserForm.confirmPassword && addUserForm.confirmPassword.length > 0"
                        :error-messages="addUserForm.password !== addUserForm.confirmPassword && addUserForm.confirmPassword.length > 0 ? t('register.passwordMismatch') : []"
                        class="mb-2"
                        variant="outlined"
                        density="compact" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="grey" @click="showAddDialog = false" :disabled="creatingUser">
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn color="primary" @click="createUser" :loading="creatingUser" :disabled="!isAddFormValid">
            {{ t('buttons.create') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
