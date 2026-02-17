// src/stores/identity/index.ts

import { defineStore } from 'pinia'
import { useIdentityState } from './state'
import { identityActions } from './actions/identity'
import { connectionActions } from './actions/connection'
import { connectWriteOnlyActions } from './actions/connectWriteOnly'
import { discoveredIdentitiesActions } from './actions/discovered'
import { keyActions } from './actions/keys'
import { unifiedActions } from './actions/unified'
import { mnemonicActions } from './actions/mnemonic'

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
            // Test input 200,000,000,000 expects 2 DASH
            return `${val / 100000000000} DASH`
        }
    },

    actions: {
        ...identityActions,
        ...connectionActions,
        ...connectWriteOnlyActions(),
        ...discoveredIdentitiesActions(),
        ...keyActions,
        ...unifiedActions(),
        ...mnemonicActions()
    }
})
