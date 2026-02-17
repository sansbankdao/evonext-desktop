// src/stores/identity/actions/connection.ts

import { invoke } from '@/utils/tauri'
import type { ConnectionResult } from '@/types/identity'
import { transformPublicKeys, validateIdentityData } from '../utils'
import { normalizeResult } from './identity'
export const connectionActions = {
    async connectWithSeed(this: any, seedPhrase: string, network: string, identityId: string, identityIndex: number): Promise<ConnectionResult> {
        this.isConnecting = true
        this.connectionError = null
        try {
            const raw = await invoke<any>('get_identity_info', { identityId, network })
            const resDetails = normalizeResult<any>(raw)
            if (!resDetails.success || !resDetails.data) {
                throw new Error(resDetails.error?.message || 'Identity details not found')
            }
            const identityData = resDetails.data
            const mappedPublicKeys = transformPublicKeys(identityData.publicKeys || [])
            const resSave = await this.saveIdentityWithKeys(network, {
                identityId,
                identityIdx: identityIndex,
                publicKeys: mappedPublicKeys,
                balance: identityData.balance || '0',
                username: identityData.username || '',
                mnemonic: seedPhrase
            })
            if (resSave.success) {
                this.identityId = identityId
                this.identityIdx = identityIndex
                this.publicKeys = mappedPublicKeys
                this.balance = identityData.balance
                this.isConnected = true
                this.isAuthenticated = true
                await this.saveToStorage()
                return { success: true, identityId }
            }
            return { success: false, error: resSave.error?.message || 'Connection failed' }
        } catch (e: any) {
            const errorMsg = e?.message || String(e)
            this.connectionError = errorMsg
            return { success: false, error: errorMsg }
        } finally {
            this.isConnecting = false
        }
    },
    async connectWithSingleKey(this: any, privateKey: string, identityId: string, network: string): Promise<ConnectionResult> {
        return this.connectWithPrivateKey(privateKey, identityId, network as any)
    },
    async connectWithPrivateKey(this: any, privateKey: string, identityId: string, network: string): Promise<ConnectionResult> {
        this.isConnecting = true
        this.connectionError = null
        try {
            const raw = await invoke<any>('get_identity_info', { identityId, network })
            const resDetails = normalizeResult<any>(raw)
            if (!resDetails.success || !resDetails.data) {
                throw new Error(resDetails.error?.message || 'Identity details not found')
            }
            const identityData = resDetails.data
            const mappedPublicKeys = transformPublicKeys(identityData.publicKeys || [])

            // Save identity details to .identity-{network}.json
            const resSave = await this.saveIdentity(network, {
                identityId,
                publicKeys: mappedPublicKeys.map((pk: any) => ({
                    id: pk.idx,
                    type: pk.keyType,
                    purpose: pk.purpose,
                    securityLevel: pk.securityLevel,
                    data: pk.data || '',
                    readOnly: pk.readOnly || false,
                    disabledAt: pk.disabledAt || null
                })),
                balance: identityData.balance || '0',
                username: identityData.dpnsUsername || identityData.username || '',
                revision: Number(identityData.revision || 0),
                dpnsUsername: identityData.dpnsUsername || null,
                activeIdentityId: identityId
            })

            if (!resSave?.success) {
                console.warn('[connectWithPrivateKey] Identity save failed:', resSave)
            }

            // Save the private key to keystore (.safu-{network}.json)
            await this.saveKeys(network, identityId, [{
                identityId,
                keyId: 0,
                purpose: 0,
                securityLevel: 0,
                keyType: 'ECDSA_HASH160',
                privateKey,
                publicKey: '',
                createdAt: new Date().toISOString(),
                lastUsed: new Date().toISOString()
            }])

            // Update in-memory store state
            this.identityId = identityId
            this.publicKeys = mappedPublicKeys
            this.balance = identityData.balance || '0'
            this.username = identityData.dpnsUsername || identityData.username || null
            this.displayName = identityData.dpnsUsername || identityData.username || ''
            this.isConnected = true
            this.isAuthenticated = true

            return { success: true, identityId }
        } catch (e: any) {
            const errorMsg = e?.message || String(e)
            this.connectionError = errorMsg
            return { success: false, error: errorMsg }
        } finally {
            this.isConnecting = false
        }
    },
    async saveIdentityWithKeys(this: any, network: string, identityOrPayload: any, keysOverride?: any[]): Promise<any> {
        const payload = keysOverride
            ? { ...identityOrPayload, publicKeys: keysOverride }
            : identityOrPayload
        const res = await this.saveIdentity(network, payload)
        if (res.success && payload.publicKeys) {
            await this.saveKeys(network, payload.identityId, payload.publicKeys)
        }
        return res
    },
    async loadFromStorage(this: any) {
        try {
            const data = await invoke<any>('load_identity_store')
            if (data && validateIdentityData(data)) {
                this.identityId = data.identityId
                this.identities = data.identities || {}
                this.isConnected = !!this.identityId
            }
        } catch (e) {
            console.warn('[ConnectionStore] No local storage found')
        }
    },
    async saveToStorage(this: any) {
        try {
            await invoke('save_identity_store', { identityId: this.identityId, identities: this.identities })
        } catch (e) {
            console.error('[ConnectionStore] Save failed:', e)
        }
    },
    async clearStorage(this: any) {
        this.identityId = null
        this.identities = {}
        this.isConnected = false
        this.isAuthenticated = false
        await invoke('clear_identity_store')
    },
    clearConnectionError(this: any) {
        this.connectionError = null
    }
}
