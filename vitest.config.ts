// vitest.config.ts

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
    // Use the plugin to resolve aliases from tsconfig.json automatically
    // NOTE (desktop port): deliberately NO nodePolyfills here — vitest runs
    // in real Node (Buffer/process/node:fs native; the KAT suites read the
    // wasm + fixtures with fs), while the APP build carries the polyfills
    // for the ported web stack (vite.config.ts).
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
        // Ported KAT suites: the pure-TS crypto suites (tree/poseidon/bundle/
        // sync) can exceed 30s wall time under parallel load, and the
        // REAL-wasm suites (token-facts/token-send/compat-derive) pay a full
        // 26.5MB wasm init per worker — same reasoning as the web's config
        // (evonext.app vitest.config.ts: 60s/60s).
        hookTimeout: 60000,
        testTimeout: 60000,

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
                'src/bindings.ts',
                '**/*.test.ts',
            ],
        },
    },
})
