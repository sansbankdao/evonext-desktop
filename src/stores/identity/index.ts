// src/stores/identity/index.ts

import { defineStore } from 'pinia'
// import getIdentities from '@/libs/getIdentities'
// import { getIdentityBalance } from '@evonext/platform'
// import type { IState } from '@/types'
import { useIdentityState } from './state'
import { storageActions } from './actions/storage'
import { connectionActions } from './actions/connection'
import { identityActions } from './actions/identity'
import { balanceActions } from './actions/balance'
import { useIdentityGetters } from './getters'
/* Create action objects */
const allStorageActions = storageActions()
const allConnectionActions = connectionActions()
const allIdentityActions = identityActions()
const allBalanceActions = balanceActions()
/* Combine all actions */
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
