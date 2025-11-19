import { fileURLToPath, URL } from 'node:url'

import { ConfigEnv, defineConfig, UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
 
export default defineConfig((_config: ConfigEnv) => {
  return {
    plugins: [
      vue(),
      vueDevTools(),
      tailwindcss()
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL(`./src`, import.meta.url))
      }
    }
  } satisfies UserConfig
})

