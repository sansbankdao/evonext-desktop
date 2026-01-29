// src/stores/identity/index.ts

import { defineStore } from 'pinia'
import { useIdentityState } from './state'
import { useIdentityGetters } from './getters'
import { connectionActions } from './actions/connection'
import { balanceActions } from './actions/balance'
import { identityActions } from './actions/identity'
import { discoveredIdentitiesActions } from './actions/discovered'
import { unifiedActions } from './actions/unified'
import { connectWriteOnlyActions } from './actions/connectWriteOnly'

// Combine all actions
const useIdentityActions = {
    ...connectionActions(),
    ...identityActions(),
    ...balanceActions(),
    ...discoveredIdentitiesActions(),
    ...unifiedActions(),
    ...connectWriteOnlyActions(),
}

export const useIdentityStore = defineStore('identity', {
    state: () => useIdentityState(),
    actions: useIdentityActions,
    getters: useIdentityGetters,
})
