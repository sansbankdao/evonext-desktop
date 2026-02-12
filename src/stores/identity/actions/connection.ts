// src/stores/identity/actions/connection.ts

import { invoke } from '@/utils/tauri'
import type { ConnectionResult } from '@/types/identity'
import { transformPublicKeys, validateIdentityData } from '../utils'
export const connectionActions = {
    async connectWithSeed(this: any, seedPhrase: string, network: string, identityId: string, identityIndex: number): Promise<ConnectionResult> {
        this.isConnecting = true
        this.connectionError = null
        try {
            const rawData = await invoke<any>('get_identity_details', { identityId, idx: identityIndex, network })
            // Unwrapping unified result if present
            const identityData = rawData?.data || rawData;
            if (!identityData) throw new Error('Identity details not found');
            const mappedPublicKeys = transformPublicKeys(identityData.publicKeys || [])
            const res = await this.saveIdentityWithKeys(network, {
                identityId,
                identityIdx: identityIndex,
                publicKeys: mappedPublicKeys,
                balance: identityData.balance || '0',
                username: identityData.username || '',
                mnemonic: seedPhrase
            })
            if (res.success) {
                this.identityId = identityId
                this.identityIdx = identityIndex
                this.publicKeys = mappedPublicKeys
                this.balance = identityData.balance
                this.isConnected = true
                this.isAuthenticated = true
                await this.saveToStorage()
                return { success: true, identityId }
            }
            return { success: false, error: res.error?.message || 'Connection failed' }
        } catch (e) {
            this.connectionError = String(e)
            return { success: false, error: String(e) }
        } finally {
            this.isConnecting = false
        }
    },
    async connectWithSingleKey(this: any, privateKey: string, identityId: string, network: string): Promise<ConnectionResult> {
        return this.connectWithPrivateKey(privateKey, identityId, network as any)
    },
    async connectWithPrivateKey(this: any, privateKey: string, identityId: string, network: string): Promise<ConnectionResult> {
        this.isConnecting = true
        try {
            const rawData = await invoke<any>('get_identity_details', { identityId, network })
            const identityData = rawData?.data || rawData;
            if (!identityData) throw new Error('Identity details not found');
            const res = await this.saveIdentityWithKeys(network, {
                identityId,
                publicKeys: [{ id: 0, privateKey, purpose: 3, securityLevel: 0 }],
                balance: identityData.balance || '0',
                username: identityData.username || ''
            })
            if (res.success) {
                this.identityId = identityId
                this.isConnected = true
                await this.refreshIdentity()
                return { success: true, identityId }
            }
            return { success: false, error: res.error?.message || 'Connection failed' }
        } catch (e) {
            return { success: false, error: String(e) }
        } finally {
            this.isConnecting = false
        }
    },
    async saveIdentityWithKeys(this: any, network: string, identityOrPayload: any, keysOverride?: any[]): Promise<any> {
        const payload = keysOverride
            ? { ...identityOrPayload, publicKeys: keysOverride }
            : identityOrPayload
        const res = await (this as any).saveIdentity(network, payload)
        if (res.success && payload.publicKeys) {
            await (this as any).saveKeys(network, payload.identityId, payload.publicKeys)
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
