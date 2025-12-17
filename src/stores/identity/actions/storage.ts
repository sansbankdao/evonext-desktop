// src/stores/identity/actions/storage.ts

import { StoreManager } from '@/utils/store'
import { ErrorBoundary } from '@/utils/errors'
import type { IIdentityState, IIdentityData, IIdentityPublicKey } from '@/types'
import {
    validateIdentityData,
    createDefaultIdentityData,
    transformPublicKeys
} from './utils'
export const storageActions = () => ({
    async saveToStorage(this: any) {
        return ErrorBoundary.wrap(async () => {
            const state = this as IIdentityState
            const identityData: IIdentityData = {
                username: state.username || '',
                identity_id: state.identity?.id || '',
                identity_idx: state.identity?.identity_idx || 0,
                balance: state.balance,
                is_authenticated: state.isAuthenticated,
                public_keys: state.publicKeys.length > 0 ? state.publicKeys : null,
                revision: state.revision,
                created_at: state.lastConnected,
                public_key_ids: state.publicKeys.map((key: IIdentityPublicKey) => key.id),
            }
            await StoreManager.save('identity', identityData)
            console.log('Identity data saved to storage')
        }, 'SAVE_IDENTITY_STORAGE_FAILED')
    },
    async loadFromStorage(this: any) {
        return ErrorBoundary.wrap(async () => {
            const state = this as IIdentityState
            const identityData = await StoreManager.load<IIdentityData>('identity')
            if (identityData && validateIdentityData(identityData)) {
                console.log('Loaded identity data from storage:', identityData)
                state.username = identityData.username || null
                state.balance = identityData.balance
                state.isAuthenticated = identityData.is_authenticated
                state.publicKeys = identityData.public_keys || []
                state.revision = identityData.revision
                state.lastConnected = identityData.created_at
            } else {
                console.log('No valid identity data found in storage')
                // Initialize with defaults if no data found
                const defaultData = createDefaultIdentityData()
                await StoreManager.save('identity', defaultData)
            }
        }, 'LOAD_IDENTITY_STORAGE_FAILED')
    },
    // ... rest of the code ...
})
