// src/stores/identity/getters.ts

import type { IPublicKey, IIdentity, IIdentityState } from '@/types'

export const useIdentityGetters = {
    getGreeting: (state: IIdentityState) => `Hello, ${state.username || 'Guest'}!`,

    // Avoid name collision with state.isConnected
    isConnectedComputed: (state: IIdentityState) =>
        state.isAuthenticated && !!state.username,

    hasPublicKeys: (state: IIdentityState) => state.publicKeys.length > 0,

    getAuthPublicKey: (state: IIdentityState) => {
        return state.publicKeys.find((key: IPublicKey) => key.purpose === 0)
    },

    getEncryptionPublicKey: (state: IIdentityState) => {
        return state.publicKeys.find((key: IPublicKey) => key.purpose === 1)
    },

    // Safe IIdentity snapshot for components
    identity: (state: IIdentityState): IIdentity | null => {
        if (!state.identityId || !state.identity) return null

        const identityData = {
            identityId: state.identityId,
            username: state.username,
            displayName: state.displayName,
            balance: state.balance,
            publicKeys: state.publicKeys,
            revision: state.revision,
            isAuthenticated: state.isAuthenticated,
            identityIdx: state.identity?.identityIdx ?? 0
        }

        return identityData as unknown as IIdentity
    },

    displayName: (state: IIdentityState): string => {
        return state.displayName || state.username || state.identityId || 'Guest'
    },

    formattedBalance: (state: IIdentityState): string => {
        const balance = state.balance

        if (!balance || balance === 0) return '0 DASH'

        try {
            const dash = BigInt(String(balance)) / BigInt(100_000_000_000)
            return `${dash.toLocaleString()} DASH`
        } catch {
            return '0 DASH (invalid balance)'
        }
    },

    publicKeysCount: (state: IIdentityState): number => {
        return state.publicKeys?.length || 0
    },
}
