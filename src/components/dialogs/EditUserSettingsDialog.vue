<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import ChangePasswordDialog from './ChangePasswordDialog.vue';
import { useUserStore } from '@/stores/userStore';
import type { UpdateUserByIdRequest } from '@/api/models/UpdateUserByIdRequest';

const { t } = useI18n();

const show = defineModel<boolean>('show');

const showPasswordDialog = ref(false);
const userStore = useUserStore();

const MIN_DAYS = 0
const MAX_DAYS = 365

const user = ref({
  name: userStore.username || '',
  username: userStore.username || '',
  email: userStore.email || '',
  department: userStore.department || '',
  belongsToCenter: userStore.belongsToCenter || [] as string[],
  centerOptions: [] as string[],
  // editable local copy of the per-user setting
  daysBeforeConsultations: Number(userStore.daysBeforeConsultations || 7),
});

const daysValid = computed(() => {
  const v = Number(user.value.daysBeforeConsultations)
  return Number.isInteger(v) && v >= MIN_DAYS && v <= MAX_DAYS
})


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
    const payload: UpdateUserByIdRequest = {
      name: user.value.name,
      email: user.value.email,
      department: user.value.department,
      belongsToCenter: user.value.belongsToCenter,
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
  <v-dialog v-model="show" max-width="600">
    <v-card>
      <v-card-title>{{ t('editUserSettings.title') }}</v-card-title>
      <v-card-text>
        <v-text-field v-if="user" v-model="user.name" :label="t('editUserSettings.name')" />
        <v-text-field v-if="user" v-model="user.username" :label="t('editUserSettings.username')" />
        <v-text-field v-if="user" v-model="user.email" :label="t('editUserSettings.email')" />
        <v-text-field v-if="user" v-model="user.department" :label="t('editUserSettings.department')" />
        <v-select
                  v-if="user"
                  v-model="user.belongsToCenter"
                  :items="user.centerOptions"
                  :label="t('editUserSettings.belongsToCenter')"
                  multiple />
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
