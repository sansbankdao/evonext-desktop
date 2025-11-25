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

/* Combine all actions */
const useIdentityActions = (state: State, store: any) => ({
    ...storageActions(state, store),
    ...connectionActions(state, store),
    ...identityActions(state, store),
    ...balanceActions(state, store),
})

export const useIdentityStore = defineStore('identity', {
    state: useIdentityState,
    actions: useIdentityActions,
    getters: useIdentityGetters,
    // NO persist: true - using Rust/Tauri storage instead!
})
