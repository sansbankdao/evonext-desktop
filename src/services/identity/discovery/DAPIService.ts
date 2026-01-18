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
        try {
            const response = await invoke<any>(method, {
                publicKeyHash: publicKeyHash,
                network: network
            })

            // Tauri often returns an array of command results: [Result]
            if (Array.isArray(response) && response[0]) {
                const wrapper = response[0]
                // Handle cases where the command returns a standard Result object
                if (wrapper?.success === true && Array.isArray(wrapper.result)) {
                    return {
                        success: true,
                        data: wrapper.result[0],
                        searchType: unique ? 'unique' : 'non-unique'
                    }
                } else if (wrapper?.error) {
                    return {
                        success: false,
                        error: typeof wrapper.error === 'string' ? wrapper.error : JSON.stringify(wrapper.error),
                        searchType: unique ? 'unique' : 'non-unique'
                    }
                }
            }

            return {
                success: false,
                error: 'No identity found',
                searchType: unique ? 'unique' : 'non-unique'
            }
        } catch (e: any) {
            console.error(`[DAPI] ERROR for ${publicKeyHash}:`, e)
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
        try {
            const response = await invoke<any>('get_dpns_username', {
                identityId: identityId,
                network: network
            })

            // Tauri returns [Result]
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

    static async getDPNSUsernames(
        identityId: string,
        network: 'mainnet' | 'testnet'
    ): Promise<string[] | null> {
        try {
            const response = await invoke<any>('get_dpns_usernames', {
                identityId: identityId,
                network: network
            })

            // Tauri returns [Result]
            if (response?.success && response?.result) {
                return response.result as [any]
            }

            return null
        } catch {
            return null
        }
    }

    static async getIdentityById(
        identityId: string,
        network: 'mainnet' | 'testnet'
    ): Promise<DAPIHashSearchResult> {
        try {
            // Invoke the backend command
            const rawResponse = await invoke<any>('get_identity_info', {
                identityId: identityId,
                network: network,
                withProof: false
            })

            // We expect an array wrapper from Tauri: [CommandResult]
            // CommandResult usually has { success: true, result: ... }
            // OR { success: false, error: ... }
            if (!Array.isArray(rawResponse) || !rawResponse[0]) {
                return {
                    success: false,
                    error: 'Response is not an array',
                    searchType: 'none'
                }
            }
            const wrapper = rawResponse[0]
            // Case 1: Standard Tauri Success Wrapper
            // { success: true, result: { identityId: "...", publicKeys: [...] } }
            if (wrapper?.success === true) {
                // The actual data might be in 'result', 'data', or be the wrapper itself
                // Based on your logs, wrapper IS the identity object.
                // We check for identityId to be sure.
                if (wrapper.identityId) {
                    return {
                        success: true,
                        data: wrapper,
                        searchType: 'none'
                    }
                }
                // Fallbacks for other standard shapes if identityId isn't top level
                const rawData = wrapper.result ?? wrapper.data ?? wrapper
                if (rawData && rawData.identityId) {
                    return {
                        success: true,
                        data: rawData,
                        searchType: 'none'
                    }
                }
            }

            // Case 2: Standard Tauri Error Wrapper
            if (wrapper?.error) {
                return {
                    success: false,
                    error: typeof wrapper.error === 'string' ? wrapper.error : JSON.stringify(wrapper.error),
                    searchType: 'none'
                }
            }

            // Case 3: Raw Object returned without wrapper (Edge case)
            // If wrapper has identityId but no success field, treat as success
            if (wrapper.identityId) {
                 return {
                    success: true,
                    data: wrapper,
                    searchType: 'none'
                }
            }

            return {
                success: false,
                error: 'Identity not found or invalid response format',
                searchType: 'none'
            }
        } catch (e: any) {
            console.error('[DAPI] getIdentityById Exception:', e)
            return {
                success: false,
                error: e.message || String(e),
                searchType: 'none'
            }
        }
    }
}
