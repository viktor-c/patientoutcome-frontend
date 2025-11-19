import {
  type JsonFormsRendererRegistryEntry,
  rankWith,
  type Tester,
  uiTypeIs,
} from '@jsonforms/core';
import controlRenderer from './MoxfqTableRenderer.vue';

console.debug('🔵 MOXFQ Table Renderer Entry file loaded successfully!');

// Custom tester that logs for debugging
const moxfqTester: Tester = (uischema, schema, context) => {
  // const isIntegerControlBool = isIntegerControl(uischema, schema, context);
  // const scopeHasMoxFq = (uischema as any).scope?.toLowerCase().includes('moxfq');


  console.debug('MOXFQ Tester Debug:', {
    scope: (uischema as unknown as Record<string, unknown>).scope,
    schemaTitle: schema?.title,
    uischemaType: uischema.type
  });
  const testValue = uiTypeIs("MOXFQTable")(uischema, schema, context);
  console.debug('Moxfq Tester will return ', testValue);
  return testValue;

};

export const entry: JsonFormsRendererRegistryEntry = {
  renderer: controlRenderer,
  tester: rankWith(200, moxfqTester),
};
