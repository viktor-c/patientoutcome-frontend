import {
  type JsonFormsRendererRegistryEntry,
  rankWith,
  type Tester,
  uiTypeIs,
} from '@jsonforms/core';

import controlRenderer from './AofasControlRenderer.vue';

console.debug('🔵 AOFAS Renderer Entry file loaded successfully!');

// Custom tester that logs for debugging
const aofasTester: Tester = (uischema, schema, context) => {
  console.debug('AOFAS Tester Debug:', {
    scope: (uischema as unknown as Record<string, unknown>).scope,
    schemaTitle: schema?.title,
    uischemaType: uischema.type,
  });
  const testValue = uiTypeIs("AOFAS_Layout")(uischema, schema, context);
  console.debug('AOFAS Tester will return ', testValue, 'for UI type:', uischema.type);

  return testValue;
};

export const entry: JsonFormsRendererRegistryEntry = {
  renderer: controlRenderer,
  tester: rankWith(200, aofasTester),
};
