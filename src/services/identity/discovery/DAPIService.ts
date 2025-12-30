// src/services/identity/discovery/DAPIService.ts

import { invoke } from '@tauri-apps/api/core'
import type { DAPIResponse, DiscoveredIdentity } from '../types'

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
        unique: boolean = false
    ): Promise<DAPIHashSearchResult> {
        try {
            const method = unique
                ? 'get_identity_by_public_key_hash'
                : 'get_identity_by_non_unique_public_key_hash'
            console.log(`[DAPI] Querying ${method} for hash: ${publicKeyHash.substring(0, 16)}... on ${network}`)
            const response = await invoke<DAPIResponse>(method, {
                public_key_hash: publicKeyHash,
                network
            })
            console.log(`[DAPI] ${method} response success:`, response?.success)
            if (response?.success && response?.result) {
                return {
                    success: true,
                    data: response.result,
                    searchType: unique ? 'unique' : 'non-unique',
                    debug: { method, hash: publicKeyHash, unique, response }
                }
            }
            return {
                success: false,
                error: `No identity found via ${method}`,
                searchType: unique ? 'unique' : 'non-unique',
                debug: { method, hash: publicKeyHash, unique, response }
            }
        } catch (error: any) {
            console.error(`[DAPI] ${unique ? 'Unique' : 'Non-unique'} hash query failed:`, error)
            return {
                success: false,
                error: error.message || 'Query failed',
                searchType: unique ? 'unique' : 'non-unique',
                debug: { method: unique ? 'unique' : 'non-unique', hash: publicKeyHash, error: error.message }
            }
        }
    }

    static async getDPNSUsername(
        identityId: string,
        network: 'mainnet' | 'testnet'
    ): Promise<string | null> {
        try {
            console.log(`[DAPI] Getting DPNS username for ${identityId.substring(0, 16)}...`)
            const response = await invoke<DAPIResponse>('get_dpns_username', {
                identity_id: identityId,
                network_override: network
            })
            if (response?.success && response?.result) {
                // Handle both array and object responses
                const result = response.result
                if (Array.isArray(result) && result.length > 0) {
                    return typeof result[0] === 'string' ? result[0] : result[0]?.username || null
                } else if (typeof result === 'object' && result.username) {
                    return result.username
                } else if (typeof result === 'string') {
                    return result
                }
            }
            return null
        } catch (error) {
            console.warn(`[DAPI] Failed to get DPNS username for ${identityId}:`, error)
            return null
        }
    }

    static async getIdentityById(
        identityId: string,
        network: 'mainnet' | 'testnet'
    ): Promise<DAPIHashSearchResult> {
        try {
            console.log(`[DAPI] Getting identity by ID: ${identityId.substring(0, 16)}...`)
            const response = await invoke<DAPIResponse>('get_identity_info', {
                identity_id: identityId,
                network_override: network,
                with_proof: false
            })
            if (response?.success && response?.result) {
                const result = response.result
                const identityData = Array.isArray(result) ? result[0] : result
                if (identityData) {
                    return {
                        success: true,
                        data: identityData,
                        searchType: 'none',
                        debug: { method: 'get_identity_info', identityId, response }
                    }
                }
            }
            return {
                success: false,
                error: `No identity found with ID: ${identityId}`,
                searchType: 'none',
                debug: { method: 'get_identity_info', identityId, response }
            }
        } catch (error: any) {
            console.error(`[DAPI] Failed to get identity by ID:`, error)
            return {
                success: false,
                error: error.message || 'Query failed',
                searchType: 'none',
                debug: { method: 'get_identity_info', identityId, error: error.message }
            }
        }
    }

    static async searchByHash(
        publicKeyHash: string,
        network: 'mainnet' | 'testnet'
    ): Promise<DAPIHashSearchResult> {
        // Try unique lookup first
        const uniqueResult = await this.queryIdentityByHash(publicKeyHash, network, true)
        if (uniqueResult.success && uniqueResult.data) {
            return { ...uniqueResult, searchType: 'unique' as const }
        }
        // Fallback to non-unique
        const nonUniqueResult = await this.queryIdentityByHash(publicKeyHash, network, false)
        if (nonUniqueResult.success && nonUniqueResult.data) {
            return { ...nonUniqueResult, searchType: 'non-unique' as const }
        }
        return {
            success: false,
            error: 'No identity found for this public key hash',
            searchType: 'none' as const,
            debug: {
                hash: publicKeyHash,
                uniqueResult: uniqueResult.debug,
                nonUniqueResult: nonUniqueResult.debug
            }
        }
    }
}
