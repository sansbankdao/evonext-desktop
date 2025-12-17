// src/stores/identity/actions/storage.ts
import { invoke } from '@tauri-apps/api/core'
import { StoreManager } from '@/utils/store'
import { ErrorBoundary } from '@/utils/errors'
import type { IIdentityState, IIdentityData, IIdentityPublicKey } from '@/types'
import { validateIdentityData, createDefaultIdentityData, transformPublicKeys } from '../utils'
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
            await StoreManager.save('identity', 'identity', identityData)
            console.log('Identity data saved to storage')
        }, 'SAVE_IDENTITY_STORAGE_FAILED')
    },
    async loadFromStorage(this: any) {
        return ErrorBoundary.wrap(async () => {
            const state = this as IIdentityState
            const identityData = await StoreManager.load<IIdentityData>('identity', 'identity')
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
                await StoreManager.save('identity', 'identity', defaultData)
            }
        }, 'LOAD_IDENTITY_STORAGE_FAILED')
    },
    async updateIdentityWithSdkData(
        this: any,
        identityId: string,
        identityIdx: number,
        sdkPublicKeys: any[],
        sdkRevision: bigint | number
    ) {
        return ErrorBoundary.wrap(async () => {
            const state = this as IIdentityState
            const publicKeys: IIdentityPublicKey[] = transformPublicKeys(sdkPublicKeys, identityIdx)
            const revisionNum = typeof sdkRevision === 'bigint'
                ? Number(sdkRevision)
                : sdkRevision
            const identityData: IIdentityData = {
                username: state.username || '',
                identity_id: identityId,
                identity_idx: identityIdx,
                balance: state.balance,
                is_authenticated: state.isAuthenticated,
                public_keys: publicKeys.length > 0 ? publicKeys : null,
                revision: revisionNum,
                created_at: state.lastConnected || new Date().toISOString(),
                public_key_ids: publicKeys.map(key => key.id)
            }
            await StoreManager.save('identity', 'identity', identityData)
            state.publicKeys = publicKeys
            state.revision = revisionNum
            state.lastConnected = new Date().toISOString()
            console.log('Identity SDK data saved successfully')
        }, 'UPDATE_IDENTITY_SDK_DATA_FAILED')
    },
    async clearStorage(this: any) {
        return ErrorBoundary.wrap(async () => {
            await Promise.all([
                StoreManager.save('identity', 'identity', createDefaultIdentityData()),
                StoreManager.save('license', 'license', { license_id: '' }),
                StoreManager.save('mnemonic', 'mnemonic', { seed_phrase: '' }),
                StoreManager.save('keys', 'keys', {
                    identity_id: '',
                    auth_key: '',
                    transfer_key: '',
                    encryption_key: ''
                })
            ])
            console.log('All identity storage cleared')
        }, 'CLEAR_IDENTITY_STORAGE_FAILED')
    },
})
