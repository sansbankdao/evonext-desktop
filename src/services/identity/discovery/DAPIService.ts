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
                if (wrapper?.success === true) {
                    let result = wrapper.result

                    // FIX: If result is missing but success is true, check the wrapper itself
                    // Sometimes the response is { success: true, identityId: ... } directly
                    if (!result && (wrapper.identityId || wrapper.id)) {
                        result = wrapper
                    }
                    console.log(`[DAPI] Result for ${publicKeyHash}:`, result)

                    if (result) {
                        // result can be an array of identities OR a single identity object
                        const identityData = Array.isArray(result) ? (result.length > 0 ? result[0] : null) : result
                        if (identityData) {
                            console.log(`[DAPI] Found identity data for ${publicKeyHash}`)
                            return {
                                success: true,
                                data: identityData,
                                searchType: unique ? 'unique' : 'non-unique',
                                debug: wrapper
                            }
                        }
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
            const response = await invoke<any>('get_dpns_username', {
                identityId: identityId,
                withProof: false,
                network: network
            })
            console.log(`[DAPI] DPNS response for ${identityId}:`, response)

            // HANDLE RAW STRING RESPONSE (Rust returns "name.dash" directly)
            if (typeof response === 'string') {
                return response
            }

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
            const response = await invoke<any>('get_dpns_usernames', {
                identityId: identityId,
                withProof: false,
                network: network
            })
            console.log(`[DAPI] DPNS usernames response for ${identityId}:`, response)

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
            const rawResponse = await invoke<any>('get_identity_info', {
                identityId: identityId,
                withProof: false,
                network: network
            })
            console.log(`[DAPI] Identity by ID response for ${identityId}:`, rawResponse)

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

            if (wrapper?.success === false) {
                console.error(`[DAPI] Error response for identity ${identityId}:`, wrapper.error)
                return {
                    success: false,
                    error: wrapper.error || 'DAPI error',
                    searchType: 'none',
                    debug: wrapper
                }
            }

            // FIX: Check for wrapper.result first
            if (wrapper?.success === true && wrapper?.result) {
                const result = wrapper.result
                console.log(`[DAPI] Success result for identity ${identityId}:`, result)

                const identityData = Array.isArray(result) ? (result.length > 0 ? result[0] : null) : result

                if (identityData) {
                    return {
                        success: true,
                        data: identityData,
                        searchType: 'none',
                        debug: wrapper
                    }
                }
            }

            // Fallback: Handle case where wrapper is the identity data itself
            // Only use this if we haven't already extracted data from wrapper.result
            if ((wrapper?.id || wrapper?.identityId) && !wrapper?.result) {
                console.log(`[DAPI] Direct identity data found for ${identityId}`)
                return {
                    success: true,
                    data: wrapper,
                    searchType: 'none',
                    debug: { directResponse: true }
                }
            }

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
