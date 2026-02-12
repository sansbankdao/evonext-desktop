// src/services/identity/discovery/KeyDiscovery.ts

import { PrivateKeyWASM } from 'pshenmic-dpp'
// @ts-ignore
import { binToHex, hexToBin } from '@evonext/utils'
import { hash160 } from '@/services/crypto'
import { BaseDiscovery } from './BaseDiscovery'
import { DAPIService } from './DAPIService'
import { KeyDerivationService } from '../keyDerivation.service'
import type {
    DiscoveredIdentity,
    IIdentityActions,
    DiscoveryResult,
    DiscoveryOptions,
    IPublicKey,
    PurposeType,
    SecurityLevelType
} from '@/types/identity'
// Mapping for DAPI string enums to numeric codes used internally
const PURPOSE_MAP: Record<string, number> = {
    'AUTHENTICATION': 0,
    'ENCRYPTION': 1,
    'DECRYPTION': 2,
    'TRANSFER': 3,
}
const SECURITY_LEVEL_MAP: Record<string, number> = {
    'MASTER': 0,
    'CRITICAL': 1,
    'HIGH': 2,
    'MEDIUM': 3,
}
export class KeyDiscovery extends BaseDiscovery {
    private store: IIdentityActions
    constructor(store: IIdentityActions) {
        super()
        this.store = store
    }
    async discover(
        input: string,
        options: DiscoveryOptions = { network: 'testnet' }
    ): Promise<DiscoveryResult> {
        return this.discoverFromKey(input, options)
    }
    async discoverFromKey(
        keyInput: string,
        options: DiscoveryOptions
    ): Promise<DiscoveryResult> {
        try {
            const clean = keyInput.trim()
            const format = KeyDerivationService.detectKeyFormat(clean)
            const network = options.network || 'testnet'
            let publicKeyHash: string = ''
            let privateKeyInstance: any = null
            // 1. Resolve Public Key Hash
            if (format.format.includes('PUBKEY')) {
                const pubBytes = hexToBin(clean.toLowerCase())
                const hashed = await hash160(pubBytes)
                publicKeyHash = binToHex(hashed)
            } else {
                privateKeyInstance = this.getPrivateKeyInstance(clean, network)
                if (!privateKeyInstance) throw new Error("Invalid private key format")
                const pubBytes = privateKeyInstance.getPublicKey().bytes()
                const hashed = await hash160(pubBytes)
                publicKeyHash = binToHex(hashed)
            }
            // 2. Query DAPI
            const result = await DAPIService.queryIdentityByHash(publicKeyHash, network, true)
            const data = result.data
            const id = data?.identityId
            if (result.success && data && typeof id === 'string') {
                const identityId: string = id
                // 3. Map DAPI keys to frontend IPublicKey interface
                // DAPI returns strings for purpose/securityLevel, we map to numeric codes
                const mappedKeys: IPublicKey[] = (data.publicKeys || []).map((pk: any, index: number) => ({
                    idx: pk.idx ?? pk.id ?? index,
                    keyType: pk.keyType || 'ECDSA_HASH160',
                    purpose: this.parsePurpose(pk.purpose),
                    securityLevel: this.parseSecurityLevel(pk.securityLevel),
                    data: pk.data || '',
                    readOnly: !!pk.readOnly,
                    disabledAt: pk.disabledAt || null
                }))
                const discovered: DiscoveredIdentity = {
                    identityId: identityId,
                    identityIdx: 0,
                    balance: String(data.balance || '0'),
                    revision: Number(data.revision || 0),
                    publicKeys: mappedKeys,
                    dpnsUsername: await DAPIService.getDPNSUsername(identityId, network)
                }
                // 4. Secure in local keystore if we have the private key
                if (privateKeyInstance) {
                    await this.store.saveKeys(network, identityId, [{
                        identityId: identityId,
                        keyId: 0,
                        purpose: 0,
                        securityLevel: 0,
                        keyType: 'ECDSA_HASH160',
                        privateKey: privateKeyInstance.WIF(),
                        publicKey: publicKeyHash,
                        createdAt: new Date().toISOString(),
                        lastUsed: new Date().toISOString()
                    }])
                }
                // Return both array and single identity property to satisfy all test variants
                return {
                    success: true,
                    identities: [discovered],
                    identity: discovered
                } as DiscoveryResult
            }
            return { success: false, error: 'No identity found associated with this key.' }
        } catch (error: any) {
            console.error('[KeyDiscovery] Error:', error)
            return { success: false, error: error.message || 'Discovery failed' }
        }
    }
    /**
     * Converts DAPI string-based purpose to numeric PurposeType.
     * Handles both string enums and numeric values for backwards compatibility.
     */
    private parsePurpose(value: any): PurposeType {
        if (typeof value === 'number' && [0, 1, 2, 3].includes(value)) {
            return value as PurposeType
        }
        if (typeof value === 'string') {
            const mapped = PURPOSE_MAP[value.toUpperCase()]
            if (mapped !== undefined) return mapped as PurposeType
        }
        return 0
    }
    /**
     * Converts DAPI string-based securityLevel to numeric SecurityLevelType.
     * Handles both string enums and numeric values for backwards compatibility.
     */
    private parseSecurityLevel(value: any): SecurityLevelType {
        if (typeof value === 'number' && [0, 1, 2, 3, 4].includes(value)) {
            return value as SecurityLevelType
        }
        if (typeof value === 'string') {
            const mapped = SECURITY_LEVEL_MAP[value.toUpperCase()]
            if (mapped !== undefined) return mapped as SecurityLevelType
        }
        return 3
    }
    private getPrivateKeyInstance(keyInput: string, network: string): any {
        try {
            const cleanKey = keyInput.trim()
            if (KeyDerivationService.detectKeyFormat(cleanKey).format === 'WIF') {
                return PrivateKeyWASM.fromWIF(cleanKey)
            }
            return PrivateKeyWASM.fromHex(cleanKey.toLowerCase(), network)
        } catch {
            return null
        }
    }
}
