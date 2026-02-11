// src/stores/identity/actions/identity.ts

import { useIdentity } from '@/composables/useIdentity'
import { invoke } from '@/utils/tauri'
import { DAPIService } from '@/services/identity/discovery/DAPIService'
import type { IIdentityState, IIdentity } from '@/types/identity'
import { transformPublicKeys } from '../utils'

export const identityActions = {
    /**
     * Lists all local identities stored in the system
     */
    async searchUserIdentities(this: IIdentityState): Promise<IIdentity[]> {
        const identityComposable = useIdentity()
        const response = await identityComposable.searchUserIdentities()
        return (response as IIdentity[]) || []
    },

    /**
     * Fetches current public keys for a specific identity from the network
     */
    async getPublicKeys(
        this: IIdentityState,
        identityId: string,
        network: 'mainnet' | 'testnet'
    ): Promise<any> {
        return DAPIService.getIdentityById(identityId, network)
    },

    /**
     * Switches the active identity and refreshes its data
     */
    async switchIdentity(this: IIdentityState, identityId: string): Promise<void> {
        if (this.identityId === identityId) return
        this.isConnecting = true
        try {
            const identity = this.identities[identityId]
            if (!identity) throw new Error('Identity not found in local store')
            this.identityId = identityId
            this.identityIdx = identity.identityIdx
            this.username = identity.username || null
            this.displayName = identity.displayName || ""
            await this.refreshIdentity()
            await this.saveToStorage()
        } catch (e) {
            console.error('[IdentityStore] Switch failed:', e)
        } finally {
            this.isConnecting = false
        }
    },

    /**
     * Refreshes the active identity data from the Dash Platform
     */
    async refreshIdentity(this: IIdentityState): Promise<void> {
        if (!this.identityId) return
        const identityComposable = useIdentity()
        const currentIdx = this.identityIdx || 0
        const response: any = await identityComposable.queryIdentityDetails(
            this.identityId,
            currentIdx
        )
        if (response && response.success && response.data) {
            const details = response.data
            const updatedIdentity: IIdentity = {
                ...this.identities[this.identityId],
                identityId: this.identityId,
                identityIdx: currentIdx,
                balance: details.balance || '0',
                revision: details.revision || 0,
                publicKeys: transformPublicKeys(details.publicKeys || []),
                username: details.username || this.username,
                displayName: details.displayName || this.displayName
            }
            this.identities[this.identityId] = updatedIdentity

            // Sync top-level state if it's the current identity
            this.balance = updatedIdentity.balance
            this.publicKeys = updatedIdentity.publicKeys
            this.revision = updatedIdentity.revision
            this.username = updatedIdentity.username || null
        }
    },

    /**
     * Removes an identity from the local store
     */
    async deleteIdentity(this: IIdentityState, identityId: string): Promise<void> {
        if (this.identities[identityId]) {
            delete this.identities[identityId]
            if (this.identityId === identityId) {
                this.identityId = null
                this.isConnected = false
                this.isAuthenticated = false
            }
            await this.saveToStorage()
            await invoke('delete_local_identity', { identityId })
        }
    },

    /**
     * Updates local metadata for an identity
     */
    async updateIdentityMetadata(
        this: IIdentityState,
        identityId: string,
        updates: Partial<IIdentity>
    ): Promise<void> {
        if (this.identities[identityId]) {
            this.identities[identityId] = {
                ...this.identities[identityId],
                ...updates
            }
            if (this.identityId === identityId) {
                if (updates.username) this.username = updates.username
                if (updates.displayName) this.displayName = updates.displayName
            }
            await this.saveToStorage()
        }
    },

    /**
     * Action-wrapped public key fetcher
     */
    async loadPublicKeys(this: IIdentityState): Promise<any[]> {
        if (!this.identityId) return []

        // Use the actual network context. Defaulting to testnet for safe discovery.
        const network = 'testnet'

        const response = await this.getPublicKeys(
            this.identityId,
            network
        )
        return (response && response.success) ? transformPublicKeys(response.data.publicKeys) : []
    }
}
