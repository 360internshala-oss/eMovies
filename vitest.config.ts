import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    setupFiles: ['tests/setup.ts'],
    reporters: 'default',
    // CI runners are slower than a dev laptop; keep the gates meaningful but
    // not machine-sensitive.
    testTimeout: 20000,
    hookTimeout: 20000,
  },
})
