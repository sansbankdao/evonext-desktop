// src/stores/identity/state.ts

import type { IIdentityState } from '@/types'
import type { IIdentityData } from '@/types/rust_generated'

export const useIdentityState = (): IIdentityState => ({
    username: null,
    identityId: null,
    identityIdx: 0,
    displayName: null,

    identity: null,
    balance: '0',

    balanceBigInt: undefined,
    dashBigInt: undefined,

    publicKeys: [],
    revision: 0,

    isAuthenticated: false,
    premiumAccess: false,

    connectionError: null,
    isConnecting: false,
    isConnected: false,
    lastConnected: null,

    discoveryProgress: undefined,

    identities: {} as Record<string, IIdentityData>,

    // --- Actions Stubs ---
    connectWithSeed: async () => ({ success: false, error: 'Not implemented' }),
    connectWithSingleKey: async () => ({ success: false, error: 'Not implemented' }),
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

    saveMnemonicToStore: async () => {},
    loadMnemonic: async () => null,
    loadSettings: async () => null,

    saveIdentityDataToStore: async () => {},
    switchIdentity: async () => ({ success: false, error: 'Not implemented' }),
    resetStoreState: () => {},
    clearConnectionError: () => {}
})
