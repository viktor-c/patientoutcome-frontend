import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'
import type { ConfigEnv, UserConfig } from 'vite'

// `vite.config.ts` exports a callback (function) when using `defineConfig(({ mode }) => ({...}))`.
// `mergeConfig` expects concrete config objects, not a callback. Resolve the vite config
// for the 'test' mode before merging so Vitest can start without the "Cannot merge config in form of callback" error.
const resolvedViteConfig:
  | UserConfig
  | ((env: ConfigEnv) => UserConfig) =
  typeof viteConfig === 'function'
    ? // call with a minimal env object; cast to ConfigEnv so types line up
      (viteConfig as (env: ConfigEnv) => UserConfig)({ mode: 'test', command: 'build' })
    : (viteConfig as UserConfig)

export default mergeConfig(
  resolvedViteConfig as UserConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      css: {
        // Mock CSS modules to avoid CSS import errors
        modules: {
          classNameStrategy: 'non-scoped',
        },
      },
      // Add server configuration to handle CSS imports and dependencies
      server: {
        deps: {
          inline: ['vuetify', '@jsonforms/vue-vuetify'],
        },
      },

    },
  }),
)
