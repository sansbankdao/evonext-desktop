// src/stores/identity/actions/storage.ts

import { StoreManager } from '@/utils/store'
import { ErrorBoundary } from '@/utils/errors'
import type {
    IIdentityState,
    IIdentityData,
    IIdentityPublicKey,
    IPublicKey
} from '@/types'

// Helper functions that should be defined in utils.ts
function validateIdentityData(data: any): data is IIdentityData {
    return data &&
        typeof data.username === 'string' &&
        typeof data.identity_id === 'string' &&
        typeof data.identity_idx === 'number' &&
        (data.balance === null || typeof data.balance === 'string')
}

function createDefaultIdentityData(): IIdentityData {
    return {
        username: '',
        identity_id: '',
        identity_idx: 0,
        balance: null,
        is_authenticated: false,
        public_keys: null,
        revision: null,
        created_at: null,
        public_key_ids: null
    }
}

// function transformPublicKeys(sdkKeys: any[]): IIdentityPublicKey[] {
//     return sdkKeys.map((key: any) => ({
//         id: key.id,
//         type_: key.type || '',
//         purpose: key.purpose || 0,
//         security_level: key.securityLevel || key.security_level || 0,
//         read_only: key.readOnly || false,
//         disabled_at: key.disabledAt || null,
//         data: key.data || (key.dataBytes || ''),
//         data_bytes: key.dataBytes || ''
//     }))
// }

export const storageActions = () => ({
    async saveToStorage(this: any) {
        return ErrorBoundary.wrap(async () => {
            const state = this as IIdentityState

            // Add default id to identity if it doesn't exist
            const identityId = state.identity?.id ||
                              (state.identity?.publicKeys && state.identity.publicKeys.length > 0 ?
                               String(state.identity.identity_idx) : '')
            const identityData: IIdentityData = {
                username: state.username || '',
                identity_id: identityId,
                identity_idx: state.identity?.identity_idx || 0,
                balance: state.balance,
                is_authenticated: state.isAuthenticated,
                public_keys: state.publicKeys.length > 0 ? state.publicKeys : null,
                revision: state.revision,
                created_at: state.lastConnected,
                public_key_ids: state.publicKeys.map((key: IIdentityPublicKey) => key.id || key.purpose || 0),
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

                // If we have identity data but no identity object, create a basic one
                if (!state.identity && identityData.identity_id) {
                    state.identity = {
                        identity_idx: identityData.identity_idx || 0,
                        publicKeys: identityData.public_keys?.map(key => ({
                            type: key.type_ === 'ECDSA_HASH160' ? 2 : 0, // Default to regular ECDSA
                            keyType: 'ECDSA_SECP256K1',
                            purpose: key.purpose,
                            securityLevel: key.security_level,
                            contractBounds: null,
                            data: key.data || '',
                            dataBytes: key.data_bytes || '',
                            readOnly: key.read_only,
                            disabledAt: key.disabled_at
                        } as IPublicKey)) || []
                    }
                }
            } else {
                console.log('No valid identity data found in storage')
                // Initialize with defaults if no data found
                const defaultData = createDefaultIdentityData()
                await StoreManager.save('identity', defaultData)
                // Reset state to defaults
                state.username = null
                state.identity = null
                state.balance = null
                state.balanceBigInt = undefined
                state.dashBigInt = undefined
                state.publicKeys = []
                state.revision = null
                state.isAuthenticated = false
                state.isConnecting = false
                state.connectionError = null
                state.premiumAccess = false
                state.lastConnected = null
            }
        }, 'LOAD_IDENTITY_STORAGE_FAILED')
    },

    async clearStorage(this: any) {
        return ErrorBoundary.wrap(async () => {
            await StoreManager.remove('identity')
            console.log('Identity storage cleared')
            // Reset state
            const state = this as IIdentityState
            state.username = null
            state.identity = null
            state.balance = null
            state.balanceBigInt = undefined
            state.dashBigInt = undefined
            state.publicKeys = []
            state.revision = null
            state.isAuthenticated = false
            state.isConnecting = false
            state.connectionError = null
            state.premiumAccess = false
            state.lastConnected = null
        }, 'CLEAR_IDENTITY_STORAGE_FAILED')
    },

    async getIdentityFromStorage(): Promise<IIdentityData | null> {
        return ErrorBoundary.wrap(async () => {
            const identityData = await StoreManager.load<IIdentityData>('identity')

            if (identityData && validateIdentityData(identityData)) {
                return identityData
            }

            return null
        }, 'GET_IDENTITY_FROM_STORAGE_FAILED')
    },

    async updateBalanceInStorage(this: any, newBalance: string) {
        return ErrorBoundary.wrap(async () => {
            const state = this as IIdentityState
            const identityData = await StoreManager.load<IIdentityData>('identity')

            if (identityData && validateIdentityData(identityData)) {
                identityData.balance = newBalance
                await StoreManager.save('identity', identityData)
                // Update state
                state.balance = newBalance
                state.balanceBigInt = BigInt(newBalance)
                state.dashBigInt = state.balanceBigInt / BigInt(100_000_000_000)
                console.log('Balance updated in storage:', newBalance)
            }
        }, 'UPDATE_BALANCE_STORAGE_FAILED')
    }
})
