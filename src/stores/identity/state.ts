// src/stores/identity/state.ts

import type { ConnectionResult, IIdentityState } from '@/types'

export const useIdentityState = (): IIdentityState => ({
    username: null,
    identityId: null,
    displayName: null,
    identity: null,
    balance: null,
    publicKeys: [],
    revision: null,
    isAuthenticated: false,
    isConnecting: false,
    connectionError: null,
    premiumAccess: false,
    lastConnected: null,

    // Stub implementations that will be replaced by actual actions
    saveToStorage: async function(_networkOverride?: 'mainnet' | 'testnet') {
        return Promise.resolve()
    },

    // Stub implementations that will be replaced by actual actions
    searchUserIdentities: async function(_network: 'mainnet' | 'testnet') {
        return Promise.resolve([])
    },

    // Stub implementations that will be replaced by actual actions
    async connectWithSeed(_seedPhrase: string, _network: string, _targetId?: string, _identityIndex?: number) {
        // This will be overridden by connectionActions
        return { success: false, error: 'Not implemented' } as ConnectionResult
    },

    // Stub implementations that will be replaced by actual actions
    async connectWithSingleKey(_privateKey: string, _identityId: string, _network: string) {
        // This will be overridden by connectionActions
        return { success: false, error: 'Not implemented' } as ConnectionResult
    },
})
