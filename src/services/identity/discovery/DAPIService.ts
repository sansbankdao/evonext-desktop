// src/services/identity/discovery/DAPIService.ts

import type { DapiIdentityResponse } from '@/bindings'
import { invoke } from '@/utils/tauri'

export interface DAPIHashSearchResult {
    success: boolean
    data?: Partial<DapiIdentityResponse>
    error?: string
    searchType: 'unique' | 'non-unique' | 'none'
}

export class DAPIService {
    private static logToHUD(level: string, message: any) {
        if (typeof document === 'undefined') return
        const hud = document.getElementById('__discovery_debug_hud')
        if (!hud) return
        const entry = document.createElement('div')
        const color = level === 'ERROR' ? '#fb7185' : level === 'SUCCESS' ? '#4ade80' : level === 'SYSTEM' ? '#22d3ee' : '#94a3b8'
        const time = new Date().toLocaleTimeString()
        const msgString = typeof message === 'string' ? message : JSON.stringify(message)
        entry.innerHTML = `<span style="color: grey;">[${time}]</span> <span style="color: ${color}; font-weight: bold;">[DAPI]</span> ${msgString}`
        hud.appendChild(entry)
        hud.scrollTop = hud.scrollHeight
    }

    private static async unwrapResult(res: any): Promise<any> {
        if (!res) {
            this.logToHUD('DEBUG', 'unwrapResult: res is null or undefined')
            return null
        }
        this.logToHUD('DEBUG', `unwrapResult raw: ${JSON.stringify(res).substring(0, 200)}...`)

        // Check if this is an error response
        if (res.success === false) {
            this.logToHUD('DEBUG', 'unwrapResult: Detected error response with success=false')
            return null // Return null to indicate no data
        }

        // Check if this is a successful response
        if (res.success === true && res.result !== undefined) {
            this.logToHUD('DEBUG', 'unwrapResult: Detected success response with result field')
            return Array.isArray(res.result) ? res.result[0] : res.result
        }

        // Fallback: try to extract result or use the whole response
        const data = res.result !== undefined ? res.result : res
        this.logToHUD('DEBUG', `unwrapResult extracted: ${JSON.stringify(data).substring(0, 200)}...`)
        return Array.isArray(data) ? data[0] : data
    }

    static async queryIdentityByHash(
        publicKeyHash: string,
        network: 'mainnet' | 'testnet',
        unique: boolean
    ): Promise<DAPIHashSearchResult> {
        const searchType = unique ? 'unique' : 'non-unique'
        const cmd = unique ? 'get_identity_by_public_key_hash' : 'get_identity_by_non_unique_public_key_hash'

        this.logToHUD('INFO', `Calling ${cmd} for hash: ${publicKeyHash.substring(0, 16)}..., network: ${network}, unique: ${unique}`)

        try {
            this.logToHUD('DEBUG', `Invoking Tauri command: ${cmd} with params: { publicKeyHash: "${publicKeyHash}", network: "${network}" }`)
            const raw = await invoke<any>(cmd, { publicKeyHash, network })
            this.logToHUD('DEBUG', `Raw Tauri response for ${cmd}: ${JSON.stringify(raw).substring(0, 300)}...`)

            // Check if the response indicates an error
            if (raw && raw.success === false) {
                const errorMsg = raw.error || 'Unknown error'
                this.logToHUD('WARN', `${cmd} returned error: ${errorMsg}`)
                return { success: false, error: errorMsg, searchType }
            }

            const data = await this.unwrapResult(raw)
            this.logToHUD('DEBUG', `Unwrapped data for ${cmd}: ${data ? JSON.stringify(data).substring(0, 200) + '...' : 'null'}`)

            if (!data) {
                this.logToHUD('WARN', `${cmd} returned no data`)
                return { success: false, error: 'No identity found', searchType }
            }

            this.logToHUD('SUCCESS', `${cmd} succeeded, data keys: ${Object.keys(data).join(', ')}`)
            return { success: true, data, searchType }
        } catch (e: any) {
            const errorMsg = e.message || String(e)
            this.logToHUD('ERROR', `${cmd} failed: ${errorMsg}`)
            return { success: false, error: errorMsg, searchType }
        }
    }

