import {
  type JsonFormsRendererRegistryEntry,
  rankWith,
  type Tester,
  uiTypeIs,
} from '@jsonforms/core';

import controlRenderer from './VASControlRenderer.vue';

console.debug('🔵 VAS Control Renderer Entry file loaded successfully!');

// Custom tester for VAS control
const vasControlTester: Tester = (uischema, schema, context) => {
  console.debug('VAS Control Tester Debug:', {
    scope: (uischema as unknown as Record<string, unknown>).scope,
    schemaTitle: schema?.title,
    uischemaType: uischema.type
  });
  const testValue = uiTypeIs("VAS_Layout")(uischema, schema, context);
  console.debug('VAS Control Tester will return', testValue);
  return testValue;
};

export const entry: JsonFormsRendererRegistryEntry = {
  renderer: controlRenderer,
  tester: rankWith(200, vasControlTester),
};
