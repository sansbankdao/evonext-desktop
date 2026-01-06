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
import { connectWriteOnlyActions } from './actions/connectWriteOnly'
import { identitiesMapActions } from './actions/storage'

const useIdentityActions = {
    ...storageActions(),
    ...connectionActions(),
    ...identityActions(),
    ...balanceActions(),
    ...discoveredIdentitiesActions(),
    ...unifiedActions(),
    ...connectWriteOnlyActions(),
    ...identitiesMapActions(),
}

export const useIdentityStore = defineStore('identity', {
    state: useIdentityState,
    actions: useIdentityActions,
    getters: useIdentityGetters,
})
