// src/stores/identity/getters.ts
import type { IIdentityPublicKey, IState } from './types'

export const useIdentityGetters = {
    getGreeting: (state: IState) => `Hello, ${state.username || 'Guest'}!`,
    isConnected: (state: IState) => state.isAuthenticated && !!state.username,
    hasPublicKeys: (state: IState) => state.publicKeys.length > 0,
    getPublicKeyById: (state: IState) => (id: number) => {
        return state.publicKeys.find((key: IIdentityPublicKey) => key.id === id)
    },
    getAuthPublicKey: (state: IState) => {
        return state.publicKeys.find((key: IIdentityPublicKey) => key.purpose === 0)
    },
    getEncryptionPublicKey: (state: IState) => {
        return state.publicKeys.find((key: IIdentityPublicKey) => key.purpose === 1)
    },
}
