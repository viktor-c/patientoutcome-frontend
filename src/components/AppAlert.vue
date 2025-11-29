<template>
  <v-snackbar v-model="isOpen" :color="color" :timeout="timeout" timer="true" location="top">
    <div class="d-flex align-center justify-space-between" style="width:100%">
      <div>{{ content }}</div>
      <v-btn icon variant="text" aria-label="Close notification" @click="isOpen = false">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </div>
  </v-snackbar>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useNotifierStore } from '@/stores/notifierStore'

const notifierStore = useNotifierStore()

const isOpen = computed({
  get: () => notifierStore.isOpen,
  set: (value: boolean) => {
    notifierStore.isOpen = value
  },
})

const content = computed(() => notifierStore.content)
const color = computed(() => notifierStore.color)
const timeout = computed(() => notifierStore.timeout)
</script>
