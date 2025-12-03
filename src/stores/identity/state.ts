// src/stores/identity/state.ts

/* Import types. */
import type { IState } from '@/types'

export const useIdentityState = (): IState => ({
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
