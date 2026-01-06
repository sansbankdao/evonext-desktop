// src/stores/identity/state.ts

import type { IIdentityState } from '@/types'

export const useIdentityState = (): IIdentityState => ({
    username: null,
    identityId: null,
    displayName: null,

    identity: null,
    balance: null,

    balanceBigInt: undefined,
    dashBigInt: undefined,

    publicKeys: [],
    revision: null,
    isAuthenticated: false,
    premiumAccess: false,
    connectionError: null,
    isConnecting: false,
    lastConnected: null,
    discoveryProgress: null,

    // New: cache for multiple identities (loaded from Rust)
    identitiesMap: {},

    connectWithSeed: async () => ({ success: false, error: 'Not implemented' }),
    connectWithSingleKey: async () => ({ success: false, error: 'Not implemented' }),

    switchIdentity: async () => ({ success: false, error: 'Not implemented' }),

    saveDiscoveredIdentities: async () => ({ success: false, savedCount: 0 }),
    loadDiscoveredIdentities: async () => null,
    clearDiscoveredIdentities: async () => ({ success: false }),

    saveToStorage: async () => {},
    searchUserIdentities: async () => [],

    getCurrentNetwork: async () => 'mainnet',

    clearStorage: async () => {},
    fetchBalance: async () => {},
    getGreeting: () => '',
    loadFromStorage: async () => {},

    logout: async () => {}
})
