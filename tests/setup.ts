// src/tests/setup.ts

import { vi, beforeEach } from 'vitest'
import { mockIPC } from '@tauri-apps/api/mocks'
import { setActivePinia, createPinia } from 'pinia'

/**
 * 1. Global Console Suppression
 * Prevents expected errors and warnings from cluttering the test output.
 * If you need to debug a specific test, you can restore them locally.
 */
vi.spyOn(console, 'error').mockImplementation(() => {})
vi.spyOn(console, 'warn').mockImplementation(() => {})

/**
 * 2. Environment Variable Stubs
 * Uses vi.stubEnv for better isolation between tests.
 */
vi.stubEnv('VITE_DEFAULT_NETWORK', 'mainnet')
vi.stubEnv('VITE_DASHSWAP_ENDPOINT', 'http://localhost:3000')
vi.stubEnv('VITE_PLATFORM_HTTP_API_MAINNET', 'http://localhost:3000')
vi.stubEnv('VITE_PLATFORM_HTTP_API_TESTNET', 'http://localhost:3000')

/**
 * 3. Global Browser API Mocks
 * Required for components that use responsive design or advanced UI.
 */
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
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
 * 4. Tauri IPC Mocking
 * Simulates responses from the Rust backend.
 * Updated to match the new strict types in models.rs.
 */
const mockHandlers: Record<string, (args: any) => any> = {
    // Identity Commands
    "save_identity": (args) => {
        const { payload } = args;
        // Verify mandatory fields exist in the mock logic
        if (!payload.username || typeof payload.balance !== 'string') {
            return { success: false, error: "Missing mandatory fields" }
        }
        return {
            success: true,
            error: null,
            payload: { identityId: payload.identityId }
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

    // Plugin: Store (Tauri v2)
    "plugin:store|get": (args: any) => {
        if (args.key === 'settings') return { theme: 'dark' }
        return null
    },
    "plugin:store|set": () => null,

    // Generic Logger
    "log_operation": (args: any) => {
        // Only log if explicitly needed for debugging
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
        // Use the original console warn if you really need to see unhandled commands
        // console.log(`[Vitest] Unhandled Tauri Command: "${cmd}"`)
    }

    return null
})

/**
 * 5. Global Pinia Setup
 * Automatically initializes a fresh Pinia instance before every test.
 */
beforeEach(() => {
    setActivePinia(createPinia())
})

/**
 * 6. Helper for Mocking Dialogs/FS Plugins
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
