// vitest.config.ts

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },

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
        watchExclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/.git/**',
            '**/src-tauri/**',
        ],
        coverage: {
            provider: 'v8',
            // 'lcov' is required for Codecov integration
            reporter: ['text', 'json', 'html', 'lcov'],
            exclude: [
                'node_modules/',
                'dist/',
                'tests/',
                '**/*.d.ts',
                'src/types/rust_generated.ts',
            ],
        },
    },
})
