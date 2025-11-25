// src/stores/identity/actions/storage.ts

import { invoke } from '@tauri-apps/api/core'
import type { IdentityData, IdentityPublicKey, State } from '../types'
export const storageActions = () => ({
    async saveToStorage(this: any) {
        const state = this as State
        try {
            const identityData: IdentityData = {
                username: state.username || '',
                identity_id: state.identity?.id || '',
                balance: state.balance,
                is_authenticated: state.isAuthenticated,
                public_keys: state.publicKeys.length > 0 ? state.publicKeys : null,
                revision: state.revision,
                created_at: state.lastConnected,
                public_key_ids: state.publicKeys.map((key: IdentityPublicKey) => key.id),
            }
            await invoke('save_identity_data', { identityData })
            console.log('Identity data saved to storage')
        } catch (err) {
            console.error('Failed to save identity data to storage:', err)
        }
    },
    async loadFromStorage(this: any) {
        const state = this as State
        try {
            const identityData = await invoke('load_identity_data') as IdentityData | null
            if (identityData) {
                console.log('Loaded identity data from storage:', identityData)
                state.username = identityData.username || null
                state.balance = identityData.balance
                state.isAuthenticated = identityData.is_authenticated
                state.publicKeys = identityData.public_keys || []
                state.revision = identityData.revision
                state.lastConnected = identityData.created_at
            }
        } catch (err) {
            console.error('Failed to load identity data from storage:', err)
        }
    },
    async updateIdentityWithSdkData(this: any, identityId: string, sdkPublicKeys: any[], sdkRevision: bigint | number) {
        const state = this as State
        try {
            const publicKeys: IdentityPublicKey[] = sdkPublicKeys.map((key: any, index: number) => ({
                id: index,
                type_: key.type || 'ecdsa',
                purpose: Number(key.purpose || 0),
                security_level: Number(key.securityLevel || 0),
                read_only: Boolean(key.readOnly || false),
                disabled_at: key.disabledAt || null
            }))
            const revisionNum = typeof sdkRevision === 'bigint' ? Number(sdkRevision) : sdkRevision
            await invoke('update_identity_with_sdk_data', {
                identityId,
                publicKeys,
                revision: revisionNum,
                publicKeyIds: publicKeys.map(key => key.id)
            })
            state.publicKeys = publicKeys
            state.revision = revisionNum
            state.lastConnected = new Date().toISOString()
            console.log('Identity SDK data saved successfully')
        } catch (error) {
            console.error('Failed to update identity with SDK data:', error)
            throw error
        }
    },
})
