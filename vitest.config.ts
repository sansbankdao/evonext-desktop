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
                '**/src-tauri/**', // Ignore the entire Rust source and build
                '**/target/**',    // Ignore Rust build artifacts specifically
                '**/node_modules/**',
            ],
        },
    },
    // -----------------------

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
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'dist/',
                'tests/',
                '**/*.d.ts',
            ],
        },
    },
})
