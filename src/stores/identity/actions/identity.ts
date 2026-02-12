// src/stores/identity/actions/identity.ts

import { useIdentity } from '@/composables/useIdentity'
import { invoke } from '@/utils/tauri'
import { DAPIService } from '@/services/identity/discovery/DAPIService'
import { commands } from '@/bindings'
import type { IIdentityState, IIdentity } from '@/types/identity'
import { transformPublicKeys } from '../utils'
/**
 * Normalizes command responses based on the Rust Specta/Standard.
 * Handles {success, data, error}, {success, payload, error}, and raw objects.
 */
export function normalizeResult<T>(res: any): { success: boolean; data: T | null; error: { message: string } | null } {
    const isSuccess = !!(res?.success === true || res?.status === 'success' || res?.status === 'ok');
    let data: T | null = null;
    if (isSuccess) {
        if (res && typeof res === 'object') {
            if (res.hasOwnProperty('data')) {
                data = res.data;
            } else if (res.hasOwnProperty('payload')) {
                data = res.payload;
            } else {
                // If it is success: true but has other keys, the object itself might be the data (raw mocks)
                const otherKeys = Object.keys(res).filter(k => k !== 'success' && k !== 'status');
                data = otherKeys.length > 0 ? res : null;
            }
        } else {
            data = res;
        }
    }
    let errorObj: { message: string } | null = null;
    if (!isSuccess) {
        const rawError = res?.error ?? res?.errorMessage ?? res?.message ?? res;
        if (typeof rawError === 'string') {
            errorObj = { message: rawError };
        } else if (rawError && typeof rawError === 'object') {
            const msg = rawError.message || rawError.error?.message || rawError.error || JSON.stringify(rawError);
            errorObj = { message: String(msg) };
        } else {
            errorObj = { message: 'Unknown error' };
        }
    }
    return { success: isSuccess, data, error: errorObj };
}
export const identityActions = {
    async saveIdentity(this: any, network: string, payload: any): Promise<any> {
        const fullPayload = {
            username: payload.username || '',
            balance: payload.balance || '0',
            revision: payload.revision || 0,
            publicKeys: payload.publicKeys || [],
            ...payload
        }
        const response = await commands.saveIdentity(network, fullPayload)
        const result = normalizeResult<any>(response)
        if (result.success) {
            this.identities[fullPayload.identityId] = {
                ...fullPayload,
                identityId: fullPayload.identityId
            }
        }
        return result
    },
    async saveKeys(this: any, network: string, identityId: string, keys: any[]): Promise<any> {
        const response = await commands.saveKeys(network, identityId, keys)
        return normalizeResult<boolean>(response)
    },
    async loadKeystore(this: any, network: string): Promise<any> {
        const response = await commands.loadKeystore(network)
        const result = normalizeResult<any>(response)
        if (result.success && result.data) {
            this.keystore = result.data
        }
        return result
    },
    async searchUserIdentities(this: IIdentityState): Promise<IIdentity[]> {
        const identityComposable = useIdentity()
        const response = await identityComposable.searchUserIdentities()
        return (response as IIdentity[]) || []
    },
    async getPublicKeys(this: IIdentityState, identityId: string, network: 'mainnet' | 'testnet'): Promise<any> {
        return DAPIService.getIdentityById(identityId, network)
    },
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
    async refreshIdentity(this: IIdentityState): Promise<void> {
        if (!this.identityId) return
        const identityComposable = useIdentity()
        const currentIdx = this.identityIdx || 0
        const response: any = await identityComposable.queryIdentityDetails(this.identityId, currentIdx)
        if (response?.success && response.data) {
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
            this.balance = updatedIdentity.balance
            this.publicKeys = updatedIdentity.publicKeys
            this.revision = updatedIdentity.revision
            this.username = updatedIdentity.username || null
        }
    },
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
    async updateIdentityMetadata(this: IIdentityState, identityId: string, updates: Partial<IIdentity>): Promise<void> {
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
    async loadPublicKeys(this: IIdentityState): Promise<any[]> {
        if (!this.identityId) return []
        const network = 'testnet'
        const response = await this.getPublicKeys(this.identityId, network)
        return response?.success ? transformPublicKeys(response.data.publicKeys) : []
    }
}
