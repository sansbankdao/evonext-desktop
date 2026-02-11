// src/stores/identity/state.ts

import type {
    IIdentityState,
    IIdentity,
    IPublicKey,
    DiscoveryProgress
} from '@/types/identity'
export const useIdentityState = (): IIdentityState => ({
    // Identification
    identityId: null,
    identityIdx: 0,
    username: null,
    displayName: "",
    identity: null,
    // Storage
    identities: {} as Record<string, IIdentity>,
    // Assets
    balance: '0',
    // Protocol Data
    publicKeys: [] as IPublicKey[],
    revision: 0,
    // Auth & UI State
    isAuthenticated: false,
    isConnected: false,
    isConnecting: false,
    premiumAccess: false,
    connectionError: null,
    discoveryProgress: null as DiscoveryProgress | null,
    // Action Stubs
    saveDiscoveredIdentities: async () => ({
        success: false,
        savedCount: 0
    }),
    connectWithSingleKey: async () => ({
        success: false
    }),
    saveKeys: async () => ({
        success: false
    }),
    loadFromStorage: async () => {},
    saveToStorage: async () => {},
    clearStorage: async () => {},
    getCurrentNetwork: async () => 'testnet',
    clearConnectionError: () => {},
    saveMnemonicToStore: async () => {},
    saveIdentityDataToStore: async () => {},
})
