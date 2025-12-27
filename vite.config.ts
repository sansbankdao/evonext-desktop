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
     * WebKit often crashes when requesting source maps via the custom Tauri protocol
     * while DevTools is opening.
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
            }
        : undefined,
        watch: {
            ignored: ['**/src-tauri/**'],
        },
    },
}))
