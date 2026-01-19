// src/tests/setup.ts

import { mockIPC } from '@tauri-apps/api/mocks'
import { vi } from 'vitest'

// 1. Mock window.matchMedia (needed for some UI components)
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
})

mockIPC((cmd, args) => {
    switch (cmd) {
    case 'get_wallet_balance':
        return { total: 100, available: 80 }
    case 'log_operation':
        console.log('Log called', args)
        return
    default:
        console.warn(`Unhandled command: ${cmd}`)
        return null
    }
})
