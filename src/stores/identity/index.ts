// src/stores/identity/index.ts

/* Import modules. */
import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import { DashPlatformSDK } from 'dash-platform-sdk'
import getIdentities from '@/libs/getIdentities'
import { getIdentityBalance } from '@evonext/platform'
import { IIdentity } from './types'
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
const allActions = (state: any, store: any) => ({
    ...storageActions(state, store),
    ...connectionActions(state, store),
    ...identityActions(state, store),
    ...balanceActions(state, store),
})
export const useIdentityStore = defineStore('identity', {
    state: useIdentityState,
    actions: allActions,
    getters: useIdentityGetters,
})
