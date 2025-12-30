// src/libs/identity/IdentityManager.ts
// Refactored to support single-key lookup
import { ErrorBoundary } from '@/utils/errors'
import { log, getDapiEndpoint } from '@/utils/env'
import { DEFAULT_IDENTITY_SEARCH_LIMIT, DEFAULT_QUERY_REGISTRY } from '@/constants'
import getNetwork from '../getNetwork'
import type { IdentitySearchOptions, IIdentity, IPublicKey } from '@/types'
export class IdentityManager {
    private network: 'testnet' | 'mainnet' = 'testnet'
    private isInitializing = false
    /**
     * Initialize basic settings without connecting to sockets
     */
    async initialize(): Promise<void> {
        return ErrorBoundary.wrap(async () => {
            if (this.isInitializing) return
            this.isInitializing = true
            try {
                this.network = await getNetwork()
                log('info', `IdentityManager initialized for network: ${this.network}`)
            } finally {
                this.isInitializing = false
            }
        }, 'IDENTITY_MANAGER_INIT_FAILED')
    }
    /**
     * Search for identities using a seed phrase
     * This is the main entry point for seed phrase login
     */
    async getIdentitiesFromSeed(
        seedPhrase: string,
        options?: IdentitySearchOptions
    ): Promise<IIdentity[] | null> {
        return ErrorBoundary.wrap(async () => {
            await this.initialize()
            const minIndexSearch = options?.minIndexSearch || DEFAULT_IDENTITY_SEARCH_LIMIT
            const queryRegistry = options?.queryRegistry || DEFAULT_QUERY_REGISTRY
            log('debug', `Searching identities from seed with options:`, { minIndexSearch, queryRegistry })
            const identities: IIdentity[] = []
            // Try direct backend call first (most efficient)
            try {
                const result = await this.queryWebAPI('get_identities_from_seed', [seedPhrase])
                if (result?.success && Array.isArray(result.result)) {
                    for (const identityData of result.result) {
                        identities.push({
                            identity_idx: identityData.index || identities.length,
                            id: identityData.identityId,
                            publicKeys: this.mapPublicKeys(identityData.publicKeys || []),
                            // balance: identityData.balance,
                            // revision: identityData.revision
                        })
                    }
                }
            } catch (err) {
                log('warn', 'Direct seed discovery failed, falling back to index search...', err)
            }
            // Fallback: If no identities found, try the old index-based search
            if (identities.length === 0) {
                log('debug', 'No identities found via direct method, trying index search...')
                for (let i = 0; i < minIndexSearch; i++) {
                    const result = await this.searchByIndex(i, queryRegistry, seedPhrase)
                    if (result) {
                        identities.push({
                            identity_idx: i,
                            id: result.identityId,
                            publicKeys: this.mapPublicKeys(result.regPubKeys || []),
                            // balance: result.balance,
                            // revision: result.revision
                        })
                        break // Stop after first found identity for now
                    }
                }
            }
            if (identities.length === 0) {
                log('warn', 'No identities found for the provided seed phrase.')
                return null
            }
            log('info', `Found ${identities.length} identities`)
            return identities
        }, 'GET_IDENTITIES_FROM_SEED_FAILED')
    }
    /**
     * Search for identity by a single private key
     * This replaces the inefficient multi-key search
     */
    async getIdentityByKey(
        keyInput: string,
        keyType?: 'WIF' | 'HEX' | 'PUBLIC_KEY'
    ): Promise<{ identity: IIdentity; keyType: string } | null> {
        return ErrorBoundary.wrap(async () => {
            await this.initialize()
            log('debug', `Searching identity by key: ${keyInput.substring(0, 8)}...`)
            // Try direct backend discovery
            const result = await this.queryWebAPI('get_identity_by_private_key', [keyInput])
            if (result?.success && result?.result?.identityId) {
                return {
                    identity: {
                        identity_idx: 0,
                        identityId: result.result.identityId,
                        publicKeys: this.mapPublicKeys(result.result.publicKeys || []),
                        balance: result.result.balance,
                        revision: result.result.revision
                    },
                    keyType: this.detectKeyType(keyInput)
                }
            }
            // Fallback: Try hash-based lookup
            const hash = await this.deriveKeyHash(keyInput)
            if (hash) {
                const hashResult = await this.queryWebAPI('get_identity_by_public_key_hash', [hash])
                if (hashResult?.success && hashResult?.result?.identityId) {
                    return {
                        identity: {
                            identity_idx: 0,
                            identityId: hashResult.result.identityId,
                            publicKeys: this.mapPublicKeys(hashResult.result.publicKeys || []),
                            balance: hashResult.result.balance,
                            revision: hashResult.result.revision
                        },
                        keyType: this.detectKeyType(keyInput)
                    }
                }
            }
            log('warn', 'No identity found for key')
            return null
        }, 'GET_IDENTITY_BY_KEY_FAILED')
    }
    /**
     * Lookup identity directly by ID
     */
    async getIdentityById(identityId: string): Promise<IIdentity | null> {
        return ErrorBoundary.wrap(async () => {
            await this.initialize()
            const result = await this.queryWebAPI('identity_fetch', [identityId])
            if (result?.success && result?.result) {
                const data = result.result
                return {
                    identity_idx: 0,
                    identityId: data.identityId,
                    publicKeys: this.mapPublicKeys(data.publicKeys || []),
                    balance: data.balance,
                    revision: data.revision
                }
            }
            return null
        }, 'GET_IDENTITY_BY_ID_FAILED')
    }
    /**
     * Private helper methods
     */
    private async searchByIndex(
        identityIdx: number,
        queryRegistry: boolean,
        seedPhrase?: string
    ): Promise<{ identityId: string; regPubKeys: any[]; balance?: string; revision?: string } | null> {
        try {
            // This would be implemented with actual key derivation from seed phrase
            // For now, return null as this is inefficient and should be replaced by direct backend calls
            return null
        } catch (err) {
            log('error', `Failed to search by index ${identityIdx}:`, err)
            return null
        }
    }
    private async deriveKeyHash(keyInput: string): Promise<string | null> {
        try {
            // This should call backend crypto functions
            // For now, return a mock hash for testing
            const response = await this.queryWebAPI('derive_public_key_hash', [keyInput])
            return response?.result?.hash || null
        } catch (err) {
            log('error', 'Failed to derive key hash:', err)
            return null
        }
    }
    private detectKeyType(keyInput: string): string {
        const cleanKey = keyInput.trim()
        if (/^[cKL][0-9A-Za-z]{50,}$/.test(cleanKey)) {
            return 'WIF'
        } else if (/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
            return 'HEX'
        } else if (/^0[23][0-9a-fA-F]{64}$/.test(cleanKey)) {
            return 'COMPRESSED_PUBKEY'
        } else if (/^04[0-9a-fA-F]{128}$/.test(cleanKey)) {
            return 'UNCOMPRESSED_PUBKEY'
        }
        return 'UNKNOWN'
    }
    private mapPublicKeys(keys: any[]): IPublicKey[] {
        return (keys || []).map((key, index) => ({
            type: this.getKeyTypeId(key.keyType),
            keyType: key.keyType || 'UNKNOWN',
            purpose: this.getPurposeNumber(key.purpose),
            securityLevel: this.getSecurityLevelNumber(key.securityLevel),
            contractBounds: key.contractBounds || null,
            data: key.data || '',
            dataBytes: this.decodeBase64ToHex(key.dataB64 || ''),
            readOnly: key.readOnly || false,
            disabledAt: key.disabledAt || null,
        }))
    }
    private getKeyTypeId(keyType: string | undefined): number {
        switch(keyType?.toUpperCase()) {
            case 'ECDSA_SECP256K1': return 0
            case 'BLS12_381': return 1
            case 'ECDSA_HASH160': return 2
            case 'BIP13_SCRIPT_HASH': return 3
            case 'EDDSA_25519_HASH160': return 4
            default: return -1
        }
    }
    private getPurposeNumber(purpose: string): number {
        switch(purpose?.toUpperCase()) {
            case 'AUTHENTICATION': return 0
            case 'TRANSFER': return 1
            case 'ENCRYPTION': return 2
            default: return 0
        }
    }
    private getSecurityLevelNumber(securityLevel: string): number {
        switch(securityLevel?.toUpperCase()) {
            case 'MASTER': return 0
            case 'CRITICAL': return 1
            case 'HIGH': return 2
            case 'MEDIUM': return 3
            case 'LOW': return 4
            default: return 3
        }
    }
    private decodeBase64ToHex(base64String: string): string | null {
        try {
            const byteString = atob(base64String)
            const bytes: string[] = []
            for (let i = 0; i < byteString.length; i++) {
                const byte = byteString.charCodeAt(i)
                const hex = byte.toString(16).padStart(2, '0')
                bytes.push(hex)
            }
            return bytes.join('')
        } catch (e) {
            log('error', 'Failed to decode Base64 string:', e)
            return null
        }
    }
    /**
     * Web API Query wrapper - Pure fetch implementation
     */
    private async queryWebAPI(method: string, params: any[] = []): Promise<any> {
        return ErrorBoundary.wrap(async () => {
            const endpoint = getDapiEndpoint()
            const body = JSON.stringify({
                method,
                params,
                network: this.network,
            })
            log('debug', `[DAPI] Calling ${method} with params:`, params)
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body,
            })
            if (!response.ok) {
                if (response.status === 404) {
                    return null
                }
                const errorText = await response.text()
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
            }
            return await response.json()
        }, `QUERY_WEB_API_FAILED: ${method}`)
    }
}
// Singleton instance
let identityManager: IdentityManager | null = null
export function getIdentityManager(): IdentityManager {
    if (!identityManager) {
        identityManager = new IdentityManager()
    }
    return identityManager
}
