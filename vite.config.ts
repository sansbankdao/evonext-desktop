// vite.config.ts

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

const host = process.env.TAURI_DEV_HOST

export default defineConfig(async () => ({
    plugins: [vue()],

    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },

    /*
     * CRITICAL FIX: Disable source maps.
     * Prevents WebKit Protocol Handler crashes during DevTools inspection.
     */
    css: {
        devSourcemap: false,
    },
    build: {
        sourcemap: false,
    },

    clearScreen: false,

    server: {
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host
            ? {
                protocol: 'ws',
                host,
                port: 1421,
                overlay: false // Disable overlay to prevent renderer lock-up on errors
            }
        : undefined,
        watch: {
            ignored: ['**/src-tauri/**'],
        },
    },
}))
