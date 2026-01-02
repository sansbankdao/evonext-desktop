// src/stores/identity/state.ts

import type { IIdentityState } from '@/types'

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

    searchUserIdentities: async function(_network: 'mainnet' | 'testnet') {
        return Promise.resolve([])
    }
})
