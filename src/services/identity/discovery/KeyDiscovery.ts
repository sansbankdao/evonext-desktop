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
    IPublicKey
} from '@/types/identity'
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
                publicKeyHash = binToHex(Array.from(hashed))
            } else {
                privateKeyInstance = this.getPrivateKeyInstance(clean, network)
                if (!privateKeyInstance) throw new Error("Invalid private key format")
                const pubBytes = privateKeyInstance.getPublicKey().bytes()
                const hashed = await hash160(pubBytes)
                publicKeyHash = binToHex(Array.from(hashed))
            }
            // 2. Query DAPI
            const result = await DAPIService.queryIdentityByHash(publicKeyHash, network, true)
            if (result.success && result.data) {
                const data = result.data
                const identityId = data.identityId
                // 3. Map DAPI keys to frontend IPublicKey interface using idx
                const mappedKeys: IPublicKey[] = data.publicKeys.map((pk, index) => ({
                    idx: index, // Refactored from id
                    keyType: pk.keyType,
                    purpose: pk.purpose as any,
                    securityLevel: pk.securityLevel as any,
                    data: pk.data,
                    readOnly: pk.readOnly,
                    disabledAt: pk.disabledAt
                }))
                const discovered: DiscoveredIdentity = {
                    identityId: identityId,
                    identityIdx: 0,
                    balance: String(data.balance),
                    revision: Number(data.revision),
                    publicKeys: mappedKeys,
                    dpnsUsername: await DAPIService.getDPNSUsername(identityId, network)
                }
                // 4. Secure in local keystore
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
                return { success: true, identities: [discovered] }
            }
            return { success: false, error: 'No identity found associated with this key.' }
        } catch (error: any) {
            console.error('[KeyDiscovery] Error:', error)
            return { success: false, error: error.message || 'Discovery failed' }
        }
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
