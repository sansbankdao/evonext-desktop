// vite.config.ts

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

export default defineConfig(() => ({
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
        outDir: 'dist', // Ensure this matches tauri.conf.json
        chunkSizeWarningLimit: 3000,
        rollupOptions: {
            output: {
                // Simple manual chunks are risky if file names change.
                // Remove chunking or simplify it if issues persist.
            }
        },
    },
    clearScreen: false,

    server: {
        host: '127.0.0.1',
        port: 1420,
        strictPort: true,
        hmr: {
            protocol: 'ws',
            host: '127.0.0.1',
            port: 1421,
            overlay: true
        },
        watch: {
            ignored: ['**/src-tauri/**'],
        },
    },
}))
