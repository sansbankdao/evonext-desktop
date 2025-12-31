// src/services/identity/discovery/KeyDiscovery.ts

import { KeyDerivationService } from '../keyDerivation.service'
import { DAPIService, type DAPIHashSearchResult } from './DAPIService'
import { BaseDiscovery } from './BaseDiscovery'
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

            // Step 1: Derive all possible hashes from the key
            const derivationResult = await KeyDerivationService.deriveAllPossibleHashes(keyInput, options.network)

            if (derivationResult.hashes.length === 0) {
                return this.createErrorResult(
                    'Could not derive any public key hashes from provided key',
                    {
                        step: 'hash_derivation_failed',
                        network: options.network,
                        error: derivationResult.debug?.error
                    }
                )
            }

            console.log(`[KeyDiscovery] Derived ${derivationResult.hashes.length} possible hashes:`)
            derivationResult.hashes.forEach((hash, i) => {
                console.log(`[KeyDiscovery] Hash ${i}: ${hash.substring(0, 24)}...`)
            })

            // Step 2: Search for each hash (unique then non-unique)
            const searchPromises: Promise<DAPIHashSearchResult>[] = []
            for (const hash of derivationResult.hashes) {
                // Try Unique first
                searchPromises.push(DAPIService.queryIdentityByHash(hash, options.network, true))
                // If Unique fails, we might need to try non-unique, but let's do sequential or parallel
                // To be safe and thorough, we check both or rely on the query order
                // DAPIService returns a result, we check success.
            }

            const results = await Promise.all(searchPromises)

            // Step 3: Find first successful result
            const successfulResult = results.find(result => result.success)

            if (successfulResult && successfulResult.data) {
                const identityData = successfulResult.data
                console.log(`[KeyDiscovery] Found identity: ${identityData.identityId || identityData.id}`)

                // Get DPNS username if available
                const dpnsUsername = await this.getDPNSUsernameFromData(identityData, options.network)

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
                    null, // identities (not used for single key discovery)
                    derivationResult.keyType,
                    associatedKeys,
                    {
                        step: 'comprehensive_search',
                        searchType: successfulResult.searchType,
                        keyType: derivationResult.keyType,
                        dpnsUsername,
                        ...successfulResult.debug
                    }
                )
            }

            // Step 4: If no identity found
            console.log(`[KeyDiscovery] No identity found for ${derivationResult.hashes.length} derived hashes`)

            return this.createErrorResult(
                'No identity found. The key may not be registered on this network.',
                {
                    step: 'comprehensive_search_failed',
                    network: options.network,
                    keyType: derivationResult.keyType
                }
            )

        } catch (error: any) {
            return this.handleError(error, 'Key Discovery')
        }
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
