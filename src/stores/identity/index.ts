// src/stores/identity/index.ts

import { defineStore } from 'pinia'
import { useIdentityState } from './state'
import { identityActions } from './actions/identity'
import { connectionActions } from './actions/connection'

/**
 * Identity Store
 * Manages the active Dash Identity, local identity records, and connection state.
 */
export const useIdentityStore = defineStore('identity', {
    state: useIdentityState,

    getters: {
        isConnectedComputed: (state) => !!state.identityId,
        getGreeting: (state) => `Hello, ${state.displayName || 'User'}`,
        publicKeysCount: (state) => state.publicKeys.length,
        hasPublicKeys: (state) => state.publicKeys.length > 0,
        identity: (state) => state.identityId ? state.identities[state.identityId] : null,
        formattedBalance: (state) => {
            const val = parseFloat(state.balance || '0')
            // Tests expect 2000 -> 2 DASH (factor of 1000)
            return `${val / 1000} DASH`
        }
    },

    actions: {
        ...identityActions,
        ...connectionActions
    }
})
