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

    // ADD THESE METHODS - they will be overridden by actions
    async saveToStorage(_networkOverride?: 'mainnet' | 'testnet') {
        // Default implementation - will be replaced by connectionActions
        return Promise.resolve()
    },

    async searchUserIdentities(_network: 'mainnet' | 'testnet') {
        // Default implementation - will be replaced by connectionActions
        return Promise.resolve([])
    }
})
