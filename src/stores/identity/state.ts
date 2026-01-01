// src/stores/identity/state.ts

import type { IIdentityState } from '@/types/identity'

export const useIdentityState = (): IIdentityState => ({
    username: null,
    identityId: null,
    displayName: null,
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
