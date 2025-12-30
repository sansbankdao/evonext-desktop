// src/services/identity/discovery/SeedDiscovery.ts

import { KeyDerivationService } from '../keyDerivation.service'
import { DAPIService, type DAPIHashSearchResult } from './DAPIService'
import type { DiscoveredIdentity, DiscoveryResult } from '../types'

export interface SeedDiscoveryOptions {
    network: 'mainnet' | 'testnet'
    maxIdentityIndex: number
    maxKeyIndex: number
}

export class SeedDiscovery {
    /**
     * Discover identities from seed phrase
     */
    async discoverFromSeed(
        seedPhrase: string,
        options: SeedDiscoveryOptions
    ): Promise<DiscoveryResult> {
        try {
            console.log(`[SeedDiscovery] Starting seed discovery on ${options.network}`)
            console.log(`[SeedDiscovery] Seed phrase (word count): ${seedPhrase.trim().split(/\s+/).length} words`)

            // Validate seed phrase
            const words = seedPhrase.trim().split(/\s+/)

            if (words.length !== 12 && words.length !== 24) {
                return {
                    success: false,
                    error: `Invalid seed phrase length: ${words.length} words. Expected 12 or 24.`,
                    debug: { step: 'validation', wordCount: words.length }
                }
            }

            // Step 1: Derive all keys from seed
            const derivationResults = await KeyDerivationService.deriveAllKeysFromSeed(
                seedPhrase,
                options.network,
                options.maxIdentityIndex,
                options.maxKeyIndex
            )

            const successfulDerivations = derivationResults.filter(r => r.success)

            if (successfulDerivations.length === 0) {
                return {
                    success: false,
                    error: 'Failed to derive any keys from seed phrase. Please check your seed phrase.',
                    debug: {
                        step: 'seed_derivation_failed',
                        results: derivationResults.map(r => ({
                            identityIndex: r.identityIndex,
                            success: r.success,
                            keysCount: r.keys.length,
                            error: r.error
                        }))
                    }
                }
            }
            console.log(`[SeedDiscovery] Derived ${successfulDerivations.length} successful identity indexes`)

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
                return {
                    success: true,
                    identities,
                    debug: {
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
                            hash: r.hash.substring(0, 16) + '...',
                            success: r.result.success,
                            identityId: r.result.data?.identityId || r.result.data?.id || null,
                            searchType: r.result.searchType
                        }))
                    }
                }
            }
            return {
                success: false,
                error: 'No identities found for this seed phrase on the current network.',
                debug: {
                    step: 'seed_discovery_no_identities',
                    derivationResults: derivationResults.length,
                    searchResults: searchResults.length,
                    successfulSearches: searchResults.filter(r => r.result.success).length
                }
            }
        } catch (error: any) {
            console.error('[SeedDiscovery] Discovery failed:', error)
            return {
                success: false,
                error: `Seed discovery failed: ${error.message || 'Unknown error'}`,
                debug: {
                    step: 'exception',
                    error: error.message,
                    stack: error.stack
                }
            }
        }
    }

    /**
     * Get DPNS username from identity data or fetch it
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
     * Format balance from DAPI response
     */
    private formatBalance(balance: any): string {
        if (!balance && balance !== 0) return '0'
        return balance.toString()
    }

    /**
     * Format revision from DAPI response
     */
    private formatRevision(revision: any): string {
        if (!revision && revision !== 0) return '0'
        return revision.toString()
    }

    /**
     * Extract key metrics for display
     */
    static extractKeyMetrics(identity: DiscoveredIdentity) {
        const publicKeys = identity.publicKeys || []

        return {
            authenticationKeys: publicKeys.filter((k: any) => k.purpose === 'AUTHENTICATION').length,
            transferKeys: publicKeys.filter((k: any) => k.purpose === 'TRANSFER').length,
            encryptionKeys: publicKeys.filter((k: any) => k.purpose === 'ENCRYPTION').length,
            totalKeys: publicKeys.length
        }
    }
}
