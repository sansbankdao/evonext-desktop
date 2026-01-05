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
            if (Array.isArray(response) && response[0]) {
                const wrapper = response[0]
                if (wrapper.success === true && Array.isArray(wrapper.result)) {
                    return {
                        success: true,
                        data: wrapper.result[0],
                        searchType: unique ? 'unique' : 'non-unique'
                    }
                } else if (wrapper.error) {
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
            if (Array.isArray(response) && response[0]) {
                const wrapper = response[0]
                if (wrapper?.success === true && Array.isArray(wrapper.result)) {
                    const identityData = wrapper.result[0]
                    if (identityData) {
                        return {
                            success: true,
                            data: identityData,
                            searchType: 'none'
                        }
                    }
                } else if (wrapper?.error) {
                    return {
                         success: false,
                         error: `Platform Error: ${JSON.stringify(wrapper.error)}`,
                         searchType: 'none'
                    }
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
