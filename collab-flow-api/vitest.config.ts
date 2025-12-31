import { defineConfig, defaultExclude } from 'vitest/config'
import path from 'path'
import dotenv from 'dotenv'
import { TEST_WORKER_COUNT } from './src/__tests__/setup/constants'

dotenv.config({ path: `.env.test` }) // is it necessary?

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: [...defaultExclude, 'dist/**'],
    globalSetup: ['./src/__tests__/setup/global-setup.ts'],
    fileParallelism: true,
    maxWorkers: TEST_WORKER_COUNT
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
