// src/stores/identity/index.ts

/* Import modules. */
import { defineStore } from 'pinia'

/* Import state. */
import { useIdentityState } from './state'

/* Import actions. */
import { storageActions } from './actions/storage'
import { connectionActions } from './actions/connection'
import { identityActions } from './actions/identity'
import { balanceActions } from './actions/balance'

/* Import getters. */
import { useIdentityGetters } from './getters'

/* Create action objects. */
const allStorageActions = storageActions()
const allConnectionActions = connectionActions()
const allIdentityActions = identityActions()
const allBalanceActions = balanceActions()

/* Combine all actions. */
const useIdentityActions = {
    ...allStorageActions,
    ...allConnectionActions,
    ...allIdentityActions,
    ...allBalanceActions,
}

export const useIdentityStore = defineStore('identity', {
    state: useIdentityState,
    actions: useIdentityActions,
    getters: useIdentityGetters,
})
