<script lang="ts">
import { type ControlElement } from '@jsonforms/core';
import { defineComponent, ref } from 'vue';
import {
  rendererProps,
  useJsonFormsEnumControl,
  type RendererProps,
} from '@jsonforms/vue';
import { default as ControlWrapper } from './ControlWrapper.vue';
import { useVuetifyControl } from '@jsonforms/vue-vuetify';
import { VRadioGroup, VRadio, VLabel } from 'vuetify/components';

const controlRenderer = defineComponent({
  name: 'aofas-radio-group-control-renderer',
  components: {
    ControlWrapper,
    VRadioGroup,
    VRadio,
    VLabel,
  },
  props: {
    ...rendererProps<ControlElement>(),
  },
  setup(props: RendererProps<ControlElement>) {
    const componentName = 'RadioGroupQuestionControlRenderer.vue';
    console.debug(`${componentName} setup`, props);
    const touched = ref(false);
    const control = useVuetifyControl(useJsonFormsEnumControl(props));
    return {
      ...control,
      touched,
    }
  },
  computed: {
    filteredErrors(): string {
      return this.touched ? this.control.errors : '';
    }
  }
});

export default controlRenderer;
</script>

<template>
  <control-wrapper v-bind="controlWrapper" :styles="styles" :isFocused="isFocused" :appliedOptions="appliedOptions">
    <h1>{{control.label}}</h1>

    <v-label :for="control.id + '-input'" v-bind="vuetifyProps('v-label')">{{computedLabel}}</v-label>
    <v-radio-group :id="control.id + '-input'" :class="styles.control.input" :disabled="!control.enabled"
      :autofocus="appliedOptions.focus" :placeholder="appliedOptions.placeholder" :hint="control.description"
      :persistent-hint="persistentHint()" :required="control.required" :error-messages="filteredErrors"
      :model-value="control.data" v-bind="vuetifyProps('v-radio-group')" @update:model-value="onChange"
      @focus="handleFocus" @blur="handleBlur">
      <v-radio v-for="o in control.options" v-bind="vuetifyProps(`v-radio[${o.value}]`)" :key="o.value" :label="o.label"
        :value="o.value"></v-radio>
    </v-radio-group>
    <p v-for="o in control.options" v-bind="vuetifyProps(`v-radio[${o.value}]`)" :key="o.value">{{o.value}}</p>
  </control-wrapper>
</template>
