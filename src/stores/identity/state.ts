// src/stores/identity/state.ts

import type { IIdentityState, IIdentity, IPublicKey, DiscoveryProgress } from '@/types/identity'

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
    balanceBigInt: BigInt(0),
    dashBigInt: BigInt(0),

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

    // Action Stubs (Required for interface compliance)
    saveDiscoveredIdentities: async () => ({ success: false, savedCount: 0 }),
    connectWithSeed: async () => ({ success: false }),
    connectWithPrivateKey: async () => ({ success: false }),
    connectWriteOnlyFromDiscovered: async () => ({ success: false }),
    refreshIdentity: async () => {},
    fetchBalance: async () => {},
    loadPublicKeys: async () => [],
    switchIdentity: async () => {},
    deleteIdentity: async () => {},
    updateIdentityMetadata: async () => {},
    searchUserIdentities: async () => [],
    loadFromStorage: async () => {},
    saveToStorage: async () => {},
    clearStorage: async () => {},
    clearConnectionError: () => {},
})
