<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import ChangePasswordDialog from './ChangePasswordDialog.vue';
import { useUserStore } from '@/stores/userStore';
import { userDepartmentApi } from '@/api';
import type { UpdateUserRequest } from '@/api/models/UpdateUserRequest';
import type { UserDepartment } from '@/api';

const { t } = useI18n();

const show = defineModel<boolean>('show');

const showPasswordDialog = ref(false);
const userStore = useUserStore();
const departments = ref<UserDepartment[]>([]);
const centers = ref<UserDepartment[]>([]);
const loadingDepartments = ref(false);

const MIN_DAYS = 0
const MAX_DAYS = 365

const user = ref({
  name: userStore.username || '',
  username: userStore.username || '',
  email: userStore.email || '',
  department: userStore.department || '',
  departmentName: '',
  belongsToCenter: userStore.belongsToCenter || [] as string[],
  belongsToCenterName: '',
  centerOptions: [] as string[],
  // editable local copy of the per-user setting
  daysBeforeConsultations: Number(userStore.daysBeforeConsultations || 7),
});

const daysValid = computed(() => {
  const v = Number(user.value.daysBeforeConsultations)
  return Number.isInteger(v) && v >= MIN_DAYS && v <= MAX_DAYS
})

// Fetch department and center information
const fetchDepartmentData = async () => {
  loadingDepartments.value = true;
  try {
    const response = await userDepartmentApi.getAllDepartments();
    if (response.success && response.responseObject) {
      departments.value = response.responseObject;
      centers.value = response.responseObject.filter(d => d.departmentType === 'center');

      // Find and set department name
      if (user.value.department) {
        const dept = Array.isArray(user.value.department) 
          ? user.value.department[0] 
          : user.value.department;
        
        const foundDept = departments.value.find(d => d.id === dept);
        if (foundDept) {
          user.value.departmentName = foundDept.name;
        }
      }

      // Find and set center name
      if (user.value.belongsToCenter) {
        const centerId = Array.isArray(user.value.belongsToCenter) 
          ? user.value.belongsToCenter[0] 
          : user.value.belongsToCenter;
        
        const foundCenter = centers.value.find(c => c.id === centerId);
        if (foundCenter) {
          user.value.belongsToCenterName = foundCenter.name;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching departments:', error);
  } finally {
    loadingDepartments.value = false;
  }
};

// Watch for dialog open
onMounted(() => {
  if (show.value) {
    fetchDepartmentData();
  }
});

function openPasswordDialog() {
  showPasswordDialog.value = true;
}
function closePasswordDialog() {
  showPasswordDialog.value = false;
}

async function save() {
  if (!user.value) return;
  // validate days setting before saving
  if (!daysValid.value) {
    // show a simple console warning; caller UI could show a toast instead
    console.warn(`daysBeforeConsultations must be between ${MIN_DAYS} and ${MAX_DAYS}`)
    return
  }
  try {
    const payload: UpdateUserRequest = {
      name: user.value.name,
      email: user.value.email,
      department: Array.isArray(user.value.department) ? user.value.department : [user.value.department],
      belongsToCenter: (Array.isArray(user.value.belongsToCenter) ? user.value.belongsToCenter[0] : user.value.belongsToCenter) || undefined,
      // include the new setting so it's persisted server-side
      daysBeforeConsultations: Number(user.value.daysBeforeConsultations || 7),
    };

    await userStore.updateUser(payload);
    // persist the local setting into the localStorage-backed store
    userStore.daysBeforeConsultations = Number(user.value.daysBeforeConsultations || 7)
    show.value = false;
  } catch {
    // handle error, e.g. show notification
  }
}
</script>

<template>
  <v-dialog v-model="show" max-width="600" @update:model-value="(val) => val && fetchDepartmentData()">
    <v-card>
      <v-card-title>{{ t('editUserSettings.title') }}</v-card-title>
      <v-card-text>
        <v-text-field v-if="user" v-model="user.name" :label="t('editUserSettings.name')" />
        <v-text-field v-if="user" v-model="user.username" :label="t('editUserSettings.username')" />
        <v-text-field v-if="user" v-model="user.email" :label="t('editUserSettings.email')" />
        <v-text-field 
          v-if="user" 
          v-model="user.departmentName" 
          :label="t('editUserSettings.department')" 
          readonly
          :loading="loadingDepartments"
          :hint="t('editUserSettings.departmentReadOnly')"
          persistent-hint
        />
        <v-text-field 
          v-if="user" 
          v-model="user.belongsToCenterName" 
          :label="t('editUserSettings.belongsToCenter')" 
          readonly
          :loading="loadingDepartments"
          :hint="t('editUserSettings.centerReadOnly')"
          persistent-hint
        />
        <v-text-field
                      v-if="user"
                      type="number"
                      v-model.number="user.daysBeforeConsultations"
                      :label="t('editUserSettings.daysBeforeConsultations')"
                      hint="Number of days to look back for consultations"
                      min="0" />
        <v-btn @click="openPasswordDialog" color="primary" class="mt-4">
          {{ t('editUserSettings.changePassword') }}
        </v-btn>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="() => (show = false)">{{ t('common.cancel') }}</v-btn>
        <v-btn color="primary" @click="save">{{ t('common.save') }}</v-btn>
      </v-card-actions>
    </v-card>
    <ChangePasswordDialog v-model:show="showPasswordDialog" @close="closePasswordDialog" />
  </v-dialog>
</template>

<style scoped></style>
