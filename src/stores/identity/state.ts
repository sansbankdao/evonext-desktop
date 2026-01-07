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
    isConnected: false,
    lastConnected: null,

    discoveryProgress: null,

    identitiesMap: {},


    // --- Actions Stubs (Satisfy Typescript, overridden by Store Actions) ---
    connectWithSeed: async () => ({ success: false, error: 'Not implemented' }),
    connectWithSingleKey: async () => ({ success: false, error: 'Not implemented' }),
    switchIdentity: async () => ({ success: false, error: 'Not implemented' }),
    logout: async () => {},
    saveDiscoveredIdentities: async () => ({ success: false, savedCount: 0 }),
    loadDiscoveredIdentities: async () => null,
    clearDiscoveredIdentities: async () => ({ success: false }),
    saveKeys: async () => {},
    saveToStorage: async () => {},
    loadFromStorage: async () => {},
    clearStorage: async () => {},
    getCurrentNetwork: async () => 'mainnet',
    clearConnectionError: () => {}
})
