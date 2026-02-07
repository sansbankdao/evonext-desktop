// vitest.config.ts

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
    // Use the plugin to resolve aliases from tsconfig.json automatically
    plugins: [vue(), tsconfigPaths()],

    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },

    // Standard Vite server config for the watcher
    server: {
        watch: {
            ignored: [
                '**/src-tauri/**',
                '**/target/**',
                '**/node_modules/**',
            ],
        },
    },

    test: {
        globals: true,
        environment: 'happy-dom',
        setupFiles: ['./tests/setup.ts'],

        // Use top-level exclude for files the runner should ignore
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/src-tauri/**',
            '**/.git/**',
            '**/index.js',
        ],

        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            exclude: [
                'node_modules/',
                'dist/',
                'tests/',
                '**/*.d.ts',
                'src/types/rust_generated.ts',
                '**/*.test.ts',
            ],
        },
    },
})
