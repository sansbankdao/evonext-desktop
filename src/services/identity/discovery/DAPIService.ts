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
            // The Rust command returns an array with one element containing the wrapper
            if (Array.isArray(response) && response[0]) {
                const wrapper = response[0]
                if (wrapper.success === true && Array.isArray(wrapper.result)) {
                    // The actual identity data is in wrapper.result[0]
                    const identityData = wrapper.result[0]
                    return {
                        success: true,
                        data: identityData,
                        searchType: unique ? 'unique' : 'non-unique',
                        debug: {
                            method,
                            wrapper,
                            network,
                            hash: publicKeyHash
                        }
                    }
                } else if (wrapper.error) {
                    return {
                        success: false,
                        error: wrapper.error,
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
            return {
                success: false,
                error: 'No identity found',
                searchType: unique ? 'unique' : 'non-unique',
                debug: {
                    method,
                    response,
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
                identityId: identityId,
                network: network
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
                identityId: identityId,
                network: network,
                withProof: false
            })
            // Handle array response and unwrap result
            // The Tauri command returns Vec<Value>, so invoke returns an array.
            // The 'get_identity_info' implementation wraps the result in a success object.
            if (Array.isArray(response) && response[0]) {
                const wrapper = response[0]
                if (wrapper?.success === true && Array.isArray(wrapper.result)) {
                    // The identity data is inside the result array
                    const identityData = wrapper.result[0]
                    if (identityData) {
                        return {
                            success: true,
                            data: identityData,
                            searchType: 'none'
                        }
                    }
                }
            }
            return {
                success: false,
                error: 'Not found or invalid response format',
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
}
