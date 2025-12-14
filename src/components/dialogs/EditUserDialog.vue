<script setup lang="ts">
import { ref, watch } from 'vue';
import type { GetUsers200ResponseResponseObjectInner } from '@/api/models/GetUsers200ResponseResponseObjectInner';

const props = defineProps<{
  show: boolean;
  user: GetUsers200ResponseResponseObjectInner | null;
}>();

const emit = defineEmits<{
  'update:show': [value: boolean];
  'save': [user: GetUsers200ResponseResponseObjectInner];
}>();

const editedUser = ref<GetUsers200ResponseResponseObjectInner | null>(null);
const cloneUser = (user: GetUsers200ResponseResponseObjectInner) => {
  try {
    // Use structuredClone if available for deep clone
    if (typeof structuredClone === 'function') return structuredClone(user);
  } catch (e) {
    // fallthrough to JSON clone
  }
  return JSON.parse(JSON.stringify(user));
};
const newPassword = ref('');
const availableRoles = ['admin', 'doctor', 'mfa', 'kiosk', 'developer'];

watch(() => props.user, (newUser) => {
  if (newUser) {
    // deep clone to avoid mutating parent data
    editedUser.value = cloneUser(newUser);
    newPassword.value = '';
  } else {
    editedUser.value = null;
    newPassword.value = '';
  }
}, { immediate: true });

const close = () => {
  emit('update:show', false);
};

const save = () => {
  if (editedUser.value) {
    // If password is provided, include it in the update
    const userToSave = { ...editedUser.value };
    if (newPassword.value) {
      userToSave.password = newPassword.value;
    }
    console.debug('EditUserDialog.save: emitting save for', userToSave?.username, userToSave);
    emit('save', userToSave);
    close();
  }
};
</script>

<template>
  <v-dialog :model-value="show" max-width="600" @update:model-value="emit('update:show', $event)">
    <v-card v-if="editedUser">
      <v-card-title class="py-3">
        <span class="text-h5">Edit User</span>
      </v-card-title>

      <v-card-text class="pa-4 pt-0">
        <v-text-field
                      v-model="editedUser.username"
                      label="Username"
                      required
                      density="compact"
                      variant="outlined"
                      class="mb-2" />

        <v-text-field
                      v-model="editedUser.name"
                      label="Name"
                      required
                      density="compact"
                      variant="outlined"
                      class="mb-2" />

        <v-text-field
                      v-model="editedUser.email"
                      label="Email"
                      type="email"
                      required
                      density="compact"
                      variant="outlined"
                      class="mb-2" />

        <v-text-field
                      v-model="editedUser.department"
                      label="Department"
                      required
                      density="compact"
                      variant="outlined"
                      class="mb-2" />

        <v-select
                  v-model="editedUser.roles"
                  :items="availableRoles"
                  label="Roles"
                  multiple
                  chips
                  required
                  density="compact"
                  variant="outlined"
                  class="mb-2" />

        <v-text-field
                      v-model="newPassword"
                      label="Reset Password (leave empty to keep current)"
                      type="password"
                      hint="Only fill if you want to reset the user's password"
                      persistent-hint
                      density="compact"
                      variant="outlined" />
      </v-card-text>

      <v-card-actions class="px-4 pb-3">
        <v-spacer />
        <v-btn color="grey" @click="close">
          Cancel
        </v-btn>
        <v-btn color="primary" @click="save">
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped></style>
