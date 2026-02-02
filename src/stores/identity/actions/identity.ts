// src/stores/identity/actions/identity.ts

import { commands } from '@/types/rust_generated'
import type { ISaveIdentityPayload, IPrivateKeyEntry } from '@/types/rust_generated'
import { ErrorBoundary } from '@/utils/errors'
import { log } from '@/utils/env'
import { useIdentity } from '@/composables/useIdentity'

export const identityActions = () => ({
    /**
     * Persist identity data to the Rust backend
     */
    async saveIdentity(network: string, payload: ISaveIdentityPayload) {
        return ErrorBoundary.wrap(async () => {
            const result = await commands.saveIdentity(network, payload)
            if (result.status === 'error') {
                throw new Error(result.error)
            }
            log('debug', `Identity ${payload.identityId} successfully saved to backend.`)
            return result.data
        }, 'SAVE_IDENTITY_FAILED')
    },

    /**
     * Persist private keys to the Rust backend (safu store)
     */
    async saveKeys(network: string, identityId: string, keys: IPrivateKeyEntry[]) {
        return ErrorBoundary.wrap(async () => {
            const result = await commands.saveKeys(network, identityId, keys)
            if (result.status === 'error') {
                throw new Error(result.error)
            }
            log('debug', `Keystore for ${identityId} successfully updated.`)
            return result.data
        }, 'SAVE_KEYS_FAILED')
    },

    /**
     * Remove an identity or clear the entire store from disk
     */
    async deleteIdentity(network: string, identityId: string | null = null) {
        return ErrorBoundary.wrap(async () => {
            const result = await commands.deleteIdentity(network, identityId)
            if (result.status === 'error') {
                throw new Error(result.error)
            }
            return result.data
        }, 'DELETE_IDENTITY_FAILED')
    },

    // =====================================================
    // Logic Delegated to Composables
    // =====================================================

    async searchUserIdentities(this: any) {
        const identityComposable = useIdentity()
        return ErrorBoundary.wrap(async () => {
            return await identityComposable.searchUserIdentities()
        }, 'SEARCH_USER_IDENTITIES_FAILED')
    },

    async queryIdentityDetails(
        this: any,
        identityId: string,
        identityIdx: number,
        sdk?: any
    ) {
        const identityComposable = useIdentity()
        return ErrorBoundary.wrap(async () => {
            return await identityComposable.queryIdentityDetails(identityId, identityIdx, sdk)
        }, 'QUERY_IDENTITY_DETAILS_FAILED')
    },

    async getPublicKeys(this: any): Promise<any[]> {
        const store = this as any
        return ErrorBoundary.wrap(async () => {
            if (store.publicKeys && store.publicKeys.length > 0) {
                return store.publicKeys
            }
            if (store.identityId) {
                const identityComposable = useIdentity()
                const details = await identityComposable.queryIdentityDetails(
                    store.identityId,
                    store.identity?.identityIdx || 0
                )
                return details?.publicKeys || []
            }
            return []
        }, 'GET_PUBLIC_KEYS_FAILED')
    }
})
