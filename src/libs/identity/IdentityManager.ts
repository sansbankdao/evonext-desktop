// src/libs/identity/IdentityManager.ts
import { DashPlatformSDK } from 'dash-platform-sdk'
// @ts-ignore
import { hash160 } from '@evonext/crypto'
// @ts-ignore
import { binToHex, hexToBin } from '@evonext/utils'
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
                    identities.push({
                        identity_idx: i,
                        publicKeys: result.regPubKeys.map((_key: IPublicKey) => ({
                            type: this.getKeyTypeId(_key.keyType),
                            keyType: _key.keyType,
                            purpose: _key.purpose,
                            securityLevel: _key.securityLevel,
                            contractBounds: _key.contractBounds,
                            data: _key.data,
                            dataBytes: this.decodeBase64ToHex(_key.data),
                            readOnly: _key.readOnly,
                            disabledAt: _key.disabledAt,
                        }))
                    })
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
    ): Promise<{ identityId: string; regPubKeys: IPublicKey[] } | null> {
        return ErrorBoundary.wrap(async () => {
            const keyManager = getPrivateKeyManager()
            const privateKeys = await keyManager.getPrivateKeys(identityIdx, queryRegistry)
            const publicKey = privateKeys.masterKey.getPublicKey()
            const publicKeyHash = binToHex(hash160(publicKey.bytes()))
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
    private async searchBySecp256k1(
        identityIdx: number,
        queryRegistry: boolean
    ): Promise<{ identityId: string; regPubKeys: IPublicKey[] } | null> {
        return ErrorBoundary.wrap(async () => {
            const keyManager = getPrivateKeyManager()
            const privateKeys = await keyManager.getPrivateKeys(identityIdx, queryRegistry)
            const publicKey = privateKeys.masterKey.getPublicKey()
            const publicKeyHash = binToHex(hash160(publicKey.bytes()))
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
            const response = await fetch(getDapiEndpoint(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body,
            })
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            const result = await response.json()
            const isIdentityLookup = _method.includes('get_identity_by_')
            // Normalize "not found" responses for identity lookup methods
            if (isIdentityLookup && (
                result === null ||
                (Array.isArray(result) && result.length === 0) ||
                (result.error && typeof result.error === 'string' && (
                    result.error.includes('Resource not found.') ||
                    result.error.includes('not found')
                ))
            )) {
                log('debug', `Normalized ${_method} to empty array (no results found)`)
                return []
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
                const identity = await this.sdk!.identities.getIdentityByIdentifier(identityId)
                const publicKeys = identity.getPublicKeys()
                return {
                    identity_idx: 0, // Unknown for direct lookup
                    publicKeys: publicKeys.map((_key: any, _index: number) => ({
                        type: this.getKeyTypeId(_key.keyType),
                        keyType: _key.keyType,
                        purpose: _key.purposeNumber,
                        securityLevel: _key.securityLevelNumber,
                        contractBounds: _key.contractBounds,
                        data: _key.data,
                        dataBytes: this.decodeBase64ToHex(_key.data),
                        readOnly: _key.readOnly,
                        disabledAt: _key.disabledAt,
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
