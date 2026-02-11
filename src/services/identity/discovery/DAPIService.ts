// src/services/identity/discovery/DAPIService.ts

import { commands } from '@/bindings'
import type { DapiIdentityResponse } from '@/bindings'
export interface DAPIHashSearchResult {
    success: boolean
    data?: DapiIdentityResponse
    error?: string
    searchType: 'unique' | 'non-unique' | 'none'
}
export class DAPIService {
    static async queryIdentityByHash(
        publicKeyHash: string,
        network: 'mainnet' | 'testnet',
        unique: boolean
    ): Promise<DAPIHashSearchResult> {
        const searchType = unique ? 'unique' : 'non-unique'
        try {
            const result = unique
                ? await commands.getIdentityByPublicKeyHash(publicKeyHash, network)
                : await commands.getIdentityByNonUniquePublicKeyHash(publicKeyHash, network)
            if (result.status === 'ok') {
                return {
                    success: true,
                    data: result.data,
                    searchType
                }
            }
            return {
                success: false,
                error: result.error,
                searchType
            }
        } catch (e: any) {
            return {
                success: false,
                error: e.message || String(e),
                searchType
            }
        }
    }
    static async getIdentityById(
        identityId: string,
        network: 'mainnet' | 'testnet'
    ): Promise<DAPIHashSearchResult> {
        try {
            const result = await commands.getIdentityInfo(identityId, network)
            if (result.status === 'ok') {
                return {
                    success: true,
                    data: result.data,
                    searchType: 'none'
                }
            }
            return { success: false, error: result.error, searchType: 'none' }
        } catch (e: any) {
            return { success: false, error: String(e), searchType: 'none' }
        }
    }
    static async getDPNSUsername(
        identityId: string,
        network: 'mainnet' | 'testnet'
    ): Promise<string | null> {
        try {
            const res = await commands.getDpnsUsername(identityId, network)
            return res.status === 'ok' ? res.data : null
        } catch (e) {
            return null
        }
    }
    static async getDPNSUsernames(
        identityId: string,
        network: 'mainnet' | 'testnet'
    ): Promise<string[] | null> {
        try {
            const res = await commands.getDpnsUsernames(identityId, network)
            if (res.status === 'ok') {
                const list = res.data
                return Array.isArray(list) ? list.map(item => item.username || item) : null
            }
            return null
        } catch (e) {
            return null
        }
    }
}
