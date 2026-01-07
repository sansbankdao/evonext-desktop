// src/stores/identity/actions/keys.ts
import { getTransferKey } from './get_key'

// We act as a central export point for key logic
// This isolates file-based logic from WASM-based logic in useKeyManagement

export {
    // Export specialized helper created for this regression
    getTransferKey,

    // Re-export common helpers via dynamic import to avoid circular deps
    // This allows UI to import everything from 'stores/identity/actions/keys'
    // getAuthKey: () => import('@/composables/useKeyManagement').then(m => m.getAuthKey()),
    // getEncryptionKey: () => import('@/composables/useKeyManagement').then(m => m.getEncryptionKey())
}
