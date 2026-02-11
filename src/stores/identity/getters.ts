// src/stores/identity/getters.ts

import type { IPublicKey, IIdentity, IIdentityState } from '@/types/identity'
export const useIdentityGetters = {
    getGreeting: (state: IIdentityState) =>
        `Hello, ${state.username || state.identityId || 'Guest'}!`,
    isConnectedComputed: (state: IIdentityState) =>
        state.isAuthenticated && !!state.identityId,
    hasPublicKeys: (state: IIdentityState) =>
        state.publicKeys.length > 0,
    /**
     * Returns the Authentication Public Key (Purpose 0)
     */
    getAuthPublicKey: (state: IIdentityState): IPublicKey | undefined => {
        return state.publicKeys.find(k => k.purpose === 0)
    },
    /**
     * Returns the Encryption Public Key (Purpose 1)
     */
    getEncryptionPublicKey: (state: IIdentityState): IPublicKey | undefined => {
        return state.publicKeys.find(k => k.purpose === 1)
    },
    /**
     * Generic key getter by purpose
     */
    getPublicKeyByPurpose: (state: IIdentityState) => (purpose: number): IPublicKey | undefined => {
        return state.publicKeys.find(k => k.purpose === purpose)
    },
    // Standardized Identity Snapshot for Components
    identity: (state: IIdentityState): IIdentity | null => {
        if (!state.identityId) return null
        return {
            identityId: state.identityId,
            identityIdx: state.identityIdx || 0,
            username: state.username || '',
            displayName: state.displayName || '',
            balance: state.balance || '0',
            publicKeys: state.publicKeys || [],
            revision: state.revision || 0,
            isAuthenticated: state.isAuthenticated
        } as IIdentity
    },
    displayName: (state: IIdentityState): string => {
        return state.displayName || state.username || state.identityId || 'Guest'
    },
    formattedBalance: (state: IIdentityState): string => {
        const balance = state.balance
        if (!balance || balance === "0") return '0 DASH'
        try {
            // Dash Platform uses Duflones (10^8 per DASH)
            const dash = Number(BigInt(String(balance))) / 100_000_000
            return `${dash.toLocaleString(undefined, { minimumFractionDigits: 2 })} DASH`
        } catch {
            return '0 DASH'
        }
    },
    publicKeysCount: (state: IIdentityState): number => {
        return state.publicKeys?.length || 0
    }
}
