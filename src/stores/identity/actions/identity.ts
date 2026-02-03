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
    async saveIdentity(this: any, network: string, payload: any) {
        const result = await ErrorBoundary.wrap(async () => {
            const sanitizedPayload: ISaveIdentityPayload = {
                identityId: payload.identityId,
                username: payload.username || payload.identityId || 'default_user',
                identityIdx: payload.identityIdx ?? 0,
                dpnsUsername: payload.dpnsUsername ?? null,
                balance: String(payload.balance ?? '0'),
                publicKeys: payload.publicKeys ?? [],
                revision: payload.revision ?? 0,
                createdAt: payload.createdAt ?? new Date().toISOString(),
                activeIdentityId: payload.activeIdentityId ?? payload.identityId
            }

            const response = await commands.saveIdentity(network, sanitizedPayload)
            if (response.status === 'error') throw new Error(response.error)

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
        return result.data
    },

    async saveKeys(this: any, network: string, identityId: string, keys: any[]) {
        const result = await ErrorBoundary.wrap(async () => {
            const normalizedKeys: IPrivateKeyEntry[] = keys.map(k => ({
                identityId: identityId,
                keyId: k.keyId ?? k.key_id ?? 0,
                purpose: k.purpose ?? 3,
                securityLevel: k.securityLevel ?? k.security_level ?? 0,
                keyType: k.keyType ?? k.key_type ?? 'ECDSA_SECP256K1',
                privateKey: k.privateKey ?? k.private_key,
                publicKey: k.publicKey ?? k.public_key ?? '',
                derivedFromMnemonic: k.derivedFromMnemonic ?? k.derived_from_mnemonic ?? true,
                createdAt: k.createdAt ?? k.created_at ?? new Date().toISOString(),
                lastUsed: new Date().toISOString()
            }))

            const response = await commands.saveKeys(network, identityId, normalizedKeys)
            if (response.status === 'error') throw new Error(response.error)

            if (this.keystore?.identities) {
                this.keystore.identities[identityId] = normalizedKeys
            }
            return response.data
        }, 'SAVE_KEYS_FAILED')
        return result.data
    },

    async loadKeystore(this: any, network: string) {
        const result = await ErrorBoundary.wrap(async () => {
            const response = await commands.loadKeystore(network)
            if (response.status === 'error') throw new Error(response.error)
            if (this.keystore) this.keystore = response.data
            return response.data
        }, 'LOAD_KEYSTORE_FAILED')
        return result.data
    },

    async deleteIdentity(this: any, network: string, identityId: string | null = null) {
        const result = await ErrorBoundary.wrap(async () => {
            const response = await commands.deleteIdentity(network, identityId)
            if (response.status === 'error') throw new Error(response.error)

            if (identityId && this.identities) {
                delete this.identities[identityId]
                if (this.identityId === identityId) this.identityId = null
            } else {
                this.identities = {}
                this.identityId = null
            }
            return response.data
        }, 'DELETE_IDENTITY_FAILED')
        return result.data
    },

    async searchUserIdentities(this: any) {
        const identityComposable = useIdentity()
        const result = await ErrorBoundary.wrap(async () => {
            const response = await identityComposable.searchUserIdentities()
            const identities = response.data || []
            this.discoveredIdentities = identities
            return identities
        }, 'SEARCH_USER_IDENTITIES_FAILED')
        return result.data || []
    },

    async queryIdentityDetails(this: any, identityId: string, identityIdx: number, sdk?: any) {
        const identityComposable = useIdentity()
        const result = await ErrorBoundary.wrap(async () => {
            const response = await identityComposable.queryIdentityDetails(identityId, identityIdx, sdk)
            const details = response.data
            if (this.identities && this.identities[identityId]) {
                this.identities[identityId] = { ...this.identities[identityId], ...details }
            }
            return details
        }, 'QUERY_IDENTITY_DETAILS_FAILED')
        return result.data
    },

    async getPublicKeys(this: any): Promise<any[]> {
        const result = await ErrorBoundary.wrap(async () => {
            if (this.publicKeys?.length > 0) return this.publicKeys
            if (this.identityId) {
                const identityComposable = useIdentity()
                const response = await identityComposable.queryIdentityDetails(
                    this.identityId,
                    this.identity?.identityIdx || 0
                )
                return response.data?.publicKeys || []
            }
            return []
        }, 'GET_PUBLIC_KEYS_FAILED')
        return result.data || []
    }
})
