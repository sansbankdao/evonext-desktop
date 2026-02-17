// src/services/BootstrapService.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock all dependencies before importing BootstrapService
vi.mock('@/stores/identity', () => {
    const store = {
        identityId: null as string | null,
        isConnected: false,
        isAuthenticated: false,
        identityIdx: 0,
        username: null as string | null,
        displayName: '',
        balance: '0',
        revision: 0,
        publicKeys: [] as any[],
        premiumAccess: false,
        identities: {} as Record<string, any>
    }
    return {
        useIdentityStore: () => store,
        __mockStore: store
    }
})

vi.mock('@/stores/storage', () => ({
    useStorageStore: () => ({
        initFromStorage: vi.fn().mockResolvedValue(undefined)
    })
}))

vi.mock('@/stores/wallet', () => ({
    useWalletStore: () => ({
        refreshBalances: vi.fn().mockResolvedValue(undefined)
    })
}))

vi.mock('@/composables/useLicense', () => ({
    useLicense: () => ({
        refreshLicense: vi.fn().mockResolvedValue(null)
    })
}))

const mockInvoke = vi.fn()
vi.mock('@/utils/tauri', () => ({
    invoke: (...args: any[]) => mockInvoke(...args)
}))

vi.mock('@/bindings', () => ({
    commands: {
        loadSettings: vi.fn().mockResolvedValue({
            success: true,
            data: { network: 'testnet', activeIdentityId: null },
            error: null
        })
    }
}))

describe('BootstrapService', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        // Reset mock store state
        const { __mockStore } = require('@/stores/identity')
        __mockStore.identityId = null
        __mockStore.isConnected = false
        __mockStore.isAuthenticated = false
        __mockStore.premiumAccess = false
        __mockStore.identities = {}
    })

    it('should complete bootstrap sequence without identity', async () => {
        const { BootstrapService } = await import('./BootstrapService')
        await BootstrapService.init()
        // Should not crash, premium should be disabled
        const { __mockStore } = require('@/stores/identity')
        expect(__mockStore.premiumAccess).toBe(false)
    })

    it('should restore identity from settings when store is empty', async () => {
        const { commands } = await import('@/bindings')
        vi.mocked(commands.loadSettings).mockResolvedValue({
            success: true,
            data: {
                network: 'testnet',
                activeIdentityId: 'restored_id_123',
                theme: 'system',
                notifications: { messages: true, mentions: true, contactRequests: true },
                profile: { displayName: 'TestUser', username: 'testuser', bio: '' }
            },
            error: null
        })

        mockInvoke.mockImplementation(async (cmd: string) => {
            if (cmd === 'load_active_identity') {
                return {
                    activeIdentityId: 'restored_id_123',
                    identity: {
                        identityId: 'restored_id_123',
                        username: 'TestUser',
                        balance: '5000',
                        revision: 2
                    },
                    identityCount: 1
                }
            }
            return { success: true }
        })

        const { BootstrapService } = await import('./BootstrapService')
        await BootstrapService.init()

        const { __mockStore } = require('@/stores/identity')
        expect(__mockStore.identityId).toBe('restored_id_123')
        expect(__mockStore.isConnected).toBe(true)
    })

    it('should handle settings load failure gracefully', async () => {
        const { commands } = await import('@/bindings')
        vi.mocked(commands.loadSettings).mockRejectedValue(new Error('File not found'))

        const { BootstrapService } = await import('./BootstrapService')
        // Should not throw
        await expect(BootstrapService.init()).resolves.not.toThrow()
    })
})
