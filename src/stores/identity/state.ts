// src/stores/identity/state.ts
import type { IIdentityState } from '@/types'

export const useIdentityState = (): IIdentityState => ({
    username: null,
    identityId: null,
    displayName: null,

    identity: null,
    balance: null,

    // Now valid because interface is bigint | undefined
    balanceBigInt: undefined,
    dashBigInt: undefined,

    publicKeys: [],
    revision: null,
    isAuthenticated: false,
    premiumAccess: false,
    connectionError: null,
    isConnecting: false,
    lastConnected: null,

    // Connection methods (placeholders, overridden by actions)
    connectWithSeed: async () => ({ success: false, error: 'Not implemented' }),
    connectWithSingleKey: async () => ({ success: false, error: 'Not implemented' }),

    // NEW: Identity Switching
    switchIdentity: async () => ({ success: false, error: 'Not implemented' }),

    // NEW: Discovery Storage methods
    saveDiscoveredIdentities: async () => ({ success: false, savedCount: 0 }),
    loadDiscoveredIdentities: async () => null,
    clearDiscoveredIdentities: async () => ({ success: false }),

    // Storage methods
    saveToStorage: async () => {},
    searchUserIdentities: async () => [],

    getCurrentNetwork: async () => 'mainnet',

    // Optional methods called from actions
    clearStorage: async () => {},
    fetchBalance: async () => {},
    getGreeting: () => '',
    loadFromStorage: async () => {},

    // NEW: Logout
    logout: async () => {}
})
