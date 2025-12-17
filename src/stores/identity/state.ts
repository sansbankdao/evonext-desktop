// src/stores/identity/state.ts
import type { IIdentityState } from '@/types'
export const useIdentityState = (): IIdentityState => ({
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
