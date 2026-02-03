// src/services/identity/discovery/DAPIService.ts

import { invoke } from '@/utils/tauri'

export interface DAPIHashSearchResult {
    success: boolean
    data?: any
    error?: string
    searchType: 'unique' | 'non-unique' | 'none'
    debug?: any
}

export class DAPIService {
    static async queryIdentityByHash(
        publicKeyHash: string,
        network: 'mainnet' | 'testnet',
        unique: boolean
    ): Promise<DAPIHashSearchResult> {
        const method = unique
            ? 'get_identity_by_public_key_hash'
            : 'get_identity_by_non_unique_public_key_hash'
        console.log(`[DAPI] Calling ${method} with hash ${publicKeyHash} on ${network}`)

        try {
            const data = await invoke<any>(method, {
                publicKeyHash: publicKeyHash,
                network: network
            })
            console.log(`[DAPI] Response for ${publicKeyHash}:`, data)
            // Normalize: Rust often returns an array even for unique lookups
            const identityData = Array.isArray(data)
                ? (data.length > 0 ? data[0] : null)
                : data
            if (identityData) {
                return {
                    success: true,
                    data: identityData,
                    searchType: unique ? 'unique' : 'non-unique'
                }
            }
            return {
                success: false,
                error: 'No identity found',
                searchType: unique ? 'unique' : 'non-unique'
            }
        } catch (e: any) {
            console.error(`[DAPI] Exception for ${publicKeyHash}:`, e)
            return {
                success: false,
                error: e.message || 'Unknown Rust Error',
                searchType: unique ? 'unique' : 'non-unique'
            }
        }
    }
    static async getDPNSUsername(
        identityId: string,
        network: 'mainnet' | 'testnet'
    ): Promise<string | null> {
        console.log(`[DAPI] Getting DPNS username for ${identityId} on ${network}`)
        try {
            const data = await invoke<any>('get_dpns_username', {
                identityId: identityId,
                withProof: false,
                network: network
            })
            console.log(`[DAPI] DPNS response for ${identityId}:`, data)
            if (typeof data === 'string') return data
            if (data && typeof data === 'object') {
                const inner = data.result || data
                if (typeof inner === 'string') return inner
                if (Array.isArray(inner)) return inner[0]?.username || inner[0] || null
                return inner.username || null
            }
            return null
        } catch (e) {
            console.error(`[DAPI] Exception getting DPNS for ${identityId}:`, e)
            return null
        }
    }
    static async getIdentityById(
        identityId: string,
        network: 'mainnet' | 'testnet'
    ): Promise<DAPIHashSearchResult> {
        console.log(`[DAPI] Getting identity by ID: ${identityId} on ${network}`)
        try {
            const data = await invoke<any>('get_identity_info', {
                identityId: identityId,
                withProof: false,
                network: network
            })
            console.log(`[DAPI] Identity by ID response for ${identityId}:`, data)
            const identityData = Array.isArray(data)
                ? (data.length > 0 ? data[0] : null)
                : data
            if (identityData) {
                return {
                    success: true,
                    data: identityData,
                    searchType: 'none'
                }
            }
            return {
                success: false,
                error: 'Identity not found',
                searchType: 'none'
            }
        } catch (e: any) {
            console.error(`[DAPI] Exception getting identity ${identityId}:`, e)
            return {
                success: false,
                error: e.message || String(e),
                searchType: 'none'
            }
        }
    }
    // Restored full functionality for multiple usernames
    static async getDPNSUsernames(
        identityId: string,
        network: 'mainnet' | 'testnet'
    ): Promise<string[] | null> {
        try {
            const data = await invoke<any>('get_dpns_usernames', {
                identityId,
                withProof: false,
                network
            })
            const list = data?.result || data
            return Array.isArray(list) ? list : null
        } catch (e) {
            return null
        }
    }
}
