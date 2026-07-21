<script setup lang="ts">
interface Props {
  title: string
  message: string
  buttonText: string
}

defineProps<Props>()
const emit = defineEmits<{ retry: [] }>()

const onRetry = () => {
  emit('retry')
}
</script>

<template>
  <div class="not-found-page text-center py-10 px-4">
    <div class="binocular-wrap mx-auto mb-4" aria-hidden="true">
      <v-icon class="binoculars">mdi-binoculars</v-icon>
    </div>

    <h2 class="text-h5 mb-2">{{ title }}</h2>
    <p class="text-medium-emphasis mb-5">{{ message }}</p>

    <v-btn color="primary" @click="onRetry">
      {{ buttonText }}
    </v-btn>
  </div>
</template>

<style scoped>
.not-found-page {
  min-height: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.binocular-wrap {
  width: 96px;
  height: 96px;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.binoculars {
  font-size: 54px;
  color: rgb(var(--v-theme-primary));
  animation: swipe-search 1.2s ease-in-out infinite alternate;
  will-change: transform;
}

@keyframes swipe-search {
  0% {
    transform: translateX(-10px) rotate(-7deg);
  }
  50% {
    transform: translateX(0) rotate(0deg);
  }
  100% {
    transform: translateX(10px) rotate(7deg);
  }
}
</style>
