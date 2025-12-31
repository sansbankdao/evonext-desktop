// src/services/identity/discovery/DAPIService.ts
import { invoke } from '@tauri-apps/api/core'
import type { DAPIResponse } from '../types'
export interface DAPIHashSearchResult {
    success: boolean
    data?: any
    error?: string
    searchType: 'unique' | 'non-unique' | 'none'
    debug?: any
}
export class DAPIService {
    // Basic query wrapper
    static async queryIdentityByHash(
        publicKeyHash: string,
        network: 'mainnet' | 'testnet',
        unique: boolean
    ): Promise<DAPIHashSearchResult> {
        const method = unique
            ? 'get_identity_by_public_key_hash'
            : 'get_identity_by_non_unique_public_key_hash'
        try {
            console.log(`[DAPI] Request: ${method} (${publicKeyHash.substring(0,8)}...)`)
            const response = await invoke<DAPIResponse>(method, {
                public_key_hash: publicKeyHash,
                network
            })
            if (response?.success && response?.result) {
                return {
                    success: true,
                    data: response.result,
                    searchType: unique ? 'unique' : 'non-unique',
                    debug: { method, response }
                }
            }
            return {
                success: false,
                error: response?.error || 'Not found',
                searchType: unique ? 'unique' : 'non-unique'
            }
        } catch (e: any) {
            return {
                success: false,
                error: e.message,
                searchType: unique ? 'unique' : 'non-unique'
            }
        }
    }
    // DPNS Helper
    static async getDPNSUsername(identityId: string, network: 'mainnet' | 'testnet'): Promise<string | null> {
        try {
            const response = await invoke<DAPIResponse>('get_dpns_username', {
                identity_id: identityId,
                network_override: network
            })
            if (response?.success && response?.result) {
                const res = response.result
                if (typeof res === 'string') return res
                if (Array.isArray(res) && res[0]) return res[0].username || res[0]
                if (typeof res === 'object') return res.username || null
            }
            return null
        } catch { return null }
    }
    // ID Lookup Helper
    static async getIdentityById(identityId: string, network: 'mainnet' | 'testnet'): Promise<DAPIHashSearchResult> {
        try {
            const response = await invoke<DAPIResponse>('get_identity_info', {
                identity_id: identityId,
                network_override: network,
                with_proof: false
            })
            if (response?.success && response?.result) {
                return { success: true, data: response.result, searchType: 'none' }
            }
            return { success: false, error: 'Not found', searchType: 'none' }
        } catch (e: any) {
            return { success: false, error: e.message, searchType: 'none' }
        }
    }
    // THE MAIN SEARCH FUNCTION
    // Guarantees checking both methods if the first fails
    static async searchByHash(
        publicKeyHash: string,
        network: 'mainnet' | 'testnet'
    ): Promise<DAPIHashSearchResult> {
        // 1. Try Unique
        const unique = await this.queryIdentityByHash(publicKeyHash, network, true)
        if (unique.success) return { ...unique, searchType: 'unique' }
        // 2. Try Non-Unique (Strict fallback)
        const nonUnique = await this.queryIdentityByHash(publicKeyHash, network, false)
        if (nonUnique.success) return { ...nonUnique, searchType: 'non-unique' }
        return {
            success: false,
            error: 'No identity found via unique or non-unique lookup',
            searchType: 'none',
            debug: { uniqueError: unique.error, nonUniqueError: nonUnique.error }
        }
    }
}
