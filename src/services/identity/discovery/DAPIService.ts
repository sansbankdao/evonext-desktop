// src/services/identity/discovery/DAPIService.ts

import { invoke } from '@tauri-apps/api/core'

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
            // FIX: Pass parameters as positional array for Tauri 2.0
            const response = await invoke<any>(method, {
                publicKeyHash: publicKeyHash,
                network: network
            })
            console.log(`[DAPI] Raw response for ${publicKeyHash}:`, response)
            // The Rust function returns vec![{success: true, result: [...]}]
            if (Array.isArray(response)) {
                if (response.length === 0) {
                    console.log(`[DAPI] Empty response array for ${publicKeyHash}`)
                    return {
                        success: false,
                        error: 'No identity found',
                        searchType: unique ? 'unique' : 'non-unique'
                    }
                }
                const wrapper = response[0]
                console.log(`[DAPI] Response wrapper:`, wrapper)
                // Check if it's an error response from DAPI
                if (wrapper?.success === false) {
                    console.error(`[DAPI] Error response for ${publicKeyHash}:`, wrapper.error)
                    return {
                        success: false,
                        error: wrapper.error || 'DAPI error',
                        searchType: unique ? 'unique' : 'non-unique',
                        debug: wrapper
                    }
                }
                // Check if it's a success response
                if (wrapper?.success === true && wrapper?.result) {
                    const result = wrapper.result
                    console.log(`[DAPI] Success result for ${publicKeyHash}:`, result)
                    // result should be an array of identities
                    if (Array.isArray(result) && result.length > 0) {
                        console.log(`[DAPI] Found ${result.length} identities for hash ${publicKeyHash}`)
                        return {
                            success: true,
                            data: result[0],  // First identity in array
                            searchType: unique ? 'unique' : 'non-unique',
                            debug: wrapper
                        }
                    }
                }
                // Handle case where wrapper is the identity data itself
                if (wrapper?.id || wrapper?.identityId) {
                    console.log(`[DAPI] Direct identity data found for ${publicKeyHash}`)
                    return {
                        success: true,
                        data: wrapper,
                        searchType: unique ? 'unique' : 'non-unique',
                        debug: { directResponse: true }
                    }
                }
            }
            console.warn(`[DAPI] Invalid response format for ${publicKeyHash}:`, response)
            return {
                success: false,
                error: 'Invalid response format',
                searchType: unique ? 'unique' : 'non-unique',
                debug: response
            }
        } catch (e: any) {
            console.error(`[DAPI] Exception for ${publicKeyHash}:`, e)
            return {
                success: false,
                error: e.message || 'Unknown Rust Error',
                searchType: unique ? 'unique' : 'non-unique',
                debug: { exception: e.message, stack: e.stack }
            }
        }
    }
    static async getDPNSUsername(
        identityId: string,
        network: 'mainnet' | 'testnet'
    ): Promise<string | null> {
        console.log(`[DAPI] Getting DPNS username for ${identityId} on ${network}`)
        try {
            // FIX: Pass parameters as positional array
            const response = await invoke<any>('get_dpns_username', {
                identityId: identityId,  // camelCase for identity_id
                withProof: false,        // default value
                network: network
            })
            console.log(`[DAPI] DPNS response for ${identityId}:`, response)
            // Tauri returns [Result]
            if (Array.isArray(response) && response[0]) {
                const wrapper = response[0]
                if (wrapper?.success && wrapper?.result) {
                    const res = wrapper.result
                    if (typeof res === 'string') return res
                    if (Array.isArray(res) && res[0]) return res[0].username || res[0]
                    if (typeof res === 'object') return res.username || null
                }
            }
            console.log(`[DAPI] No DPNS username found for ${identityId}`)
            return null
        } catch (e) {
            console.error(`[DAPI] Exception getting DPNS for ${identityId}:`, e)
            return null
        }
    }
    static async getDPNSUsernames(
        identityId: string,
        network: 'mainnet' | 'testnet'
    ): Promise<string[] | null> {
        console.log(`[DAPI] Getting DPNS usernames for ${identityId} on ${network}`)
        try {
            // FIX: Pass parameters as positional array
            const response = await invoke<any>('get_dpns_usernames', {
                identityId: identityId,
                withProof: false,
                network: network
            })
            console.log(`[DAPI] DPNS usernames response for ${identityId}:`, response)
            // Tauri returns [Result]
            if (Array.isArray(response) && response[0]) {
                const wrapper = response[0]
                if (wrapper?.success && wrapper?.result) {
                    return wrapper.result as [any]
                }
            }
            console.log(`[DAPI] No DPNS usernames found for ${identityId}`)
            return null
        } catch (e) {
            console.error(`[DAPI] Exception getting DPNS usernames for ${identityId}:`, e)
            return null
        }
    }
    static async getIdentityById(
        identityId: string,
        network: 'mainnet' | 'testnet'
    ): Promise<DAPIHashSearchResult> {
        console.log(`[DAPI] Getting identity by ID: ${identityId} on ${network}`)
        try {
            // FIX: Pass parameters as positional array
            const rawResponse = await invoke<any>('get_identity_info', {
                identityId: identityId,
                withProof: false,
                network: network
            })
            console.log(`[DAPI] Identity by ID response for ${identityId}:`, rawResponse)
            // We expect an array wrapper from Tauri: [CommandResult]
            if (!Array.isArray(rawResponse) || rawResponse.length === 0) {
                console.warn(`[DAPI] Empty or non-array response for ${identityId}`)
                return {
                    success: false,
                    error: 'Response is not an array or is empty',
                    searchType: 'none'
                }
            }
            const wrapper = rawResponse[0]
            console.log(`[DAPI] Identity wrapper for ${identityId}:`, wrapper)
            // Check for error response
            if (wrapper?.success === false) {
                console.error(`[DAPI] Error response for identity ${identityId}:`, wrapper.error)
                return {
                    success: false,
                    error: wrapper.error || 'DAPI error',
                    searchType: 'none',
                    debug: wrapper
                }
            }
            // Check for success with result array
            if (wrapper?.success === true && wrapper?.result) {
                const result = wrapper.result
                console.log(`[DAPI] Success result for identity ${identityId}:`, result)
                if (Array.isArray(result) && result.length > 0) {
                    console.log(`[DAPI] Found identity ${identityId} in result array`)
                    return {
                        success: true,
                        data: result[0],
                        searchType: 'none',
                        debug: wrapper
                    }
                }
            }
            // Handle direct identity data
            if (wrapper?.id || wrapper?.identityId) {
                console.log(`[DAPI] Direct identity data found for ${identityId}`)
                return {
                    success: true,
                    data: wrapper,
                    searchType: 'none',
                    debug: { directResponse: true }
                }
            }
            console.warn(`[DAPI] Invalid response format for identity ${identityId}`)
            return {
                success: false,
                error: 'Identity not found or invalid response format',
                searchType: 'none',
                debug: rawResponse
            }
        } catch (e: any) {
            console.error(`[DAPI] Exception getting identity ${identityId}:`, e)
            return {
                success: false,
                error: e.message || String(e),
                searchType: 'none',
                debug: { exception: e.message, stack: e.stack }
            }
        }
    }
}
