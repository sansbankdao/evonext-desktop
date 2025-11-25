// src/stores/identity/index.ts

/* Import modules. */
import { defineStore } from 'pinia'
import getIdentities from '@/libs/getIdentities'
import { getIdentityBalance } from '@evonext/platform'
import type { State } from './types'
import { useIdentityState } from './state'
import {
    storageActions
} from './actions/storage'
import {
    connectionActions
} from './actions/connection'
import {
    identityActions
} from './actions/identity'
import {
    balanceActions
} from './actions/balance'
import { useIdentityGetters } from './getters'

/* Create typed action objects by calling factories once */
const allStorageActions = storageActions({} as State, {} as any)
const allConnectionActions = connectionActions({} as State, {} as any)
const allIdentityActions = identityActions({} as State, {} as any)
const allBalanceActions = balanceActions({} as State, {} as any)

/* Combine into final actions object */
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
