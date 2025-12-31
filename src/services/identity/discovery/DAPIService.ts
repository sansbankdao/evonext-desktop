// src/services/identity/discovery/DAPIService.ts

import { invoke } from '@tauri-apps/api/core'
// import type { DAPIResponse } from '../types'

export interface DAPIHashSearchResult {
    success: boolean
    data?: any
    error?: string
    searchType: 'unique' | 'non-unique' | 'none'
    debug?: any
}

export class DAPIService {
    // Basic query wrapper - FIXED to use direct commands
    static async queryIdentityByHash(
        publicKeyHash: string,
        network: 'mainnet' | 'testnet',
        unique: boolean
    ): Promise<DAPIHashSearchResult> {
        const method = unique
            ? 'get_identity_by_public_key_hash'
            : 'get_identity_by_non_unique_public_key_hash'
        try {
            const response = await invoke<any>(method, {
                publicKeyHash: publicKeyHash,
                network: network
            })
            // response is an array containing the wrapper object
            const wrapper = Array.isArray(response) ? response[0] : response
            if (wrapper && typeof wrapper === 'object' && wrapper.success === true) {
                // The actual DAPI result is in wrapper.result (which is also an array!)
                const dapiResult = wrapper.result
                if (Array.isArray(dapiResult) && dapiResult.length > 0) {
                    // First element of dapiResult is the actual identity object
                    const identityData = dapiResult[0]
                    return {
                        success: true,
                        data: identityData, // ← This is the actual identity
                        searchType: unique ? 'unique' : 'non-unique',
                        debug: {
                            method,
                            wrapper,
                            network,
                            hash: publicKeyHash
                        }
                    }
                } else {
                    // No identity found
                    return {
                        success: false,
                        error: 'Identity not found',
                        searchType: unique ? 'unique' : 'non-unique',
                        debug: {
                            method,
                            wrapper,
                            network,
                            hash: publicKeyHash
                        }
                    }
                }
            }
            // Error case
            return {
                success: false,
                error: wrapper?.error || 'Invalid response format',
                searchType: unique ? 'unique' : 'non-unique',
                debug: {
                    method,
                    wrapper: wrapper || response,
                    network,
                    hash: publicKeyHash
                }
            }
        } catch (e: any) {
            console.error(`[DAPI] ERROR for ${publicKeyHash}:`, e)
            return {
                success: false,
                error: e.message,
                searchType: unique ? 'unique' : 'non-unique',
                debug: {
                    method,
                    error: e.message,
                    stack: e.stack,
                    network,
                    hash: publicKeyHash
                }
            }
        }
    }

    // DPNS Helper
    static async getDPNSUsername(
        identityId: string,
        network: 'mainnet' | 'testnet'
    ): Promise<string | null> {
        try {
            const response = await invoke<any>('get_dpns_username', {
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
        } catch {
            return null
        }
    }
    // ID Lookup Helper
    static async getIdentityById(
        identityId: string,
        network: 'mainnet' | 'testnet'
    ): Promise<DAPIHashSearchResult> {
        try {
            const response = await invoke<any>('get_identity_info', {
                identity_id: identityId,
                network_override: network,
                with_proof: false
            })

            if (response?.success && response?.result) {
                return {
                    success: true,
                    data: response.result,
                    searchType: 'none'
                }
            }

            return {
                success: false,
                error: response?.error || 'Not found',
                searchType: 'none'
            }
        } catch (e: any) {
            return {
                success: false,
                error: e.message,
                searchType: 'none'
            }
        }
    }

    // THE MAIN SEARCH FUNCTION
    static async searchByHash(
        publicKeyHash: string,
        network: 'mainnet' | 'testnet'
    ): Promise<DAPIHashSearchResult> {
        // 1. Try Unique
        const unique = await this.queryIdentityByHash(publicKeyHash, network, true)
        if (unique.success) {
            return {
                ...unique,
                searchType: 'unique'
            }
        }

        // 2. Try Non-Unique (Strict fallback)
        const nonUnique = await this.queryIdentityByHash(publicKeyHash, network, false)
        if (nonUnique.success) {
            return {
                ...nonUnique,
                searchType: 'non-unique'
            }
        }

        return {
            success: false,
            error: 'No identity found via unique or non-unique lookup',
            searchType: 'none',
            debug: {
                uniqueError: unique.error,
                nonUniqueError: nonUnique.error
            }
        }
    }
}
