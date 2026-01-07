// src/stores/identity/index.ts

import { defineStore } from 'pinia'
import { useIdentityState } from './state'
import { useIdentityGetters } from './getters'
import { storageActions, identitiesMapActions } from './actions/storage'
import { connectionActions } from './actions/connection'
import { balanceActions } from './actions/balance'
import { identityActions } from './actions/identity'
import { discoveredIdentitiesActions } from './actions/discovered'
import { unifiedActions } from './actions/unified'

const useIdentityActions = {
    ...storageActions(),
    ...connectionActions(),
    ...identityActions(),
    ...balanceActions(),
    ...discoveredIdentitiesActions(),
    ...unifiedActions(),
    ...identitiesMapActions(),
}

export const useIdentityStore = defineStore('identity', {
    state: () => useIdentityState(),
    actions: useIdentityActions,
    getters: useIdentityGetters,
})
