import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

const host = process.env.TAURI_DEV_HOST

// https://vite.dev/config/
export default defineConfig(async () => ({
    plugins: [vue()],

    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },

    /* Prevent Vite from obscuring rust errors. */
    clearScreen: false,

    // NOTE: Tauri expects a fixed port, fail if that port is not available.
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
            // NOTE: Tell Vite to ignore watching `src-tauri`.
            ignored: ['**/src-tauri/**'],
        },
    },
}))
