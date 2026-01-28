// vite.config.ts

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// Force specific host to avoid IPv6/localhost resolution hangs in WebKitGTK
const internalHost = '127.0.0.1'

export default defineConfig(async () => ({
    plugins: [vue()],

    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@components': path.resolve(__dirname, './src/components'),
            '@consumables': path.resolve(__dirname, './src/consumables'),
            '@services': path.resolve(__dirname, './src/services'),
            '@stores': path.resolve(__dirname, './src/stores'),
            '@types': path.resolve(__dirname, './src/types'),
            '@utils': path.resolve(__dirname, './src/utils'),
        },
    },

    css: {
        devSourcemap: false,
    },
    build: {
        sourcemap: false,
        // NOTE: Limits to help avoid OOM on constrained runners.
        chunkSizeWarningLimit: 3000,
        rollupOptions: {
            // NOTE: Drastically reduce parallel file operations (default is 20).
            // This prevents memory spikes on macOS/CI environments.
            maxParallelFileOps: 2,
            cache: false,
            output: {
                manualChunks(id) {
                    // @dashevo/evo-sdk chunk
                    if (id.includes('node_modules/@dashevo/evo-sdk')) {
                        return 'vendor-evo-sdk'
                    }

                    // monaco-editor chunk
                    if (id.includes('node_modules/monaco-editor')) {
                        if (id.includes('language') || id.includes('worker')) {
                            return 'vendor-monaco-workers'
                        }
                        return 'vendor-monaco'
                    }

                    // crypto chunk
                    if (id.includes('node_modules/@evonext/')) {
                        return 'vendor-evonext'
                    }

                    // Vue and core chunk
                    if (id.includes('node_modules/vue') ||
                        id.includes('node_modules/@vue/') ||
                        id.includes('node_modules/pinia') ||
                        id.includes('node_modules/vue-router')) {
                        return 'vendor-vue'
                    }

                    // Tauri chunk
                    if (id.includes('node_modules/@tauri-apps/')) {
                        return 'vendor-tauri'
                    }

                    // NOTE: All remaining node_modules chunk.
                    if (id.includes('node_modules/')) {
                        return 'vendor'
                    }
                }
            }
        },
    },
    clearScreen: false,

    server: {
        host: internalHost,
        port: 1420,
        strictPort: true,
        hmr: {
            protocol: 'ws',
            host: internalHost,
            port: 1421,
            overlay: true
        },
        watch: {
            ignored: ['**/src-tauri/**'],
        },
    },
}))
