// src/stores/identity/getters.ts
import type { IdentityPublicKey, State } from './types'

export const useIdentityGetters = {
    getGreeting: (state: State) => `Hello, ${state.username || 'Guest'}!`,
    isConnected: (state: State) => state.isAuthenticated && !!state.username,
    hasPublicKeys: (state: State) => state.publicKeys.length > 0,
    getPublicKeyById: (state: State) => (id: number) => {
        return state.publicKeys.find((key: IdentityPublicKey) => key.id === id)
    },
    getAuthPublicKey: (state: State) => {
        return state.publicKeys.find((key: IdentityPublicKey) => key.purpose === 0)
    },
    getEncryptionPublicKey: (state: State) => {
        return state.publicKeys.find((key: IdentityPublicKey) => key.purpose === 1)
    },
}
