// src/services/identity/discovery/KeyDiscovery.ts

// @ts-ignore
import { PrivateKeyWASM } from 'pshenmic-dpp'
// @ts-ignore
import { binToHex, hexToBin } from '@evonext/utils'

import { hash160 } from '@/services/crypto'

import { BaseDiscovery } from './BaseDiscovery'
import { DAPIService } from './DAPIService'

import { KeyDerivationService } from '../keyDerivation.service'

import type { DiscoveredIdentity, IIdentityActions, DiscoveryResult, DiscoveryOptions } from '@/types'

export class KeyDiscovery extends BaseDiscovery {
    private store: IIdentityActions
    constructor(store: IIdentityActions) {
        super()
        this.store = store
    }

    /**
     * Helper to safely convert bytes to hex, ensuring the input is a standard array
     * This prevents "bytes.reduce is not a function" errors
     */
    private safeBinToHex(bytes: any): string {
        if (!bytes) return ''
        try {
            // Ensure we are working with a standard JS Array or Uint8Array
            // Array.from() handles WASM-wrapped memory objects that might lack .reduce
            const buffer = Array.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes))
            return binToHex(buffer)
        } catch (err) {
            console.error('[KeyDiscovery] Hex conversion failed:', err)
            return ''
        }
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
            console.log(`[KeyDiscovery] Starting discovery for ${format.format} on ${network}`)
            let publicKeyHash: string = ''
            let privateKeyInstance: PrivateKeyWASM | null = null

            // 1. Resolve Public Key Hash based on input type
            const isPub = format.format === 'COMPRESSED_PUBKEY' || format.format === 'UNCOMPRESSED_PUBKEY'
            if (isPub) {
                const pubBytes = hexToBin(clean.toLowerCase())
                const hashed = hash160(pubBytes)
                publicKeyHash = this.safeBinToHex(hashed)
            } else {
                privateKeyInstance = this.getPrivateKeyInstance(clean, network)
                if (!privateKeyInstance) {
                    return this.createErrorResult(`Unsupported or invalid private key format.`)
                }
                const publicKeyBytes = privateKeyInstance.getPublicKey().bytes()
                const hashed = hash160(publicKeyBytes)
                publicKeyHash = this.safeBinToHex(hashed)
            }

            if (!publicKeyHash) {
                throw new Error("Failed to derive public key hash from input")
            }

            // 2. Query DAPI
            const uniqueResult = await DAPIService.queryIdentityByHash(publicKeyHash, network, true)
            const result = (uniqueResult.success && uniqueResult.data)
                ? uniqueResult
                : await DAPIService.queryIdentityByHash(publicKeyHash, options.network, false)

            if (result.success && result.data) {
                const identityData = result.data
                const id = identityData.identityId || identityData.id
                const dpnsName = await DAPIService.getDPNSUsername(id, network)
                const discoveredIdentity: DiscoveredIdentity = {
                    identityId: id,
                    identityIdx: 0,
                    balance: this.formatBalance(identityData.balance),
                    revision: identityData.revision || 0,
                    publicKeys: identityData.publicKeys || [],
                    dpnsUsername: dpnsName
                }

                // 3. If it was a private key, save it to secure storage
                if (privateKeyInstance) {
                    await this.saveDiscoveredKeyToStorage(
                        network,
                        privateKeyInstance,
                        id,
                        identityData.publicKeys || []
                    )
                }

                const associatedKeys = this.extractAssociatedKeys(discoveredIdentity.publicKeys)
                return this.createSuccessResult(
                    discoveredIdentity,
                    null,
                    format.format,
                    associatedKeys,
                    { step: 'search_success', keyType: format.format, hash: publicKeyHash }
                )
            }
            return this.createErrorResult(
                'No identity found associated with this key.',
                { step: 'search_failed', network, hash: publicKeyHash }
            )
        } catch (error: any) {
            return this.handleError(error, 'Key Discovery')
        }
    }

    private getPrivateKeyInstance(
        keyInput: string,
        network: 'mainnet' | 'testnet'
    ): PrivateKeyWASM | null {
        try {
            const cleanKey = keyInput.trim()
            const format = KeyDerivationService.detectKeyFormat(cleanKey)

            if (format.format === 'WIF') {
                return PrivateKeyWASM.fromWIF(cleanKey)
            }

            if (format.format === 'HEX_PRIVATE') {
                return PrivateKeyWASM.fromHex(cleanKey.toLowerCase(), network)
            }
            return null
        } catch (error) {
            console.error('[KeyDiscovery] Instance creation failed:', error)
            return null
        }
    }

    private async saveDiscoveredKeyToStorage(
        network: 'mainnet' | 'testnet',
        privateKeyInstance: PrivateKeyWASM,
        identityId: string,
        publicKeys: any[]
    ): Promise<boolean> {
        try {
            if (!identityId || !publicKeys.length) return false
            const derivedPubHex = this.safeBinToHex(privateKeyInstance.getPublicKey().bytes())
            const matching = publicKeys.find((pk: any) => {
                const dataHex = (pk.data || pk.dataB64 || '').toString().toLowerCase()
                return dataHex === derivedPubHex.toLowerCase()
            })

            const entry = {
                identityId,
                keyId: matching?.id ?? 0,
                purpose: matching?.purpose ?? 0,
                securityLevel: matching?.securityLevel ?? 0,
                keyType: matching?.keyType || 'ecdsa',
                privateKey: privateKeyInstance.WIF(),
                publicKey: derivedPubHex,
                derivedFromMnemonic: false,
                createdAt: new Date().toISOString(),
                lastUsed: new Date().toISOString()
            }

            await this.store.saveKeys(network, identityId, [entry])
            return true
        } catch (err) {
            console.error(`[KeyDiscovery] Failed to save keys:`, err)
            return false
        }
    }
}
