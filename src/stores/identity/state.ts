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

    // Stub for the legacy action required by ConnectSeedForm
    connectWriteOnlyFromDiscovered: async () => ({ success: false, error: 'Not implemented' }),

    logout: async () => {},

    saveDiscoveredIdentities: async () => ({ success: false, savedCount: 0 }),
    loadDiscoveredIdentities: async () => null,
    clearDiscoveredIdentities: async () => ({ success: false }),

    saveKeys: async () => {},
    saveToStorage: async () => {},
    loadFromStorage: async () => {},
    clearStorage: async () => {},

    getCurrentNetwork: async () => 'mainnet',

    // Helper stubs now required by strict interface
    saveMnemonicToStore: async () => {},
    loadMnemonic: async () => null,
    loadSettings: async () => {
        // Implementation provided in storage.ts
        // This matches the signature in IIdentityActions
        return null
    },

    saveIdentityDataToStore: async () => {},

    // Added to satisfy IIdentityActions interface
    switchIdentity: async () => ({ success: false, error: 'Not implemented' }),
    resetStoreState: () => {},

    clearConnectionError: () => {}
})
