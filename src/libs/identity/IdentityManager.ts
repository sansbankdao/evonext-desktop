// src/libs/identity/IdentityManager.ts
import { DashPlatformSDK } from 'dash-platform-sdk'
// @ts-ignore
import { hash160 } from '@evonext/crypto'
// @ts-ignore
import { binToHex } from '@evonext/utils'
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
    private sdk: DashPlatformSDK | null = null
    private network: 'testnet' | 'mainnet' = 'testnet'
    async initialize(): Promise<void> {
        return ErrorBoundary.wrap(async () => {
            this.network = await getNetwork()
            this.sdk = new DashPlatformSDK({ network: this.network })
            log('info', `IdentityManager initialized for network: ${this.network}`)
        }, 'IDENTITY_MANAGER_INIT_FAILED')
    }
    /**
     * Will search ALL keys and signature schemes for an Identity's
     * registered public keys.
     */
    async getIdentities(options?: IdentitySearchOptions): Promise<IIdentity[] | null> {
        return ErrorBoundary.wrap(async () => {
            if (!this.sdk) {
                await this.initialize()
            }
            const minIndexSearch = options?.minIndexSearch || DEFAULT_IDENTITY_SEARCH_LIMIT
            const queryRegistry = options?.queryRegistry || DEFAULT_QUERY_REGISTRY
            const signatureScheme = options?.signatureScheme
            log('debug', `Searching identities with options:`, { minIndexSearch, queryRegistry, signatureScheme })
            const identities: IIdentity[] = []
            for (let i = 0; i < minIndexSearch; i++) {
                let result: any = null
                // Try different signature schemes based on options or default order
                if (!signatureScheme || signatureScheme === 'hash160') {
                    result = await this.searchByHash160(i, queryRegistry)
                }
                if (!result && (!signatureScheme || signatureScheme === 'ecdsa')) {
                    result = await this.searchBySecp256k1(i, queryRegistry)
                }
                if (result) {
                    console.log(`[DEBUG] Found identity at index ${i}: ${result.identityId}`)
                    console.log(`[DEBUG] Public keys found: ${result.regPubKeys?.length || 0}`)
                    // Map the DAPI response to our IIdentity interface
                    const identity: IIdentity = {
                        id: result.identityId,
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
                    break // exit for-loop after first found identity
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
            default: return 3 // MEDIUM as default
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
    private async searchByHash160(
        identityIdx: number,
        queryRegistry: boolean
    ): Promise<{ identityId: string; regPubKeys: any[] } | null> {
        return ErrorBoundary.wrap(async () => {
            const keyManager = getPrivateKeyManager()
            const privateKeys = await keyManager.getPrivateKeys(identityIdx, queryRegistry)
            console.log(`[DEBUG HASH160] Getting private keys for index ${identityIdx}`)
            console.log(`[DEBUG HASH160] Master key exists: ${!!privateKeys.masterKey}`)
            const publicKey = privateKeys.masterKey.getPublicKey()
            const publicKeyBytes = publicKey.bytes()
            console.log(`[DEBUG HASH160] Public key bytes length: ${publicKeyBytes.length}`)
            const publicKeyHash = binToHex(hash160(publicKey.bytes()))
            console.log(`[DEBUG HASH160] Generated hash: ${publicKeyHash}`)
            // Try get_identity_by_non_unique_public_key_hash first
            console.log(`[DEBUG HASH160] Calling get_identity_by_non_unique_public_key_hash...`)
            const result = await this.queryWebAPI('get_identity_by_non_unique_public_key_hash', [publicKeyHash])
            if (result && typeof result === 'object' && result.result?.identityId) {
                console.log(`[DEBUG HASH160] ✅ Found identity: ${result.result.identityId}`)
                return {
                    identityId: result.result.identityId,
                    regPubKeys: result.result.publicKeys || []
                }
            }
            console.log(`[DEBUG HASH160] ❌ No identity found with hash160`)
            return null
        }, 'SEARCH_BY_HASH160_FAILED')
    }
    private async searchBySecp256k1(
        identityIdx: number,
        queryRegistry: boolean
    ): Promise<{ identityId: string; regPubKeys: any[] } | null> {
        return ErrorBoundary.wrap(async () => {
            const keyManager = getPrivateKeyManager()
            const privateKeys = await keyManager.getPrivateKeys(identityIdx, queryRegistry)
            console.log(`[DEBUG SECP256K1] Getting private keys for index ${identityIdx}`)
            console.log(`[DEBUG SECP256K1] Master key exists: ${!!privateKeys.masterKey}`)
            const publicKey = privateKeys.masterKey.getPublicKey()
            const publicKeyBytes = publicKey.bytes()
            console.log(`[DEBUG SECP256K1] Public key bytes length: ${publicKeyBytes.length}`)
            const publicKeyHash = binToHex(hash160(publicKey.bytes()))
            console.log(`[DEBUG SECP256K1] Generated hash: ${publicKeyHash}`)
            // Try get_identity_by_public_key_hash
            console.log(`[DEBUG SECP256K1] Calling get_identity_by_public_key_hash...`)
            const result = await this.queryWebAPI('get_identity_by_public_key_hash', [publicKeyHash])
            if (result && typeof result === 'object' && result.result?.identityId) {
                console.log(`[DEBUG SECP256K1] ✅ Found identity: ${result.result.identityId}`)
                return {
                    identityId: result.result.identityId,
                    regPubKeys: result.result.publicKeys || []
                }
            }
            console.log(`[DEBUG SECP256K1] ❌ No identity found with secp256k1`)
            return null
        }, 'SEARCH_BY_SECP256K1_FAILED')
    }
    /**
     * Web API Query wrapper
     */
    private async queryWebAPI(_method: string, _params: any[]): Promise<any> {
        return ErrorBoundary.wrap(async () => {
            const network = await getNetwork()
            const body = JSON.stringify({
                method: _method,
                params: _params,
                network,
            })
            console.log(`[DEBUG DAPI] Calling ${_method} with params:`, _params)
            const response = await fetch(getDapiEndpoint(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body,
            })
            console.log(`[DEBUG DAPI] Response status: ${response.status}`)
            if (!response.ok) {
                const errorText = await response.text()
                console.log(`[DEBUG DAPI] Error response:`, errorText)
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            const result = await response.json()
            console.log(`[DEBUG DAPI] Response success: ${result.success}`)
            if (result && result.success && result.result) {
                console.log(`[DEBUG DAPI] Found identity: ${result.result.identityId}`)
            }
            return result
        }, 'QUERY_WEB_API_FAILED')
    }
    async getIdentityById(identityId: string): Promise<IIdentity | null> {
        return ErrorBoundary.wrap(async () => {
            if (!this.sdk) {
                await this.initialize()
            }
            try {
                console.log(`[DEBUG] Getting identity by ID: ${identityId}`)
                const identity = await this.sdk!.identities.getIdentityByIdentifier(identityId)
                const publicKeys = identity.getPublicKeys()
                console.log(`[DEBUG] Found identity: ${identityId} with ${publicKeys.length} public keys`)
                return {
                    identity_idx: 0, // Unknown for direct lookup
                    publicKeys: publicKeys.map((_key: any, _index: number) => ({
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
            } catch (error) {
                log('error', `Failed to get identity by ID: ${identityId}`, error)
                return null
            }
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
