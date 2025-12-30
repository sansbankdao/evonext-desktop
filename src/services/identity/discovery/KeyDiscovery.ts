// src/services/identity/discovery/KeyDiscovery.ts

import { KeyDerivationService } from '../keyDerivation.service'
import { DAPIService } from './DAPIService'
import type {
    AssociatedKey,
    DiscoveredIdentity,
    DiscoveryResult,
    DiscoveryOptions,
} from '../types'

export class KeyDiscovery {
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
                return {
                    success: false,
                    error: 'Could not derive any public key hashes from the provided key',
                    debug: derivationResult.debug
                }
            }
            console.log(`[KeyDiscovery] Derived ${derivationResult.hashes.length} possible hashes:`)
            derivationResult.hashes.forEach((hash, i) => {
                console.log(`[KeyDiscovery] Hash ${i}: ${hash.substring(0, 24)}...`)
            })

            // Step 2: Search for each hash (both unique and non-unique)
            const searchPromises = derivationResult.hashes.map(hash =>
                DAPIService.searchByHash(hash, options.network)
            )
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

                return {
                    success: true,
                    identity: discoveredIdentity,
                    detectedKeyType: derivationResult.keyType,
                    associatedKeys,
                    debug: {
                        step: 'comprehensive_search',
                        searchType: successfulResult.searchType,
                        derivedHashes: derivationResult.hashes,
                        foundHash: derivationResult.hashes[results.findIndex(r => r.success)],
                        ...successfulResult.debug,
                        dpnsUsername
                    }
                }
            }

            // Step 4: If no identity found
            console.log(`[KeyDiscovery] No identity found for ${derivationResult.hashes.length} derived hashes`)
            const errors = results
                .filter(r => r.error)
                .map(r => r.error)
                .join('; ')

            return {
                success: false,
                detectedKeyType: derivationResult.keyType,
                error: errors || 'No identity found. The key may not be registered on this network.',
                debug: {
                    step: 'comprehensive_search_failed',
                    derivedHashes: derivationResult.hashes,
                    keyType: derivationResult.keyType,
                    results: results.map(r => ({
                        success: r.success,
                        error: r.error,
                        searchType: r.searchType,
                        debug: r.debug
                    }))
                }
            }
        } catch (error: any) {
            console.error('[KeyDiscovery] Search failed:', error)
            return {
                success: false,
                error: `Discovery failed: ${error.message || 'Unknown error'}`,
                debug: { step: 'exception', error: error.stack }
            }
        }
    }

    /**
     * Helper to extract associated keys from identity data
     */
    private extractAssociatedKeys(publicKeys: any[]): AssociatedKey[] {
        return (publicKeys || []).map(key => ({
            purpose: this.getKeyPurposeDisplay(key.purpose),
            securityLevel: this.getSecurityLevelDisplay(key.securityLevel),
            keyType: key.keyType || 'UNKNOWN',
            data: key.data || key.dataB64 || '',
            derivedFromInput: false // We would need to compare with input key to determine this
        }))
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
     * Convert key purpose to display string
     */
    private getKeyPurposeDisplay(purpose: string): string {
        const purposeMap: Record<string, string> = {
            'AUTHENTICATION': 'Authentication',
            'TRANSFER': 'Transfer',
            'ENCRYPTION': 'Encryption',
            'KEY_MANAGEMENT': 'Key Management',
            'SIGNING': 'Signing',
            'MASTER': 'Master'
        }
        return purposeMap[purpose] || purpose
    }

    /**
     * Convert security level to display string
     */
    private getSecurityLevelDisplay(securityLevel: string): string {
        const levelMap: Record<string, string> = {
            'CRITICAL': 'Critical',
            'HIGH': 'High',
            'MEDIUM': 'Medium',
            'LOW': 'Low',
            'MASTER': 'Master'
        }
        return levelMap[securityLevel] || securityLevel
    }
}
