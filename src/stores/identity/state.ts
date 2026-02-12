// src/stores/identity/state.ts

// src/stores/identity/state.ts

import type { IIdentityState, IIdentity, IPublicKey, DiscoveryProgress } from '@/types/identity'

export const useIdentityState = (): IIdentityState => ({
    identityId: null,
    identityIdx: 0,
    username: null,
    displayName: "",
    identity: null,
    identities: {} as Record<string, IIdentity>,
    balance: '0',
    formattedBalance: '0.00 DASH',
    balanceBigInt: BigInt(0),
    dashBigInt: BigInt(0),
    publicKeys: [] as IPublicKey[],
    revision: 0,
    isAuthenticated: false,
    isConnected: false,
    isConnecting: false,
    premiumAccess: false,
    connectionError: null,
    discoveryProgress: null as DiscoveryProgress | null,

    // Actions mapped as stubs for the state definition
    // Connection results expect { success: boolean }
    connectWithSeed: async () => ({ success: false }),
    connectWithPrivateKey: async () => ({ success: false }),
    connectWriteOnlyFromDiscovered: async () => ({ success: false }),

    // Lifecycle actions are void
    refreshIdentity: async () => {},
    fetchBalance: async () => {},
    loadPublicKeys: async () => [],

    // Discovery/Identity queries expect { success: boolean, data: any }
    getPublicKeys: async (_id: string, _net: string) => ({ success: false, data: null }),

    // Management actions are void
    switchIdentity: async () => {},
    deleteIdentity: async () => {},
    updateIdentityMetadata: async () => {},
    searchUserIdentities: async () => [],

    // Storage operations
    loadFromStorage: async () => {},
    saveToStorage: async () => {},
    clearStorage: async () => {},
    clearConnectionError: () => {},

    // These specific storage actions return result objects to satisfy test expectations
    saveKeys: async () => ({ success: false }),
    saveMnemonicToStore: async () => ({ success: false }),
    saveIdentityDataToStore: async () => ({ success: false }),
    saveIdentity: async (_network: string, _payload: any) => ({ success: false }),

    // Utility and Loaders
    getCurrentNetwork: async () => 'testnet',
    // loadKeystore expects a result object in tests
    loadKeystore: async () => ({ success: false }),
})
