// src/services/identity/discovery/SeedDiscovery.ts

import { KeyDerivationService } from '../keyDerivation.service'
import { DAPIService, type DAPIHashSearchResult } from './DAPIService'
import { BaseDiscovery } from './BaseDiscovery'
import type { DiscoveredIdentity, DiscoveryResult, DiscoveryOptions } from '../types'

export interface SeedDiscoveryOptions {
    network: 'mainnet' | 'testnet'
    maxIdentityIndex: number
    maxKeyIndex: number
}

export class SeedDiscovery extends BaseDiscovery {
    /**
     * Implement the abstract discover method from BaseDiscovery
     */
    async discover(
        input: string,
        options: DiscoveryOptions = { network: 'testnet' }
    ): Promise<DiscoveryResult> {
        // Convert DiscoveryOptions to SeedDiscoveryOptions
        const seedOptions: SeedDiscoveryOptions = {
            network: options.network,
            maxIdentityIndex: 5,
            maxKeyIndex: 5
        }

        // Call the discoverFromSeed method with proper options
        return this.discoverFromSeed(input, seedOptions)
    }

    /**
     * Discover identities from seed phrase
     */
    async discoverFromSeed(
        seedPhrase: string,
        options: SeedDiscoveryOptions
    ): Promise<DiscoveryResult> {
        try {
            console.log(`[SeedDiscovery] Starting seed discovery on ${options.network}`)

            // Validate seed phrase
            if (!this.isSeedPhrase(seedPhrase)) {
                return this.createErrorResult(
                    `Invalid seed phrase length: ${seedPhrase.trim().split(/\s+/).length} words. Expected 12 or 24.`,
                    {
                        wordCount: seedPhrase.trim().split(/\s+/).length,
                        ...this.createDebugInfo('validation_failed')
                    }
                )
            }

            console.log(`[SeedDiscovery] Seed phrase (word count): ${seedPhrase.trim().split(/\s+/).length} words`)

            // Step 1: Derive all keys from seed
            const derivationResults = await KeyDerivationService.deriveAllKeysFromSeed(
                seedPhrase,
                options.network,
                options.maxIdentityIndex,
                options.maxKeyIndex
            )

            const successfulDerivations = derivationResults.filter(r => r.success && r.keys.length > 0)
            if (successfulDerivations.length === 0) {
                return this.createErrorResult(
                    'Failed to derive any keys from seed phrase. Please check your seed phrase.',
                    {
                        step: 'seed_derivation_failed',
                        results: derivationResults.map(r => ({
                            identityIndex: r.identityIndex,
                            success: r.success,
                            keysCount: r.keys.length,
                            error: r.error
                        })),
                        ...this.createDebugInfo('derivation_failed')
                    }
                )
            }

            console.log(`[SeedDiscovery] Derived ${successfulDerivations.length} successful identity indexes with ${successfulDerivations.reduce((acc, r) => acc + r.keys.length, 0)} keys`)

            // Step 2: Prepare all search promises
            const searchPromises: Promise<{
                identityIndex: number
                keyIndex: number
                hash: string
                result: DAPIHashSearchResult
            }>[] = []

            for (const derivationResult of successfulDerivations) {
                for (const key of derivationResult.keys) {
                    // Create a promise that resolves with the correct structure
                    const searchPromise = (async () => {
                        const result = await DAPIService.searchByHash(key.publicKeyHash, options.network)
                        return {
                            identityIndex: derivationResult.identityIndex,
                            keyIndex: key.keyIndex,
                            hash: key.publicKeyHash,
                            result
                        }
                    })()
                    searchPromises.push(searchPromise)
                }
            }

            console.log(`[SeedDiscovery] Searching ${searchPromises.length} derived public key hashes...`)
            const searchResults = await Promise.all(searchPromises)

            // Step 3: Collect unique identities found
            const identityMap = new Map<string, {
                identity: DiscoveredIdentity
                identityIndex: number
                foundByKeyIndex: number
                foundByHash: string
            }>()

            for (const searchResult of searchResults) {
                if (searchResult.result.success && searchResult.result.data) {
                    const identityData = searchResult.result.data
                    const identityId = identityData.identityId || identityData.id

                    if (identityId && !identityMap.has(identityId)) {
                        // Get DPNS username
                        const dpnsUsername = await this.getDPNSUsernameFromData(identityData, options.network)

                        identityMap.set(identityId, {
                            identity: {
                                identityId,
                                balance: this.formatBalance(identityData.balance),
                                revision: this.formatRevision(identityData.revision),
                                publicKeys: identityData.publicKeys || [],
                                dpnsUsername
                            },
                            identityIndex: searchResult.identityIndex,
                            foundByKeyIndex: searchResult.keyIndex,
                            foundByHash: searchResult.hash
                        })

                        console.log(`[SeedDiscovery] Found identity ${identityId.substring(0, 16)}... at index ${searchResult.identityIndex}`)
                    }
                }
            }

            const identities = Array.from(identityMap.values()).map(item => item.identity)

            if (identities.length > 0) {
                console.log(`[SeedDiscovery] Found ${identities.length} unique identities from seed`)
                return this.createSuccessResult(
                    null, // No single identity
                    identities,
                    undefined, // No key type for seed
                    undefined, // Associated keys handled differently
                    this.sanitizeDebugOutput({
                        step: 'seed_discovery_complete',
                        identitiesFound: identities.length,
                        derivationResults: derivationResults.map(r => ({
                            identityIndex: r.identityIndex,
                            keysCount: r.keys.length,
                            success: r.success,
                            error: r.error
                        })),
                        searchResults: searchResults.map(r => ({
                            identityIndex: r.identityIndex,
                            keyIndex: r.keyIndex,
                            success: r.result.success,
                            searchType: r.result.searchType
                        })),
                        ...this.createDebugInfo('complete')
                    })
                )
            }

            return this.createErrorResult(
                'No identities found for this seed phrase on the current network.',
                this.sanitizeDebugOutput({
                    step: 'seed_discovery_no_identities',
                    derivationResults: derivationResults.length,
                    searchResults: searchResults.length,
                    successfulSearches: searchResults.filter(r => r.result.success).length,
                    ...this.createDebugInfo('no_identities')
                })
            )

        } catch (error: any) {
            return this.handleError(error, 'Seed Discovery')
        }
    }

    /**
     * Get DPNS username from identity data or fetch it
     * This method should be private since it's specific to this class
     */
    private async getDPNSUsernameFromData(
        identityData: any,
        network: 'mainnet' | 'testnet'
    ): Promise<string | null> {
        // First check if it's already in the response
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

    /**
     * Helper method to extract key metrics for display
     */
    extractKeyMetrics(identity: DiscoveredIdentity): {
        authenticationKeys: number
        transferKeys: number
        encryptionKeys: number
        totalKeys: number
    } {
        const publicKeys = identity.publicKeys || []
        return {
            authenticationKeys: publicKeys.filter((k: any) => k.purpose === 'AUTHENTICATION').length,
            transferKeys: publicKeys.filter((k: any) => k.purpose === 'TRANSFER').length,
            encryptionKeys: publicKeys.filter((k: any) => k.purpose === 'ENCRYPTION').length,
            totalKeys: publicKeys.length
        }
    }
}
