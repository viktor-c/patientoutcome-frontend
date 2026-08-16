<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useNotifierStore } from '@/stores/notifierStore';
import { userDepartmentApi, checkUsernameAvailability as checkUsernameAvailabilityAPI } from '@/api';
import type { ApiUpdateUserRequest as UpdateUserRequest, ApiUserDepartment as UserDepartment } from '@/types';

const { t } = useI18n();
const router = useRouter();
const userStore = useUserStore();
const notifierStore = useNotifierStore();

const activeTab = ref('profile');
const loadingDepartments = ref(false);
const saving = ref(false);
const checkingUsername = ref(false);
const usernameAvailable = ref<boolean | null>(null);
const usernameCheckDebounce = ref<ReturnType<typeof setTimeout> | null>(null);

// Form data
const profileForm = ref({
  name: userStore.name || '',
  username: userStore.username || '',
  originalUsername: userStore.username || '',
  email: userStore.email || '',
  department: userStore.department || '',
  departmentName: '',
  belongsToCenter: userStore.belongsToCenter || [] as string[],
  belongsToCenterName: '',
});

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const consultationForm = ref({
  consultationAccessDaysBefore: userStore.consultationAccessDaysBefore || 3,
  consultationAccessDaysAfter: userStore.consultationAccessDaysAfter || 30,
  daysBeforeConsultations: userStore.daysBeforeConsultations || 7,
});

const departments = ref<UserDepartment[]>([]);
const centers = ref<UserDepartment[]>([]);

// Validation
const MIN_DAYS = 0;
const MAX_DAYS = 365;
const MIN_USERNAME_LENGTH = 5;

const profileValid = computed(() => {
  return (
    profileForm.value.name.trim().length > 0 &&
    profileForm.value.username.trim().length >= MIN_USERNAME_LENGTH &&
    profileForm.value.email.trim().length > 0 &&
    profileForm.value.email.includes('@') &&
    (profileForm.value.username === profileForm.value.originalUsername || usernameAvailable.value === true)
  );
});

const passwordValid = computed(() => {
  return (
    passwordForm.value.currentPassword.length >= 6 &&
    passwordForm.value.newPassword.length >= 6 &&
    passwordForm.value.newPassword === passwordForm.value.confirmPassword
  );
});

const consultationValid = computed(() => {
  const daysBefore = Number(consultationForm.value.consultationAccessDaysBefore);
  const daysAfter = Number(consultationForm.value.consultationAccessDaysAfter);
  const daysBeforeConsultations = Number(consultationForm.value.daysBeforeConsultations);

  return (
    Number.isInteger(daysBefore) && daysBefore >= MIN_DAYS && daysBefore <= MAX_DAYS &&
    Number.isInteger(daysAfter) && daysAfter >= MIN_DAYS && daysAfter <= MAX_DAYS &&
    Number.isInteger(daysBeforeConsultations) && daysBeforeConsultations >= MIN_DAYS && daysBeforeConsultations <= MAX_DAYS
  );
});

const usernameError = computed(() => {
  if (profileForm.value.username.length === 0) return '';
  if (profileForm.value.username.length < MIN_USERNAME_LENGTH) {
    return t('userSettings.usernameMinLength', { min: MIN_USERNAME_LENGTH });
  }
  if (profileForm.value.username === profileForm.value.originalUsername) {
    return '';
  }
  if (checkingUsername.value) {
    return t('userSettings.checkingUsername');
  }
  if (usernameAvailable.value === false) {
    return t('userSettings.usernameUnavailable');
  }
  if (usernameAvailable.value === true) {
    return t('userSettings.usernameAvailable');
  }
  return '';
});

const usernameErrorColor = computed(() => {
  if (usernameAvailable.value === true) return 'success';
  if (usernameAvailable.value === false) return 'error';
  return undefined;
});

// Watch username changes
watch(() => profileForm.value.username, (newUsername) => {
  if (newUsername === profileForm.value.originalUsername) {
    usernameAvailable.value = null;
    return;
  }

  if (newUsername.length < MIN_USERNAME_LENGTH) {
    usernameAvailable.value = null;
    return;
  }

  // Debounce username check
  if (usernameCheckDebounce.value) {
    clearTimeout(usernameCheckDebounce.value);
  }

  usernameCheckDebounce.value = setTimeout(async () => {
    await checkUsernameAvailability(newUsername);
  }, 500);
});