    static async getIdentityById(
        identityId: string,
        network: 'mainnet' | 'testnet'
    ): Promise<DAPIHashSearchResult> {
        this.logToHUD('INFO', `Calling get_identity_info for ID: ${identityId.substring(0, 16)}..., network: ${network}`)

        try {
            const raw = await invoke<any>('get_identity_info', { identityId, network })
            this.logToHUD('DEBUG', `Raw Tauri response for get_identity_info: ${JSON.stringify(raw).substring(0, 300)}...`)

            // Check if the response indicates an error
            if (raw && raw.success === false) {
                const errorMsg = raw.error || 'Unknown error'
                this.logToHUD('WARN', `get_identity_info returned error: ${errorMsg}`)
                return { success: false, error: errorMsg, searchType: 'none' }
            }

            const data = await this.unwrapResult(raw)
            this.logToHUD('DEBUG', `Unwrapped data for get_identity_info: ${data ? JSON.stringify(data).substring(0, 200) + '...' : 'null'}`)

            if (!data) {
                this.logToHUD('WARN', 'get_identity_info returned no data')
                return { success: false, error: 'Identity not found', searchType: 'none' }
            }

            this.logToHUD('SUCCESS', `get_identity_info succeeded, data keys: ${Object.keys(data).join(', ')}`)
            return { success: true, data, searchType: 'none' }
        } catch (e: any) {
            const errorMsg = e.message || String(e)
            this.logToHUD('ERROR', `get_identity_info failed: ${errorMsg}`)
            return { success: false, error: e.message || String(e), searchType: 'none' }
        }
    }

    static async getDPNSUsername(
        identityId: string,
        network: 'mainnet' | 'testnet'
    ): Promise<string | null> {
        this.logToHUD('DEBUG', `Calling get_dpns_username for ID: ${identityId.substring(0, 16)}..., network: ${network}`)

        try {
            const raw = await invoke<any>('get_dpns_username', { identityId, network })
            // Check if the response indicates an error
            if (raw && raw.success === false) {
                this.logToHUD('DEBUG', `get_dpns_username returned error: ${raw.error || 'Unknown error'}`)
                return null
            }

            const data = await this.unwrapResult(raw)
            if (!data) {
                this.logToHUD('DEBUG', 'get_dpns_username returned no data')
                return null
            }
            const username = typeof data === 'string' ? data : (data.username || null)
            this.logToHUD('DEBUG', `get_dpns_username result: ${username || 'null'}`)
            return username
        } catch (e: any) {
            this.logToHUD('ERROR', `get_dpns_username failed: ${e.message || e}`)
            return null
        }
    }

    static async getDPNSUsernames(
        identityId: string,
        network: 'mainnet' | 'testnet'
    ): Promise<string[] | null> {
        this.logToHUD('DEBUG', `Calling get_dpns_usernames for ID: ${identityId.substring(0, 16)}..., network: ${network}`)

        try {
            const raw = await invoke<any>('get_dpns_usernames', { identityId, network })
            // Check if the response indicates an error
            if (raw && raw.success === false) {
                this.logToHUD('DEBUG', `get_dpns_usernames returned error: ${raw.error || 'Unknown error'}`)
                return null
            }

            const list = raw?.result !== undefined ? raw.result : raw
            if (!Array.isArray(list)) {
                this.logToHUD('DEBUG', 'get_dpns_usernames returned non-array data')
                return null
            }
            const usernames = list.map(item => typeof item === 'string' ? item : item?.username).filter(Boolean)
            this.logToHUD('DEBUG', `get_dpns_usernames result: ${usernames.length} usernames`)
            return usernames
        } catch (e: any) {
            this.logToHUD('ERROR', `get_dpns_usernames failed: ${e.message || e}`)
            return null
        }
    }
}
