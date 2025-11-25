// src/stores/identity/state.ts

import type { State } from './types'

export const useIdentityState = (): State => ({
    username: null,
    identity: null,
    balance: null,
    publicKeys: [],
    revision: null,
    isAuthenticated: false,
    isConnecting: false,
    connectionError: null,
    premiumAccess: false,
    lastConnected: null,
})
