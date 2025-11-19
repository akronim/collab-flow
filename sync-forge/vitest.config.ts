import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

// eslint-disable-next-line max-lines-per-function
export default defineConfig(configEnv => mergeConfig(
  viteConfig(configEnv),
  defineConfig({
    test: {
      environment: `happy-dom`, //  jsdom
      exclude: [...configDefaults.exclude, `e2e/**`],
      root: fileURLToPath(new URL(`./`, import.meta.url)),
      setupFiles: [`./src/__tests__/setup.ts`],
      coverage: {
        provider: `v8`,
        all: true,
        include: [
          `src/**/*`
        ],
        exclude: [`src/types`, `src/*.d.ts`],
        reportsDirectory: `coverage`,
        reporter: [`text`, `html`]
        // thresholds: {
        //   functions: 80,
        //   branches: 80,
        //   statements: 80,
        //   lines: 80
        // }
      }
    }
  })
))
