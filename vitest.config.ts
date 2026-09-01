import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.js'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      pool: 'threads',
      environment: 'jsdom',
      globals: true,
      setupFiles: ['tests/setup.ts'],
      include: ['tests/**/*.{test,spec}.{ts,tsx,js,jsx}'],
      css: false,
      // A full-suite run spins up many concurrent jsdom/MSW environments;
      // under that CPU contention, individual findBy/waitFor calls can get
      // timer-starved past the 5000ms/1000ms defaults even when nothing is
      // actually broken (seen and confirmed in the sibling client-fch repo).
      testTimeout: 20000,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        include: ['src/**/*.{ts,tsx,js,jsx}'],
        exclude: ['src/**/*.d.ts', 'src/main.jsx'],
      },
    },
  })
)
