// src/services/identity/discovery/DAPIService.ts

import type { DapiIdentityResponse } from '@/bindings'
import { invoke } from '@/utils/tauri'
export interface DAPIHashSearchResult {
    success: boolean
    data?: Partial<DapiIdentityResponse>
    error?: string
    searchType: 'unique' | 'non-unique' | 'none'
}
export class DAPIService {
    private static async unwrapResult(res: any): Promise<any> {
        if (!res) return null
        const data = res.result !== undefined ? res.result : res
        return Array.isArray(data) ? data[0] : data
    }
    static async queryIdentityByHash(
        publicKeyHash: string,
        network: 'mainnet' | 'testnet',
        unique: boolean
    ): Promise<DAPIHashSearchResult> {
        const searchType = unique ? 'unique' : 'non-unique'
        const cmd = unique ? 'get_identity_by_public_key_hash' : 'get_identity_by_non_unique_public_key_hash'
        try {
            const raw = await invoke<any>(cmd, { publicKeyHash, network })
            const data = await this.unwrapResult(raw)
            if (!data) return { success: false, error: 'No identity found', searchType }
            return { success: true, data, searchType }
        } catch (e: any) {
            return { success: false, error: e.message || String(e), searchType }
        }
    }
    static async getIdentityById(
        identityId: string,
        network: 'mainnet' | 'testnet'
    ): Promise<DAPIHashSearchResult> {
        try {
            const raw = await invoke<any>('get_identity_info', { identityId, network })
            const data = await this.unwrapResult(raw)
            if (!data) return { success: false, error: 'Identity not found', searchType: 'none' }
            return { success: true, data, searchType: 'none' }
        } catch (e: any) {
            return { success: false, error: e.message || String(e), searchType: 'none' }
        }
    }
    static async getDPNSUsername(
        identityId: string,
        network: 'mainnet' | 'testnet'
    ): Promise<string | null> {
        try {
            const raw = await invoke<any>('get_dpns_username', { identityId, network })
            const data = await this.unwrapResult(raw)
            if (!data) return null
            return typeof data === 'string' ? data : (data.username || null)
        } catch {
            return null
        }
    }
    static async getDPNSUsernames(
        identityId: string,
        network: 'mainnet' | 'testnet'
    ): Promise<string[] | null> {
        try {
            const raw = await invoke<any>('get_dpns_usernames', { identityId, network })
            const list = raw?.result !== undefined ? raw.result : raw
            if (!Array.isArray(list)) return null
            return list.map(item => typeof item === 'string' ? item : item?.username).filter(Boolean)
        } catch {
            return null
        }
    }
}
