// vitest.config.ts

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            // This replaces path.resolve(__dirname, './src') for ESM compatibility
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    test: {
        globals: true,
        environment: 'happy-dom',
        setupFiles: ['./tests/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'dist/',
                '**/*.d.ts',
                'tests/', // Exclude the test setup folder from coverage
            ],
        },
    },
})
