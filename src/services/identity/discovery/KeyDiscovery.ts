// src/services/identity/discovery/KeyDiscovery.ts

import { BaseDiscovery } from './BaseDiscovery'
import { DAPIService } from './DAPIService'
import { KeyDerivationService } from '../keyDerivation.service'
import type { DiscoveredIdentity } from '@/types'
import type { IIdentityActions } from '@/types'
// @ts-ignore
import { PrivateKeyWASM } from 'pshenmic-dpp'
// @ts-ignore
import { binToHex, hexToBin } from '@evonext/utils'
// @ts-ignore
import { hash160 } from '@evonext/crypto'
import type {
    DiscoveryResult,
    DiscoveryOptions,
} from '@/types'

export class KeyDiscovery extends BaseDiscovery {
    private store: IIdentityActions

    constructor(store: IIdentityActions) {
        super()
        this.store = store
    }

    async discover(
        input: string,
        options: DiscoveryOptions = { data: { success: false }, node: {}, network: 'testnet' }
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
            console.log(`[KeyDiscovery] Starting discovery for key on ${options.network}`)

            // Public Key Path
            const isPub =
                format.format === 'COMPRESSED_PUBKEY' ||
                format.format === 'UNCOMPRESSED_PUBKEY'
            if (isPub) {
                const pubBytes = hexToBin(clean.toLowerCase())
                const publicKeyHash = binToHex(hash160(pubBytes))
                const uniqueResult = await DAPIService.queryIdentityByHash(publicKeyHash, options.network, true)
                const resultToUse = uniqueResult.success
                    ? uniqueResult
                    : await DAPIService.queryIdentityByHash(publicKeyHash, options.network, false)

                if (resultToUse.success && resultToUse.data) {
                    const identityData = resultToUse.data

                    const dpnsName = await DAPIService.getDPNSUsername(
                        identityData.identityId || identityData.id,
                        options.network
                    )

                    const discoveredIdentity: DiscoveredIdentity = {
                        identityId: identityData.identityId || identityData.id || '',
                        identityIdx: 0,
                        balance: this.formatBalance(identityData.balance),
                        revision: identityData.revision || 0,
                        publicKeys: identityData.publicKeys || [],
                        dpnsUsername: dpnsName
                    }

                    const associatedKeys = this.extractAssociatedKeys(discoveredIdentity.publicKeys)

                    return this.createSuccessResult(
                        discoveredIdentity,
                        null,
                        format.format,
                        associatedKeys,
                        { step: 'public_key_search', keyType: format.format }
                    )
                }
                return this.createErrorResult(
                    'No identity found for this public key.',
                    { step: 'public_key_search_failed', keyType: format.format }
                )
            }

            // Private Key Path
            const privateKey: PrivateKeyWASM | null =
                this.getPrivateKeyInstance(clean, options.network)

            if (!privateKey) {
                return this.createErrorResult(
                    `Unsupported key format.`,
                    { step: 'private_key_derivation_failed', network: options.network }
                )
            }

            const publicKey = privateKey.getPublicKey()
            const publicKeyBytes = publicKey.bytes()
            const publicKeyHash = binToHex(hash160(publicKeyBytes))
            const uniqueResult = await DAPIService.queryIdentityByHash(publicKeyHash, options.network, true)

            // Use unique or fallback to non-unique
            const result = uniqueResult.success && uniqueResult.data
                ? uniqueResult
                : await DAPIService.queryIdentityByHash(publicKeyHash, options.network, false)

            if (result.success && result.data) {
                const identityData = result.data

                const dpnsName = await DAPIService.getDPNSUsername(
                    identityData.identityId || identityData.id,
                    options.network
                )

                const discoveredIdentity: DiscoveredIdentity = {
                    identityId: identityData.identityId || identityData.id || '',
                    identityIdx: 0,
                    balance: this.formatBalance(identityData.balance),
                    revision: identityData.revision || 0,
                    publicKeys: identityData.publicKeys || [],
                    dpnsUsername: dpnsName
                }

                await this.saveDiscoveredKeyToStorage(
                    options.network,
                    privateKey,
                    identityData.identityId || identityData.id,
                    identityData.publicKeys || []
                )

                const associatedKeys = this.extractAssociatedKeys(discoveredIdentity.publicKeys)

                return this.createSuccessResult(
                    discoveredIdentity,
                    null,
                    format.format,
                    associatedKeys,
                    { step: 'search_success', keyType: format.format }
                )
            }

            return this.createErrorResult(
                'No identity found.',
                { step: 'search_failed', network: options.network }
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
            if (!identityId || !publicKeys || publicKeys.length === 0) return false

            const now = new Date().toISOString()
            const derivedPubHex = binToHex(privateKeyInstance.getPublicKey().bytes())

            const matching = publicKeys.find((pk: any) => {
                const dataHex = (pk.data || pk.dataB64 || '').toString().toLowerCase()
                return dataHex && dataHex === derivedPubHex.toLowerCase()
            })

            const entries: any[] = []

            entries.push({
                identityId,
                keyId: matching?.id ?? 0,
                purpose: matching?.purpose ?? 0,
                securityLevel: matching?.securityLevel ?? 0,
                keyType: matching?.keyType || 'ecdsa',
                privateKey: privateKeyInstance.WIF(),
                publicKey: derivedPubHex,
                derivedFromMnemonic: false,
                createdAt: now,
                lastUsed: now
            })

            await this.store.saveKeys(network, identityId, entries)

            return true
        } catch (err) {
            console.error(`[KeyDiscovery] Failed to save keys:`, err)
            return false
        }
    }
}
