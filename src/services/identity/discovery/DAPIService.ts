// src/services/identity/discovery/DAPIService.ts

import { commands } from '@/bindings'
import type { DapiIdentityResponse } from '@/bindings'
/**
 * Result of a DAPI search.
 * Using Partial for data to accommodate varying levels of detail in discovery
 * and satisfy test mocks that only provide partial identity objects.
 */
export interface DAPIHashSearchResult {
    success: boolean
    data?: Partial<DapiIdentityResponse>
    error?: string
    searchType: 'unique' | 'non-unique' | 'none'
}
export class DAPIService {
    /**
     * Queries for an identity using a Public Key Hash (Hex).
     */
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
    /**
     * Retrieves full identity information by Identity ID.
     */
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
    /**
     * Resolves the primary DPNS username for an identity.
     */
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
    /**
     * Resolves all DPNS usernames associated with an identity.
     */
    static async getDPNSUsernames(
        identityId: string,
        network: 'mainnet' | 'testnet'
    ): Promise<string[] | null> {
        try {
            const res = await commands.getDpnsUsernames(identityId, network)
            if (res.status === 'ok') {
                const list = res.data
                if (!Array.isArray(list)) return null
                return list.map(item => {
                    if (!item) return ''
                    if (typeof item === 'string') return item
                    if (typeof item === 'object' && !Array.isArray(item)) {
                        const obj = item as Record<string, any>
                        return String(obj['username'] || '')
                    }
                    return ''
                }).filter(name => name !== '')
            }
            return null
        } catch (e) {
            return null
        }
    }
}
