import {
  type JsonFormsRendererRegistryEntry,
  rankWith,
  type Tester,
  uiTypeIs,
} from '@jsonforms/core';

import controlRenderer from './EfasQuestionSliderControlRenderer.vue';

console.debug('🔵 EFAS Question Slider Renderer Entry file loaded successfully!');

// Custom tester that logs for debugging
const efasQuestionSliderTester: Tester = (uischema, schema, context) => {

  console.debug('EFAS Question Slider Tester Debug:', {
    scope: (uischema as unknown as Record<string, unknown>).scope,
    schemaTitle: schema?.title,
    uischemaType: uischema.type
  });
  const testValue = uiTypeIs("EFAS_Layout")(uischema, schema, context);
  console.debug('EFAS Question Slider will return ', testValue);
  return testValue;

};

export const entry: JsonFormsRendererRegistryEntry = {
  renderer: controlRenderer,
  tester: rankWith(200, efasQuestionSliderTester),
};
