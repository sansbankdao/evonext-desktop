// src/tests/setup.ts

import { vi, beforeEach } from 'vitest'
import { mockIPC } from '@tauri-apps/api/mocks'
import { setActivePinia, createPinia } from 'pinia'

// Provide default env vars for tests
process.env.VITE_DEFAULT_NETWORK = 'mainnet'
process.env.VITE_DASHSWAP_ENDPOINT = 'http://localhost:3000'
process.env.VITE_PLATFORM_HTTP_API_MAINNET = 'http://localhost:3000'
process.env.VITE_PLATFORM_HTTP_API_TESTNET = 'http://localhost:3000'

/**
 * Global Browser API Mocks
 *
 * NOTE: Required for components that use responsive design or advanced UI.
 */
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // Deprecated
        removeListener: vi.fn(), // Deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
})

// Mock ResizeObserver (frequently used by charting/layout libraries)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}))

/**
 * Tauri IPC Mocking
 *
 * Allows Vitest to simulate responses from your Rust backend.
 * NOTE: Commands follow the naming in #[tauri::command] definitions.
 */
const mockHandlers: Record<string, (args: any) => any> = {
    // Identity Commands
    "save_identity": (args) => {
        console.log('[Mock IPC] save_identity:', args)
        return {
            success: true,
            error: null,
            payload: { identityId: args.payload.identityId }
        }
    },

    "delete_identity": () => true,

    "save_keys": () => true,

    "load_keystore": () => ({
        identities: {},
        lastUpdated: new Date().toISOString()
    }),

    // Wallet / Portfolio Commands
    "get_wallet_balance": () => ({
        total: "100.50",
        available: "80.25",
        symbol: "DASH"
    }),

    // Plugin: Store (Tauri v2 uses plugin namespaces)
    "plugin:store|get": (args) => {
        if (args.key === 'settings') return { theme: 'dark' }
        return null
    },
    "plugin:store|set": () => null,

    // Generic Logger (from your setup)
    "log_operation": (args) => {
        console.log('[Rust Log]:', args.message)
        return null
    }
}

mockIPC((cmd, args) => {
    const handler = mockHandlers[cmd]

    if (handler) {
        return handler(args)
    }

    // Fallback for unhandled commands to help debug
    if (!cmd.startsWith('plugin:')) {
        console.warn(`[Vitest] Unhandled Tauri Command: "${cmd}". Add it to mockHandlers in setup.ts`)
    }

    return null
})

/**
 * Global Pinia Setup
 *
 * Automatically initializes a fresh Pinia instance before every test.
 * NOTE: Prevents state pollution between different test files.
 */
beforeEach(() => {
    setActivePinia(createPinia())
})

/**
 * Helper for Mocking Dialogs/FS
 *
 * Stubs for tauri-plugin-dialog and fs.
 */
vi.mock('@tauri-apps/plugin-dialog', () => ({
    ask: vi.fn(() => Promise.resolve(true)),
    message: vi.fn(() => Promise.resolve()),
    open: vi.fn(() => Promise.resolve({ path: '/mock/path', name: 'file.txt' })),
}))

vi.mock('@tauri-apps/plugin-fs', () => ({
    exists: vi.fn(() => Promise.resolve(true)),
    readTextFile: vi.fn(() => Promise.resolve('{"mock": "data"}')),
    writeTextFile: vi.fn(() => Promise.resolve()),
}))
