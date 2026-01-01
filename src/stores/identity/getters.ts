// src/stores/identity/getters.ts

import type { IPublicKey, IIdentityState } from '@/types'

export const useIdentityGetters = {
    getGreeting: (state: IIdentityState) => `Hello, ${state.username ||'Guest'}!`,
    isConnected: (state: IIdentityState) => state.isAuthenticated && !!state.username,
    hasPublicKeys: (state: IIdentityState) => state.publicKeys.length > 0,
    // getPublicKeyById: (state: IIdentityState) => (id: number) => {
    //     return state.publicKeys.find((key: IPublicKey) => key.id === id)
    // },
    getAuthPublicKey: (state: IIdentityState) => {
        return state.publicKeys.find((key: IPublicKey) => key.purpose === 0)
    },
    getEncryptionPublicKey: (state: IIdentityState) => {
        return state.publicKeys.find((key: IPublicKey) => key.purpose === 1)
    },
}
