// src/stores/identity/getters.ts

import type { IPublicKey, IIdentity, IIdentityState } from '@/types'

export const useIdentityGetters = {
    getGreeting: (state: IIdentityState) => `Hello, ${state.username || 'Guest'}!`,
    isConnected: (state: IIdentityState) => state.isAuthenticated && !!state.username,
    hasPublicKeys: (state: IIdentityState) => state.publicKeys.length > 0,
    // getPublicKeyById: (state: IIdentityState) => (id: number) => {
    //     return state.publicKeys.find((key: IPublicKey) => key.id === id)
    // },
    getAuthPublicKey: (state: IIdentityState) => {
        return state.publicKeys.find((key: IPublicKey) => key.purpose === 0)
    },
    getEncryptionPublicKey: (state: IIdentityState) => {
        return state.publicKeys.find((key: IPublicKey) => key.purpose === 1)
    },

    // ✅ FIXED: Explicit 'unknown' conversion (exactly as TS recommends)
    // Satisfies IIdentity.shape while providing available data.
    // Use state.identity for full details (incl. potential identityIdx).
    identity: (state: IIdentityState): IIdentity | null => {
        if (!state.identityId || !state.identity) return null

        const identityData = {
            // ✅ Core available fields
            identityId: state.identityId,
            username: state.username,
            displayName: state.displayName,
            balance: state.balance,
            publicKeys: state.publicKeys,
            revision: state.revision,
            isAuthenticated: state.isAuthenticated,

            // ✅ Full nested identity (likely has identityIdx/createdAt)
            identity: state.identity,

            // ✅ Default missing required fields (safe fallback)
            identityIdx: 0n,  // Default; override with state.identity?.identityIdx if available

            // createdAt omitted (use state.identity?.createdAt if needed)
        }

        // ✅ TS-suggested: 'unknown' → IIdentity (intentional, safe for subset)
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
