// src/services/identity/discovery/KeyDiscovery.ts

import { BaseDiscovery } from './BaseDiscovery'
import { DAPIService } from './DAPIService'
import { KeyDerivationService } from '../keyDerivation.service'
import { invoke } from '@tauri-apps/api/core'
import type { DiscoveredIdentity } from '@/types'
// @ts-ignore
import { PrivateKeyWASM } from 'pshenmic-dpp'
// @ts-ignore
import { binToHex, hexToBin } from '@evonext/utils'
// @ts-ignore
import { hash160 } from '@evonext/crypto'
import type {
    DiscoveryResult,
    DiscoveryOptions,
} from '../types'
export class KeyDiscovery extends BaseDiscovery {
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
            console.log(`[KeyDiscovery] Starting discovery for key on ${options.network}`)
            console.log(`[KeyDiscovery] Detected format: ${format.format}`)
            // If input is a public key, derive hash directly and query DAPI
            const isPub =
                format.format === 'COMPRESSED_PUBKEY' ||
                format.format === 'UNCOMPRESSED_PUBKEY'
            if (isPub) {
                const pubBytes = hexToBin(clean.toLowerCase())
                const publicKeyHash = binToHex(hash160(pubBytes))
                console.log(`[KeyDiscovery] Derived Public Key Hash: ${publicKeyHash.substring(0, 24)}...`)
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
            // Private key path
            const privateKey: PrivateKeyWASM | null =
                this.getPrivateKeyInstance(clean, options.network)
            if (!privateKey) {
                return this.createErrorResult(
                    `Unsupported key format or derivation failed. Detected: ${format.description}`,
                    {
                        step: 'private_key_derivation_failed',
                        network: options.network,
                        keyType: format.format
                    }
                )
            }
            // Derive Public Key Hash from private key
            const publicKey = privateKey.getPublicKey()
            const publicKeyBytes = publicKey.bytes()
            const publicKeyHash = binToHex(hash160(publicKeyBytes))
            console.log(`[KeyDiscovery] Derived Public Key Hash: ${publicKeyHash.substring(0, 24)}...`)
            // Unique lookup
            const uniqueResult = await DAPIService.queryIdentityByHash(publicKeyHash, options.network, true)
            if (uniqueResult.success && uniqueResult.data) {
                const identityData = uniqueResult.data
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
                    {
                        step: 'comprehensive_search',
                        searchType: 'unique',
                        keyType: format.format,
                        ...uniqueResult.debug
                    }
                )
            }
            // Non-unique fallback
            const nonUniqueResult = await DAPIService.queryIdentityByHash(publicKeyHash, options.network, false)
            if (nonUniqueResult.success && nonUniqueResult.data) {
                const identityData = nonUniqueResult.data
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
                    {
                        step: 'comprehensive_search',
                        searchType: 'non-unique',
                        keyType: format.format,
                        ...nonUniqueResult.debug
                    }
                )
            }
            // Failure
            return this.createErrorResult(
                'No identity found. The key may not be registered on this network.',
                {
                    step: 'comprehensive_search_failed',
                    network: options.network,
                    keyType: format.format,
                    searchedHash: publicKeyHash.substring(0, 16) + '...'
                }
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
            // Public keys are handled separately above
            return null
        } catch (error) {
            console.error('[KeyDiscovery] Failed to get private key instance:', error)
            return null
        }
    }
    // Save ONLY the matching key (not every keyId). Multiple keys require the seed path.
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
            // Try to match exact public key
            const matching = publicKeys.find((pk: any) => {
                const dataHex = (pk.data || pk.dataB64 || '').toString().toLowerCase()
                return dataHex && dataHex === derivedPubHex.toLowerCase()
            })
            const entries: any[] = []
            if (matching) {
                entries.push({
                    identityId,
                    keyId: matching.id ?? 0,
                    purpose: matching.purpose ?? 0,
                    securityLevel: matching.securityLevel ?? 0,
                    keyType: matching.keyType || 'ecdsa',
                    privateKey: privateKeyInstance.WIF(),
                    publicKey: derivedPubHex,
                    derivedFromMnemonic: false,
                    createdAt: now,
                    lastUsed: now
                })
            } else {
                // Fallback: save as keyId 0 if no exact match found
                entries.push({
                    identityId,
                    keyId: 0,
                    purpose: 0,
                    securityLevel: 0,
                    keyType: 'ecdsa',
                    privateKey: privateKeyInstance.WIF(),
                    publicKey: derivedPubHex,
                    derivedFromMnemonic: false,
                    createdAt: now,
                    lastUsed: now
                })
            }
            await invoke('save_private_keys', {
                network,
                identityId,
                privateKeys: entries
            })
            return true
        } catch (err) {
            console.error(`[KeyDiscovery] Failed to save keys:`, err)
            return false
        }
    }
}
