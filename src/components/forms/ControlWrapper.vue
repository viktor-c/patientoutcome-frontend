<template>
  <div class="w-75">
    <div v-if="visible" :class="styles.control.root" :id="id">
      <slot></slot>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { Styles } from '@jsonforms/vue-vuetify';

export default defineComponent({
  name: 'control-wrapper',
  props: {
    id: {
      required: true as const,
      type: String,
    },
    visible: {
      required: false as const,
      type: Boolean,
      default: true,
    },
    styles: {
      required: true,
      type: Object as PropType<Styles>,
    },
  },
});
</script>
