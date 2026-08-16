<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface Props {
  isFirstQuestion: boolean
  isLastQuestion: boolean
  isCurrentQuestionAnswered: boolean
  readonly: boolean
  totalQuestions: number
  allQuestionsAnswered?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  allQuestionsAnswered: false
})

const emit = defineEmits<{
  previous: []
  next: []
  comment: []
  submit: []
  cancel: []
  saveAndGoToPreviousForm: []
  saveAndGoToNextForm: []
}>()

const { t } = useI18n()

const isSingleQuestion = computed(() => props.totalQuestions === 1)
</script>

<template>
  <v-card-actions class="flex-column align-center ga-2 w-100">
    <!-- Single Question Layout: Cancel and Save -->
    <!-- TODO cancel is not working, how to deal with it,
     maybe better to have a button to go back to previous form without saving;
     or have a save button and a form navigation button along the question navigation,
     so the user can save, after saving show the  form navigation buttons  -->
    <!-- <v-btn
           variant="outlined"
           color="secondary"
           size="small"
           prepend-icon="mdi-close"
           :disabled="readonly"
           @click="emit('cancel')">
      {{ t('buttons.cancel') }}
    </v-btn> -->

    <!-- Multi-Question Layout: Standard Navigation -->
    <div class="d-flex justify-center flex-wrap ga-2 w-100">
      <template v-if="!isSingleQuestion">
        <v-btn
               :disabled="isFirstQuestion"
               variant="outlined"
               color="primary"
               size="small"
               prepend-icon="mdi-chevron-left"
               @click="emit('previous')">
          {{ t('buttons.previous') }}
        </v-btn>

        <v-btn
               variant="tonal"
               color="warning"
               size="small"
               prepend-icon="mdi-comment-alert-outline"
               :disabled="readonly"
               @click="emit('comment')">
          {{ t('forms.comments.add') }}
          <v-tooltip activator="parent" location="top">{{ t('forms.comments.hint') }}</v-tooltip>
        </v-btn>

        <v-btn
               :disabled="isLastQuestion"
               variant="elevated"
               color="primary"
               size="small"
               append-icon="mdi-chevron-right"
               @click="emit('next')">
          {{ t('buttons.next') }}
        </v-btn>
      </template>
    </div>
    <div v-if="allQuestionsAnswered" class="w-100 d-flex justify-center flex-wrap ga-2 mt-2">
      <v-btn
             variant="elevated"
             color="success"
             size="small"
             prepend-icon=""
             @click="emit('saveAndGoToPreviousForm')">
        {{ t('buttons.goToPreviousForm') }}
      </v-btn>
      <v-btn
             variant="elevated"
             color="success"
             size="small"
             prepend-icon=""
             @click="emit('saveAndGoToNextForm')">
        {{ t('buttons.goToNextForm') }}
      </v-btn>
    </div>
  </v-card-actions>
</template>

<style scoped>
/* No custom styles needed - using Vuetify's built-in classes */
</style>
