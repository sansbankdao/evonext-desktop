// vite.config.ts

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'node:path'

const internalHost = '127.0.0.1'

export default defineConfig(async () => ({
    plugins: [
        vue(),
        // The ported shielded stack (evonext.app lib/shielded) uses Node
        // globals (Buffer in prove.ts/pczt-wire.ts/reference-wire.ts, the
        // same way it ran on the web under Next/webpack). The plugin injects
        // the browser-safe polyfills for BOTH the main bundle and workers.
        nodePolyfills({
            globals: { Buffer: true, process: true },
        }),
    ],

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
        outDir: 'dist',
        rollupOptions: {
            cache: true, // Enables faster rebuilds
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
