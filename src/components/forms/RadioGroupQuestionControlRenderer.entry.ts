import {
  type JsonFormsRendererRegistryEntry,
  rankWith,
  schemaMatches
} from '@jsonforms/core';
import controlRenderer from './RadioGroupQuestionControlRenderer.vue';

export const entry: JsonFormsRendererRegistryEntry = {
  renderer: controlRenderer,
  //@ts-expect-error xrenderinghint is not a standard property, but used in this context to identify the control type
  tester: rankWith(30, schemaMatches(schema => schema.xrenderinghint === 'aofasRating'))
  // tester: rankWith(21, and(optionIs('format', 'radio'), isOneOfControl)), // This will match any number control
  // tester: rankWith(10, and(optionIs('format', 'radio'), isEnumControl))
};
