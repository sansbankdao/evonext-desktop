// src/stores/identity/state.ts

import type { IIdentityState, IIdentity, IPublicKey, DiscoveryProgress } from '@/types/identity'
import type { IIdentityData } from '@/bindings'
export const useIdentityState = (): IIdentityState => ({
    // Identification
    identityId: null,
    identityIdx: 0,
    username: null,
    displayName: "",
    identity: null,
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
    // Storage
    identities: {} as Record<string, IIdentityData>,
    // Action Stubs
    saveDiscoveredIdentities: async () => ({ success: false, savedCount: 0 }),
    connectWithSingleKey: async () => ({ success: false }),
    saveKeys: async () => ({ success: false }),
    loadFromStorage: async () => {},
    saveToStorage: async () => {},
    clearStorage: async () => {},
    getCurrentNetwork: async () => 'testnet',
    clearConnectionError: () => {},
    saveMnemonicToStore: async () => {},
    saveIdentityDataToStore: async () => {},
})