// Fetch department and center information
const fetchDepartmentData = async () => {
  loadingDepartments.value = true;
  try {
    const response = await userDepartmentApi.getAllDepartments();
    if (response.success && response.responseObject) {
      departments.value = response.responseObject;
      centers.value = response.responseObject.filter(d => d.departmentType === 'center');

      // Find and set department name
      if (profileForm.value.department) {
        const dept = Array.isArray(profileForm.value.department)
          ? profileForm.value.department[0]
          : profileForm.value.department;

        const foundDept = departments.value.find(d => d.id === dept);
        if (foundDept) {
          profileForm.value.departmentName = foundDept.name;
        }
      }

      // Find and set center name
      if (profileForm.value.belongsToCenter) {
        const centerId = Array.isArray(profileForm.value.belongsToCenter)
          ? profileForm.value.belongsToCenter[0]
          : profileForm.value.belongsToCenter;

        const foundCenter = centers.value.find(c => c.id === centerId);
        if (foundCenter) {
          profileForm.value.belongsToCenterName = foundCenter.name;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching departments:', error);
  } finally {
    loadingDepartments.value = false;
  }
};

const checkUsernameAvailability = async (username: string) => {
  checkingUsername.value = true;
  try {
    const response = await checkUsernameAvailabilityAPI(username);
    if (response.success && response.responseObject) {
      usernameAvailable.value = response.responseObject.available;
    }
  } catch (error) {
    console.error('Error checking username availability:', error);
    usernameAvailable.value = null;
  } finally {
    checkingUsername.value = false;
  }
};

const saveProfile = async () => {
  if (!profileValid.value) return;

  saving.value = true;
  try {
    const payload: UpdateUserRequest = {
      name: profileForm.value.name,
      username: profileForm.value.username,
      email: profileForm.value.email,
      department: Array.isArray(profileForm.value.department)
        ? profileForm.value.department
        : [profileForm.value.department],
      belongsToCenter: (Array.isArray(profileForm.value.belongsToCenter)
        ? profileForm.value.belongsToCenter[0]
        : profileForm.value.belongsToCenter) || undefined,
    };

    await userStore.updateUser(payload);
    profileForm.value.originalUsername = profileForm.value.username;
    usernameAvailable.value = null;
  } catch (error: any) {
    console.error('Error saving profile:', error);
    // Show error notification
  } finally {
    saving.value = false;
  }
};

const savePassword = async () => {
  if (!passwordValid.value) return;

  saving.value = true;
  try {
    await userStore.changePassword(
      passwordForm.value.currentPassword,
      passwordForm.value.newPassword,
      passwordForm.value.confirmPassword
    );

    notifierStore.notify(t('userSettings.passwordChanged'), 'success');
    activeTab.value = 'profile';

    // Clear password form
    passwordForm.value.currentPassword = '';
    passwordForm.value.newPassword = '';
    passwordForm.value.confirmPassword = '';
  } catch (error: any) {
    console.error('Error changing password:', error);
    notifierStore.notify(t('changePassword.error_api'), 'error');
  } finally {
    saving.value = false;
  }
};

const saveConsultationSettings = async () => {
  if (!consultationValid.value) return;

  saving.value = true;
  try {
    const payload: UpdateUserRequest = {
      consultationAccessDaysBefore: Number(consultationForm.value.consultationAccessDaysBefore),
      consultationAccessDaysAfter: Number(consultationForm.value.consultationAccessDaysAfter),
      daysBeforeConsultations: Number(consultationForm.value.daysBeforeConsultations),
    };

    await userStore.updateUser(payload);
  } catch (error: any) {
    console.error('Error saving consultation settings:', error);
    // Show error notification
  } finally {
    saving.value = false;
  }
};

const goBack = () => {
  router.push('/dashboard');
};

onMounted(() => {
  fetchDepartmentData();
});
</script>

<template>
  <v-container class="user-settings-view" id="user-settings-view">
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-btn icon @click="goBack" class="mr-2">
              <v-icon>mdi-arrow-left</v-icon>
            </v-btn>
            {{ t('userSettings.title') }}
          </v-card-title>

          <v-tabs v-model="activeTab" id="user-settings-tabs">
            <v-tab value="profile" id="user-settings-tab-profile">
              <v-icon start>mdi-account</v-icon>
              {{ t('userSettings.tabs.profile') }}
            </v-tab>
            <v-tab value="password" id="user-settings-tab-password">
              <v-icon start>mdi-lock</v-icon>
              {{ t('userSettings.tabs.password') }}
            </v-tab>
            <v-tab value="consultation" id="user-settings-tab-consultation">
              <v-icon start>mdi-calendar-clock</v-icon>
              {{ t('userSettings.tabs.consultation') }}
            </v-tab>
          </v-tabs>

          <v-card-text>
            <v-window v-model="activeTab">
              <!-- Profile Tab -->
              <v-window-item value="profile">
                <v-form id="user-settings-profile-form">
                  <v-text-field
                    v-model="profileForm.name"
                    :label="t('userSettings.fields.name')"
                    :rules="[(v: string) => !!v || t('validation.required')]"
                    id="user-settings-profile-name"
                    class="mb-4"
                  />

                  <v-text-field
                    v-model="profileForm.username"
                    :label="t('userSettings.fields.username')"
                    :rules="[(v: string) => v.length >= MIN_USERNAME_LENGTH || t('userSettings.usernameMinLength', { min: MIN_USERNAME_LENGTH })]"
                    :error-messages="usernameError"
                    :color="usernameErrorColor"
                    :loading="checkingUsername"
                    id="user-settings-profile-username"
                    class="mb-4"
                  >
                    <template v-slot:append-inner v-if="usernameAvailable === true">
                      <v-icon color="success">mdi-check-circle</v-icon>
                    </template>
                    <template v-slot:append-inner v-else-if="usernameAvailable === false">
                      <v-icon color="error">mdi-close-circle</v-icon>
                    </template>
                  </v-text-field>

                  <v-text-field
                    v-model="profileForm.email"
                    :label="t('userSettings.fields.email')"
                    type="email"
                    :rules="[
                      (v: string) => !!v || t('validation.required'),
                      (v: string) => v.includes('@') || t('validation.email')
                    ]"
                    id="user-settings-profile-email"
                    class="mb-4"
                  />

                  <v-text-field
                    v-model="profileForm.departmentName"
                    :label="t('userSettings.fields.department')"
                    readonly
                    :loading="loadingDepartments"
                    :hint="t('userSettings.fields.departmentReadOnly')"
                    persistent-hint
                    id="user-settings-profile-department"
                    class="mb-4"
                  />

                  <v-text-field
                    v-model="profileForm.belongsToCenterName"
                    :label="t('userSettings.fields.center')"
                    readonly
                    :loading="loadingDepartments"
                    :hint="t('userSettings.fields.centerReadOnly')"
                    persistent-hint
                    id="user-settings-profile-center"
                    class="mb-4"
                  />

                  <v-btn
                    color="primary"
                    @click="saveProfile"
                    :disabled="!profileValid || saving"
                    :loading="saving"
                    id="user-settings-profile-save"
                  >
                    {{ t('common.save') }}
                  </v-btn>
                </v-form>
              </v-window-item>

              <!-- Password Tab -->
              <v-window-item value="password">
                <v-form id="user-settings-password-form">
                  <v-text-field
                    v-model="passwordForm.currentPassword"
                    :label="t('userSettings.fields.currentPassword')"
                    type="password"
                    :rules="[(v: string) => v.length >= 6 || t('userSettings.passwordMinLength')]"
                    id="user-settings-password-current"
                    class="mb-4"
                  />

                  <v-text-field
                    v-model="passwordForm.newPassword"
                    :label="t('userSettings.fields.newPassword')"
                    type="password"
                    :rules="[(v: string) => v.length >= 6 || t('userSettings.passwordMinLength')]"
                    id="user-settings-password-new"
                    class="mb-4"
                  />

                  <v-text-field
                    v-model="passwordForm.confirmPassword"
                    :label="t('userSettings.fields.confirmPassword')"
                    type="password"
                    :rules="[
                      (v: string) => v.length >= 6 || t('userSettings.passwordMinLength'),
                      (v: string) => v === passwordForm.newPassword || t('userSettings.passwordsDoNotMatch')
                    ]"
                    id="user-settings-password-confirm"
                    class="mb-4"
                  />

                  <v-btn
                    color="primary"
                    @click="savePassword"
                    :disabled="!passwordValid || saving"
                    :loading="saving"
                    id="user-settings-password-save"
                  >
                    {{ t('userSettings.changePassword') }}
                  </v-btn>
                </v-form>
              </v-window-item>

              <!-- Consultation Tab -->
              <v-window-item value="consultation">
                <v-form id="user-settings-consultation-form">
                  <v-text-field
                    v-model.number="consultationForm.consultationAccessDaysBefore"
                    :label="t('userSettings.fields.consultationAccessDaysBefore')"
                    type="number"
                    :hint="t('userSettings.fields.consultationAccessDaysBeforeHint')"
                    persistent-hint
                    :min="MIN_DAYS"
                    :max="MAX_DAYS"
                    id="user-settings-consultation-days-before"
                    class="mb-4"
                  />

                  <v-text-field
                    v-model.number="consultationForm.consultationAccessDaysAfter"
                    :label="t('userSettings.fields.consultationAccessDaysAfter')"
                    type="number"
                    :hint="t('userSettings.fields.consultationAccessDaysAfterHint')"
                    persistent-hint
                    :min="MIN_DAYS"
                    :max="MAX_DAYS"
                    id="user-settings-consultation-days-after"
                    class="mb-4"
                  />

                  <v-text-field
                    v-model.number="consultationForm.daysBeforeConsultations"
                    :label="t('userSettings.fields.daysBeforeConsultations')"
                    type="number"
                    :hint="t('userSettings.fields.daysBeforeConsultationsHint')"
                    persistent-hint
                    :min="MIN_DAYS"
                    :max="MAX_DAYS"
                    id="user-settings-consultation-days-before-consultations"
                    class="mb-4"
                  />

                  <v-btn
                    color="primary"
                    @click="saveConsultationSettings"
                    :disabled="!consultationValid || saving"
                    :loading="saving"
                    id="user-settings-consultation-save"
                  >
                    {{ t('common.save') }}
                  </v-btn>
                </v-form>
              </v-window-item>
            </v-window>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.user-settings-view {
  max-width: 900px;
  margin: 0 auto;
  padding-top: 2rem;
}
</style>
