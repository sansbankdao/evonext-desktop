// src/services/identity/discovery/KeyDiscovery.ts

import { KeyDerivationService } from '../keyDerivation.service'
import { DAPIService } from './DAPIService'
// import { DAPIService, type DAPIHashSearchResult } from './DAPIService'
import { BaseDiscovery } from './BaseDiscovery'
// @ts-ignore
import { PrivateKeyWASM } from 'pshenmic-dpp'
// @ts-ignore
import { binToHex, hexToBin } from '@evonext/utils'
// @ts-ignore
import { hash160 } from '@evonext/crypto'

import type {
    DiscoveredIdentity,
    DiscoveryResult,
    DiscoveryOptions,
    // AssociatedKey,
} from '../types'

export class KeyDiscovery extends BaseDiscovery {
    /**
     * Implement abstract discover method from BaseDiscovery
     */
    async discover(
        input: string,
        options: DiscoveryOptions = { network: 'testnet' }
    ): Promise<DiscoveryResult> {
        return this.discoverFromKey(input, options)
    }

    /**
     * Main discovery method for any key format
     */
    async discoverFromKey(
        keyInput: string,
        options: DiscoveryOptions
    ): Promise<DiscoveryResult> {
        try {
            console.log(`[KeyDiscovery] Starting discovery for key on ${options.network}`)
            console.log(`[KeyDiscovery] Key input (first 20 chars): ${keyInput.substring(0, 20)}...`)

            // Step 1: Get the Private Key object
            const format = KeyDerivationService.detectKeyFormat(keyInput)
            const privateKey: PrivateKeyWASM | null = this.getPrivateKeyInstance(keyInput, options.network)

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

            // Step 2: Derive the Public Key Hash
            // This is the definitive hash derived from the key, matching Seed Discovery logic
            const publicKey = privateKey.getPublicKey()
            const publicKeyBytes = publicKey.bytes()
            const publicKeyHash = binToHex(hash160(publicKeyBytes))

            console.log(`[KeyDiscovery] Derived Public Key Hash: ${publicKeyHash.substring(0, 24)}...`)

            // Step 3: Search via Unique (Standard)
            const uniqueResult = await DAPIService.queryIdentityByHash(publicKeyHash, options.network, true)

            if (uniqueResult.success && uniqueResult.data) {
                console.log(`[KeyDiscovery] Found via UNIQUE lookup`)
                return this.createSuccessResultFromData(uniqueResult.data, options.network, format.format, {
                    step: 'comprehensive_search',
                    searchType: 'unique',
                    keyType: format.format,
                    ...uniqueResult.debug
                })
            }

            // Step 4: Search via Non-Unique (Fallback)
            // If unique failed, try non-unique
            const nonUniqueResult = await DAPIService.queryIdentityByHash(publicKeyHash, options.network, false)

            if (nonUniqueResult.success && nonUniqueResult.data) {
                console.log(`[KeyDiscovery] Found via NON-UNIQUE lookup`)
                return this.createSuccessResultFromData(nonUniqueResult.data, options.network, format.format, {
                    step: 'comprehensive_search',
                    searchType: 'non-unique',
                    keyType: format.format,
                    ...nonUniqueResult.debug
                })
            }

            // Step 5: Failure
            console.log(`[KeyDiscovery] No identity found for hash ${publicKeyHash.substring(0, 16)}...`)

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

    /**
     * Helper to derive PrivateKeyWASM from raw input
     */
    private getPrivateKeyInstance(keyInput: string, network: 'mainnet' | 'testnet'): PrivateKeyWASM | null {
        try {
            const cleanKey = keyInput.trim()
            const format = KeyDerivationService.detectKeyFormat(cleanKey)

            if (format.format === 'WIF') {
                return PrivateKeyWASM.fromWIF(cleanKey)
            }
            if (format.format === 'HEX_PRIVATE') {
                return PrivateKeyWASM.fromHex(cleanKey.toLowerCase(), network)
            }

            // Handle Public Keys (if user pasted them instead of private keys)
            if (format.format === 'COMPRESSED_PUBKEY' || format.format === 'UNCOMPRESSED_PUBKEY') {
                // We cannot derive a private key from a public key, but we can still search by hash
                // However, for the purpose of this specific function, we return null because
                // we expect a Private Key object to derive the hash ourselves.
                return null
            }

            return null
        } catch (error) {
            console.error('[KeyDiscovery] Failed to get private key instance:', error)
            return null
        }
    }

    /**
     * Helper to map DAPI result to DiscoveredIdentity
     */
    private async createSuccessResultFromData(
        identityData: any,
        network: 'mainnet' | 'testnet',
        keyType: string,
        debug?: any
    ): Promise<DiscoveryResult> {
        console.log(`[KeyDiscovery] Found identity: ${identityData.identityId || identityData.id}`)

        // Get DPNS username if available
        const dpnsUsername = await this.getDPNSUsernameFromData(identityData, network)

        // Create identity object
        const discoveredIdentity: DiscoveredIdentity = {
            identityId: identityData.identityId || identityData.id || '',
            balance: this.formatBalance(identityData.balance),
            revision: this.formatRevision(identityData.revision),
            publicKeys: identityData.publicKeys || [],
            dpnsUsername
        }

        // Extract key information
        const associatedKeys = this.extractAssociatedKeys(discoveredIdentity.publicKeys)

        return this.createSuccessResult(
            discoveredIdentity,
            null,
            keyType,
            associatedKeys,
            debug
        )
    }

    /**
     * Get DPNS username from identity data or fetch it
     */
    private async getDPNSUsernameFromData(
        identityData: any,
        network: 'mainnet' | 'testnet'
    ): Promise<string | null> {
        // First check if it's already in response
        if (identityData.dpnsUsername || identityData.username) {
            return identityData.dpnsUsername || identityData.username
        }

        // If not, fetch it separately
        const identityId = identityData.identityId || identityData.id
        if (identityId) {
            return await DAPIService.getDPNSUsername(identityId, network)
        }

        return null
    }
}
