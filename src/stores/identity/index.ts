// src/stores/identity/index.ts

import { defineStore } from 'pinia'
import { useIdentityState } from './state'
import { useIdentityGetters } from './getters'
import { storageActions } from './actions/storage'
import { connectionActions } from './actions/connection'
import { balanceActions } from './actions/balance'
import { identityActions } from './actions/identity'
import { discoveredIdentitiesActions } from './actions/discovered'
import { unifiedActions } from './actions/unified'

/* Combine all actions. */
const useIdentityActions = {
    ...storageActions(),
    ...connectionActions(),
    ...identityActions(),
    ...balanceActions(),
    ...discoveredIdentitiesActions(),
    ...unifiedActions(), // New Phase 2 unified flow
}

export const useIdentityStore = defineStore('identity', {
    state: useIdentityState,
    actions: useIdentityActions,
    getters: useIdentityGetters,
})
