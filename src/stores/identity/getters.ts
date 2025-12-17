// src/stores/identity/getters.ts
import type { IIdentityPublicKey, IIdentityState } from '@/types'
export const useIdentityGetters = {
    getGreeting: (state: IIdentityState) => `Hello, ${state.username ||'Guest'}!`,
    isConnected: (state: IIdentityState) => state.isAuthenticated && !!state.username,
    hasPublicKeys: (state: IIdentityState) => state.publicKeys.length > 0,
    getPublicKeyById: (state: IIdentityState) => (id: number) => {
        return state.publicKeys.find((key: IIdentityPublicKey) => key.id === id)
    },
    getAuthPublicKey: (state: IIdentityState) => {
        return state.publicKeys.find((key: IIdentityPublicKey) => key.purpose === 0)
    },
    getEncryptionPublicKey: (state: IIdentityState) => {
        return state.publicKeys.find((key: IIdentityPublicKey) => key.purpose === 1)
    },
}
