<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '@/stores/userStore';
import { useNotifierStore } from '@/stores/notifierStore';

const { t } = useI18n();

const show = defineModel<boolean>('show');
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const form = ref();
const userStore = useUserStore();
const notifierStore = useNotifierStore();

const passwordMatch = computed(() => newPassword.value === confirmPassword.value);

async function save() {
  if (!passwordMatch.value) {
    notifierStore.notify(t('changePassword.error_match'), 'error');
    return;
  }
  try {
    await userStore.changePassword(
      currentPassword.value,
      newPassword.value,
      confirmPassword.value
    );
    notifierStore.notify(t('changePassword.success'), 'success');
    show.value = false;
  } catch (error) {
    console.error('Change password error:', error)
    notifierStore.notify(t('changePassword.error_api'), 'error');
  }
}
</script>

<template>
  <v-dialog v-model="show" max-width="400">
    <v-card>
      <v-card-title>{{ t('changePassword.title') }}</v-card-title>
      <v-card-text>
        <v-form ref="form">
          <v-text-field
                        v-model="currentPassword"
                        :label="t('changePassword.currentPassword')"
                        type="password"
                        autocomplete="current-password" />
          <v-text-field
                        v-model="newPassword"
                        :label="t('changePassword.newPassword')"
                        type="password"
                        autocomplete="new-password" />
          <v-text-field
                        v-model="confirmPassword"
                        :label="t('changePassword.confirmPassword')"
                        type="password"
                        autocomplete="new-password"
                        :error="!passwordMatch"
                        :error-messages="!passwordMatch ? [t('changePassword.error_match')] : []" />
          <v-card-actions>
            <v-spacer />
            <v-btn @click="() => (show = false)">{{ t('common.cancel') }}</v-btn>
            <v-btn color="primary" @click="save" :disabled="!passwordMatch">{{ t('common.save') }}</v-btn>
          </v-card-actions>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped></style>
