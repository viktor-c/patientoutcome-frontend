import {
  type JsonFormsRendererRegistryEntry,
  rankWith,
  type Tester,
  uiTypeIs,
} from '@jsonforms/core';

import controlRenderer from './VisaaControlRenderer.vue';

console.debug('🔵 VISA-A Renderer Entry file loaded successfully!');

// Custom tester that logs for debugging
const visaaControlTester: Tester = (uischema, schema, context) => {

  console.debug('VISA-A Control Tester Debug:', {
    scope: (uischema as unknown as Record<string, unknown>).scope,
    schemaTitle: schema?.title,
    uischemaType: uischema.type
  });
  const testValue = uiTypeIs("VISAA_Layout")(uischema, schema, context);
  console.debug('VISA-A Control will return ', testValue);
  return testValue;

};

export const entry: JsonFormsRendererRegistryEntry = {
  renderer: controlRenderer,
  tester: rankWith(200, visaaControlTester),
};
