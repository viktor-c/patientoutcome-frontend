import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import vuetify from 'vite-plugin-vuetify'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // load .env files
  const env = loadEnv(mode, process.cwd())
  // Allowed hosts for dev server (comma-separated). Example: VITE_ALLOWED_HOSTS=localhost,prom.example.com
  const allowedHosts = (env.VITE_ALLOWED_HOSTS || 'localhost')
    .split(',')
    .map(h => h.trim())
    .filter(Boolean)

  // Optional HMR host (useful when proxying through Traefik)
  const hmrHost = env.VITE_HMR_HOST || undefined

  console.debug("VITE_ALLOWED_HOSTS:", allowedHosts)

  return {
    plugins: [
      vue(),
      vueDevTools(),
      vuetify({ autoImport: { labs: true }, })
    ],
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@import "vuetify/styles";`,
        },
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    server: {
      // allow access from LAN IPs (so dev server is reachable via 192.168.x.x)
      host: true,
      // allow proxied hostnames (e.g. prom.example.com) to access the dev server
      // https://vitejs.dev/config/server-options.html
      allowedHosts,
      // configure HMR host when proxied (optional)
      hmr: hmrHost ? { host: hmrHost } : undefined,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
    },
  }
})
