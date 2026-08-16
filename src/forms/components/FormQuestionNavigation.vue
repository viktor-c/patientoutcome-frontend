<script setup lang="ts">
import { computed } from 'vue'

export interface QuestionNavItem {
  index: number
  color: string
  title?: string
}

interface Props {
  questions: QuestionNavItem[]
  currentIndex: number
  showTitles?: boolean
  variant?: 'dots' | 'list'
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  showTitles: false,
  variant: 'dots'
})

const emit = defineEmits<{
  (e: 'navigate', index: number): void
}>()

function handleNavigate(index: number) {
  emit('navigate', index)
}
</script>

<template>
  <!-- Dots variant (Mobile/Compact) -->
  <v-container
               v-if="variant === 'dots'"
               class="d-flex justify-space-evenly mb-2"
               :class="{ 'mb-4': questions.length > 1 }"
               style="padding: 0;">
    <span
          v-for="question in questions"
          :key="question.index"
          :active="question.index === currentIndex"
          @click="handleNavigate(question.index)"
          class="cursor-pointer">
      <v-chip
              :value="question.index"
              size="x-small"
              :color="question.color"
              @click="handleNavigate(question.index)">
        {{ question.index + 1 }}
      </v-chip>
    </span>
  </v-container>

  <!-- List variant (Desktop Sidebar) -->
  <v-card v-else-if="variant === 'list'" class="d-none d-md-block mt-4" elevation="1">
    <v-card-title v-if="title" class="text-subtitle-1 py-2 bg-grey-lighten-4">
      {{ title }}
    </v-card-title>
    <v-list density="compact">
      <v-list-item
                   v-for="question in questions"
                   :key="question.index"
                   :active="question.index === currentIndex"
                   @click="handleNavigate(question.index)"
                   class="cursor-pointer">
        <template #prepend>
          <v-chip
                  :value="question.index"
                  size="x-small"
                  :color="question.color"
                  @click="handleNavigate(question.index)">
            {{ question.index + 1 }}
          </v-chip>
        </template>
        <v-list-item-title
                           v-if="showTitles && question.title"
                           class="text-body-2"
                           style="white-space: normal; line-height: 1.3;">
          {{ question.title }}
        </v-list-item-title>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>
