// src/stores/identity/actions/identity.ts

import { commands } from '@/types/rust_generated'
import type {
    ISaveIdentityPayload,
    IPrivateKeyEntry,
    IIdentityData
} from '@/types/rust_generated'
import { ErrorBoundary } from '@/utils/errors'
import { log } from '@/utils/env'
import { useIdentity } from '@/composables/useIdentity'

export const identityActions = () => ({
    /**
     * Persist identity data to the Rust backend and update store state.
     */
    async saveIdentity(this: any, network: string, payload: ISaveIdentityPayload) {
        return ErrorBoundary.wrap(async () => {
            const response = await commands.saveIdentity(network, payload)

            if (response.status === 'error') {
                throw new Error(response.error)
            }

            // After successful backend save, patch the local state
            // This ensures the UI updates globally across the app
            if (this.identities) {
                const updatedIdentity: IIdentityData = {
                    username: payload.username || payload.identityId,
                    identityId: payload.identityId,
                    identityIdx: payload.identityIdx || 0,
                    dpnsUsername: payload.dpnsUsername,
                    balance: payload.balance,
                    isAuthenticated: true,
                    publicKeys: payload.publicKeys, // Normalized in Rust, but we keep local sync
                    revision: payload.revision,
                    createdAt: payload.createdAt || new Date().toISOString(),
                    publicKeyIds: null
                }

                this.identities[payload.identityId] = updatedIdentity

                if (payload.activeIdentityId || !this.identityId) {
                    this.identityId = payload.identityId
                }
            }

            log('debug', `Identity ${payload.identityId} successfully saved and state patched.`)
            return response.data
        }, 'SAVE_IDENTITY_FAILED')
    },

    /**
     * Persist private keys to the Rust backend (safu store)
     */
    async saveKeys(this: any, network: string, identityId: string, keys: IPrivateKeyEntry[]) {
        return ErrorBoundary.wrap(async () => {
            const response = await commands.saveKeys(network, identityId, keys)

            if (response.status === 'error') {
                throw new Error(response.error)
            }

            // Sync the local keystore state if your store tracks it
            if (this.keystore?.identities) {
                this.keystore.identities[identityId] = keys
            }

            log('debug', `Keystore for ${identityId} successfully updated in backend and store.`)
            return response.data
        }, 'SAVE_KEYS_FAILED')
    },

    /**
     * Hydrate the store's keystore data from the backend.
     * Essential for restoring state after app restart.
     */
    async loadKeystore(this: any, network: string) {
        return ErrorBoundary.wrap(async () => {
            const response = await commands.loadKeystore(network)
            if (response.status === 'error') throw new Error(response.error)

            if (this.keystore) {
                this.keystore = response.data
            }
            return response.data
        }, 'LOAD_KEYSTORE_FAILED')
    },

    /**
     * Remove an identity or clear the entire store from disk
     */
    async deleteIdentity(this: any, network: string, identityId: string | null = null) {
        return ErrorBoundary.wrap(async () => {
            const response = await commands.deleteIdentity(network, identityId)

            if (response.status === 'error') {
                throw new Error(response.error)
            }

            // Update local state to remove the identity
            if (identityId && this.identities) {
                delete this.identities[identityId]
                if (this.identityId === identityId) {
                    this.identityId = null
                }
            } else {
                this.identities = {}
                this.identityId = null
            }

            return response.data
        }, 'DELETE_IDENTITY_FAILED')
    },

    // =====================================================
    // Logic Delegated to Composables (with Store Sync)
    // =====================================================

    async searchUserIdentities(this: any) {
        const identityComposable = useIdentity()
        return ErrorBoundary.wrap(async () => {
            const identities = await identityComposable.searchUserIdentities()
            // Ensure the store is aware of newly discovered identities
            this.discoveredIdentities = identities
            return identities
        }, 'SEARCH_USER_IDENTITIES_FAILED')
    },

    async queryIdentityDetails(this: any, identityId: string, identityIdx: number, sdk?: any) {
        const identityComposable = useIdentity()
        return ErrorBoundary.wrap(async () => {
            const details = await identityComposable.queryIdentityDetails(identityId, identityIdx, sdk)

            // Patch the core identity data with the results from the query
            if (this.identities && this.identities[identityId]) {
                this.identities[identityId] = { ...this.identities[identityId], ...details }
            }

            return details
        }, 'QUERY_IDENTITY_DETAILS_FAILED')
    },

    async getPublicKeys(this: any): Promise<any[]> {
        return ErrorBoundary.wrap(async () => {
            // Priority 1: Current Store State
            if (this.publicKeys?.length > 0) {
                return this.publicKeys
            }

            // Priority 2: Fetch via Composable if Identity exists
            if (this.identityId) {
                const identityComposable = useIdentity()
                const details = await identityComposable.queryIdentityDetails(
                    this.identityId,
                    this.identity?.identityIdx || 0
                )
                return details?.publicKeys || []
            }

            return []
        }, 'GET_PUBLIC_KEYS_FAILED')
    }
})
