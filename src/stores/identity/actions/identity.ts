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
     * Normalizes inputs to ensure Rust-compatible types.
     */
    async saveIdentity(this: any, network: string, payload: any) {
        return ErrorBoundary.wrap(async () => {
            // NORMALIZE: Ensure strict compliance with ISaveIdentityPayload
            // Non-nullable fields now use strict fallbacks ('0' for balance, 0 for revision)
            const sanitizedPayload: ISaveIdentityPayload = {
                identityId: payload.identityId,
                username: payload.username || payload.identityId || 'default_user',
                identityIdx: payload.identityIdx ?? 0,
                dpnsUsername: payload.dpnsUsername ?? null,
                balance: payload.balance ?? '0',
                publicKeys: payload.publicKeys ?? [],
                revision: payload.revision ?? 0,
                createdAt: payload.createdAt ?? new Date().toISOString(),
                activeIdentityId: payload.activeIdentityId ?? payload.identityId
            }

            const response = await commands.saveIdentity(network, sanitizedPayload)

            if (response.status === 'error') {
                throw new Error(response.error)
            }

            // Sync state
            if (this.identities) {
                const updatedIdentity: IIdentityData = {
                    ...sanitizedPayload,
                    isAuthenticated: true,
                    publicKeyIds: null
                }
                this.identities[payload.identityId] = updatedIdentity

                if (payload.activeIdentityId || !this.identityId) {
                    this.identityId = payload.identityId
                }
            }

            log('debug', `Identity ${payload.identityId} saved and store patched.`)
            return response.data
        }, 'SAVE_IDENTITY_FAILED')
    },

    /**
     * Persist private keys to the Rust backend (safu store).
     * This is the "Bouncer" that fixes messy UI data (casing/nulls).
     */
    async saveKeys(this: any, network: string, identityId: string, keys: any[]) {
        return ErrorBoundary.wrap(async () => {
            // NORMALIZE: Fix "missing field privateKey" and "invalid type null"
            const normalizedKeys: IPrivateKeyEntry[] = keys.map(k => ({
                identityId: identityId,
                keyId: k.keyId ?? k.key_id ?? 0,
                purpose: k.purpose ?? 3,
                securityLevel: k.securityLevel ?? k.security_level ?? 0,
                keyType: k.keyType ?? k.key_type ?? 'ECDSA_SECP256K1',
                privateKey: k.privateKey ?? k.private_key, // Fix casing
                publicKey: k.publicKey ?? k.public_key ?? '',
                derivedFromMnemonic: k.derivedFromMnemonic ?? k.derived_from_mnemonic ?? true,
                createdAt: k.createdAt ?? k.created_at ?? new Date().toISOString(),
                lastUsed: new Date().toISOString()
            }))

            // Final check: Don't send empty keys to Rust
            if (normalizedKeys.some(k => !k.privateKey)) {
                throw new Error("Validation Error: Missing privateKey in payload")
            }

            const response = await commands.saveKeys(network, identityId, normalizedKeys)

            if (response.status === 'error') {
                throw new Error(response.error)
            }

            if (this.keystore?.identities) {
                this.keystore.identities[identityId] = normalizedKeys
            }

            log('debug', `Keystore for ${identityId} successfully saved to backend.`)
            return response.data
        }, 'SAVE_KEYS_FAILED')
    },

    /**
     * Hydrate the store's keystore data from the backend.
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

            if (response.status === 'error') throw new Error(response.error)

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

    async searchUserIdentities(this: any) {
        const identityComposable = useIdentity()
        return ErrorBoundary.wrap(async () => {
            const identities = await identityComposable.searchUserIdentities()
            this.discoveredIdentities = identities
            return identities
        }, 'SEARCH_USER_IDENTITIES_FAILED')
    },

    async queryIdentityDetails(this: any, identityId: string, identityIdx: number, sdk?: any) {
        const identityComposable = useIdentity()
        return ErrorBoundary.wrap(async () => {
            const details = await identityComposable.queryIdentityDetails(identityId, identityIdx, sdk)
            if (this.identities && this.identities[identityId]) {
                this.identities[identityId] = { ...this.identities[identityId], ...details }
            }
            return details
        }, 'QUERY_IDENTITY_DETAILS_FAILED')
    },

    async getPublicKeys(this: any): Promise<any[]> {
        return ErrorBoundary.wrap(async () => {
            if (this.publicKeys?.length > 0) return this.publicKeys
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
