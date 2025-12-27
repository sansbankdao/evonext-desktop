// src/libs/identity/IdentityManager.ts
// Removed DashPlatformSDK import to prevent CORS/Websocket issues
import { ErrorBoundary } from '@/utils/errors'
import { log, getDapiEndpoint } from '@/utils/env'
import { DEFAULT_IDENTITY_SEARCH_LIMIT, DEFAULT_QUERY_REGISTRY } from '@/constants'
import getNetwork from '../getNetwork'
import { getPrivateKeyManager } from '../keys/PrivateKeyManager'
import type {
    IdentitySearchOptions,
    IIdentity,
    IPublicKey
} from '@/types'
export class IdentityManager {
    private network: 'testnet' | 'mainnet' = 'testnet'
    private isInitializing = false
    /**
     * Initialize basic settings without connecting to sockets
     */
    async initialize(): Promise<void> {
        return ErrorBoundary.wrap(async () => {
            if (this.isInitializing) return // Prevent race conditions
            this.isInitializing = true
            this.network = await getNetwork()
            this.isInitializing = false
            log('info', `IdentityManager initialized for network: ${this.network}`)
        }, 'IDENTITY_MANAGER_INIT_FAILED')
    }
    /**
     * Search all keys for an Identity's registered public keys.
     * No SDK initialization required - pure DAPI calls.
     */
    async getIdentities(options?: IdentitySearchOptions): Promise<IIdentity[] | null> {
        return ErrorBoundary.wrap(async () => {
            // Ensure we have network info
            if (this.network === 'testnet' && !this.isInitializing) {
                await this.initialize()
            }
            const minIndexSearch = options?.minIndexSearch || DEFAULT_IDENTITY_SEARCH_LIMIT
            const queryRegistry = options?.queryRegistry || DEFAULT_QUERY_REGISTRY
            const signatureScheme = options?.signatureScheme
            log('debug', `Searching identities with options:`, { minIndexSearch, queryRegistry, signatureScheme })
            const identities: IIdentity[] = []
            for (let i = 0; i < minIndexSearch; i++) {
                let result: any = null
                // Try different signature schemes
                if (!signatureScheme || signatureScheme === 'hash160') {
                    result = await this.searchByHash160(i, queryRegistry)
                }
                if (!result && (!signatureScheme || signatureScheme === 'ecdsa')) {
                    result = await this.searchBySecp256k1(i, queryRegistry)
                }
                if (result) {
                    const identity: IIdentity = {
                        identity_idx: i,
                        publicKeys: (result.regPubKeys || []).map((_key: any) => ({
                            type: this.getKeyTypeId(_key.keyType),
                            keyType: _key.keyType,
                            purpose: this.getPurposeNumber(_key.purpose),
                            securityLevel: this.getSecurityLevelNumber(_key.securityLevel),
                            contractBounds: _key.contractBounds || null,
                            data: _key.data || '',
                            dataBytes: this.decodeBase64ToHex(_key.dataB64 || ''),
                            readOnly: _key.readOnly || false,
                            disabledAt: _key.disabledAt || null,
                        }))
                    }
                    identities.push(identity)
                    log('debug', `Found identity at index ${i}: ${result.identityId}`)
                    break // Stop after first found identity
                }
            }
            if (identities.length === 0) {
                log('warn', 'No identities found for the provided credentials.')
                return null
            }
            log('info', `Found ${identities.length} identities`)
            return identities
        }, 'GET_IDENTITIES_FAILED')
    }
    private getKeyTypeId(_keyType: string | undefined): number {
        switch(_keyType) {
            case 'ECDSA_SECP256K1': return 0
            case 'BLS12_381': return 1
            case 'ECDSA_HASH160': return 2
            case 'BIP13_SCRIPT_HASH': return 3
            case 'EDDSA_25519_HASH160': return 4
            default: return -1
        }
    }
    private getPurposeNumber(purpose: string): number {
        switch(purpose) {
            case 'AUTHENTICATION': return 0
            case 'TRANSFER': return 1
            case 'ENCRYPTION': return 2
            default: return 0
        }
    }
    private getSecurityLevelNumber(securityLevel: string): number {
        switch(securityLevel) {
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
     * Search by non-unique public key hash (Primary method)
     */
    private async searchByHash160(
        identityIdx: number,
        queryRegistry: boolean
    ): Promise<{ identityId: string; regPubKeys: any[] } | null> {
        return ErrorBoundary.wrap(async () => {
            const keyManager = getPrivateKeyManager()
            const privateKeys = await keyManager.getPrivateKeys(identityIdx, queryRegistry)
            // Assuming a helper function exists to get hash160.
            // We will rely on the keyManager to provide it or standard crypto.
            // For now, we simulate the 'binToHex' and 'hash160' call that was in the source.
            // NOTE: You need to replace these with actual crypto calls.
            // Placeholder logic - this must be implemented via @evonext/crypto or webcrypto
            let publicKeyHash = "";
            try {
                // const publicKey = privateKeys.masterKey.getPublicKey()
                // const publicKeyBytes = publicKey.bytes()
                // publicKeyHash = binToHex(hash160(publicKeyBytes))
                // Fallback/Placeholder if crypto modules are failing:
                publicKeyHash = "0000000000000000000000000000000000000000000";
            } catch (e) {
                console.error("[HASH160] Crypto error:", e);
                return null;
            }
            const result = await this.queryWebAPI('get_identity_by_non_unique_public_key_hash', [publicKeyHash])
            if (result && typeof result === 'object' && result.result?.identityId) {
                return {
                    identityId: result.result.identityId,
                    regPubKeys: result.result.publicKeys || []
                }
            }
            return null
        }, 'SEARCH_BY_HASH160_FAILED')
    }
    /**
     * Search by unique public key hash (Secondary method)
     */
    private async searchBySecp256k1(
        identityIdx: number,
        queryRegistry: boolean
    ): Promise<{ identityId: string; regPubKeys: any[] } | null> {
        return ErrorBoundary.wrap(async () => {
            const keyManager = getPrivateKeyManager()
            const privateKeys = await keyManager.getPrivateKeys(identityIdx, queryRegistry)
            let publicKeyHash = "";
            try {
                // const publicKey = privateKeys.masterKey.getPublicKey()
                // const publicKeyBytes = publicKey.bytes()
                // publicKeyHash = binToHex(hash160(publicKeyBytes))
                publicKeyHash = "0000000000000000000000000000000000000000000";
            } catch (e) {
                console.error("[SECP256K1] Crypto error:", e);
                return null;
            }
            const result = await this.queryWebAPI('get_identity_by_public_key_hash', [publicKeyHash])
            if (result && typeof result === 'object' && result.result?.identityId) {
                return {
                    identityId: result.result.identityId,
                    regPubKeys: result.result.publicKeys || []
                }
            }
            return null
        }, 'SEARCH_BY_SECP256K1_FAILED')
    }
    /**
     * Web API Query wrapper - Pure fetch implementation
     */
    private async queryWebAPI(_method: string, _params: any[]): Promise<any> {
        return ErrorBoundary.wrap(async () => {
            const network = this.network
            const endpoint = getDapiEndpoint()
            const body = JSON.stringify({
                method: _method,
                params: _params,
                network,
            })
            console.log(`[DEBUG DAPI] Calling ${_method} with params:`, _params)
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
            const result = await response.json()
            return result
        }, 'QUERY_WEB_API_FAILED')
    }
    /**
     * Lookup identity directly by ID
     */
    async getIdentityById(identityId: string): Promise<IIdentity | null> {
        return ErrorBoundary.wrap(async () => {
            // Direct DAPI call without SDK
            const result = await this.queryWebAPI('identity_fetch', [identityId])
            if (result && typeof result === 'object' && result.result) {
                const data = result.result
                return {
                    identity_idx: 0,
                    publicKeys: (data.publicKeys || []).map((_key: any, _index: number) => ({
                        type: this.getKeyTypeId(_key.keyType),
                        keyType: _key.keyType,
                        purpose: this.getPurposeNumber(_key.purpose),
                        securityLevel: this.getSecurityLevelNumber(_key.securityLevel),
                        contractBounds: _key.contractBounds || null,
                        data: _key.data || '',
                        dataBytes: this.decodeBase64ToHex(_key.dataB64 || ''),
                        readOnly: _key.readOnly || false,
                        disabledAt: _key.disabledAt || null,
                    }))
                }
            }
            return null
        }, 'GET_IDENTITY_BY_ID_FAILED')
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
