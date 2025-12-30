// src/services/identity/discovery/IdentityManager.ts
import { KeyDiscovery } from './KeyDiscovery'
import { SeedDiscovery } from './SeedDiscovery'
import { DAPIService } from './DAPIService'
import { KeyDerivationService, type KeyType } from '../keyDerivation.service'
import type {
    DiscoveryResult,
    DiscoveryOptions,
    DiscoveredIdentity,
    AssociatedKey,
} from '../types'
import type { KeyHashDerivationResult } from '@/types'

export class IdentityManager {
    private keyDiscovery: KeyDiscovery
    private seedDiscovery: SeedDiscovery

    constructor() {
        this.keyDiscovery = new KeyDiscovery()
        this.seedDiscovery = new SeedDiscovery()
    }

    /**
     * Discover identity from any key format
     */
    async discoverFromKey(
        keyInput: string,
        options: DiscoveryOptions = { network: 'testnet' }
    ): Promise<DiscoveryResult> {
        // Validate input
        if (!keyInput || typeof keyInput !== 'string' || keyInput.trim().length === 0) {
            return {
                success: false,
                error: 'Invalid key input. Please provide a valid private key or public key.',
                identities: null,
                identity: null,
                detectedKeyType: null,
                associatedKeys: null,
                debug: {
                    step: 'input_validation',
                    input: keyInput ? keyInput.substring(0, 20) + '...' : 'empty',
                    network: options.network
                }
            }
        }

        try {
            return await this.keyDiscovery.discover(keyInput, options)
        } catch (error: any) {
            return {
                success: false,
                error: `Key discovery failed: ${error.message || 'Unknown error'}`,
                identities: null,
                identity: null,
                detectedKeyType: null,
                associatedKeys: null,
                debug: {
                    step: 'key_discovery_exception',
                    error: error.message,
                    stack: error.stack,
                    network: options.network,
                    input: keyInput.substring(0, 20) + '...'
                }
            }
        }
    }

    /**
     * Discover identities from seed phrase
     */
    async discoverFromSeed(
        seedPhrase: string,
        options: DiscoveryOptions & { maxIdentityIndex?: number } = {
            network: 'testnet',
            maxIdentityIndex: 5
        }
    ): Promise<DiscoveryResult> {
        // Validate input
        if (!seedPhrase || typeof seedPhrase !== 'string' || seedPhrase.trim().length === 0) {
            return {
                success: false,
                error: 'Invalid seed phrase. Please provide a valid 12 or 24-word seed phrase.',
                identities: null,
                identity: null,
                detectedKeyType: null,
                associatedKeys: null,
                debug: {
                    step: 'input_validation',
                    input: 'empty',
                    network: options.network
                }
            }
        }

        const words = seedPhrase.trim().split(/\s+/)
        if (words.length !== 12 && words.length !== 24) {
            return {
                success: false,
                error: `Invalid seed phrase length: ${words.length} words. Expected 12 or 24.`,
                identities: null,
                identity: null,
                detectedKeyType: null,
                associatedKeys: null,
                debug: {
                    step: 'seed_validation',
                    wordCount: words.length,
                    network: options.network
                }
            }
        }

        try {
            // Create seed discovery options
            const seedOptions = {
                network: options.network,
                maxIdentityIndex: options.maxIdentityIndex || 5,
                maxKeyIndex: 5
            }

            return await this.seedDiscovery.discoverFromSeed(seedPhrase, seedOptions)
        } catch (error: any) {
            return {
                success: false,
                error: `Seed discovery failed: ${error.message || 'Unknown error'}`,
                identities: null,
                identity: null,
                detectedKeyType: null,
                associatedKeys: null,
                debug: {
                    step: 'seed_discovery_exception',
                    error: error.message,
                    stack: error.stack,
                    network: options.network,
                    wordCount: words.length
                }
            }
        }
    }

    /**
     * Auto-detect input type and discover accordingly
     */
    async discover(
        input: string,
        options: DiscoveryOptions = { network: 'testnet' }
    ): Promise<DiscoveryResult> {
        if (!input || typeof input !== 'string' || input.trim().length === 0) {
            return {
                success: false,
                error: 'Invalid input. Please provide a seed phrase or key.',
                identities: null,
                identity: null,
                detectedKeyType: null,
                associatedKeys: null,
                debug: {
                    step: 'input_validation',
                    input: 'empty',
                    network: options.network
                }
            }
        }

        const trimmedInput = input.trim()
        const words = trimmedInput.split(/\s+/)

        // Check if input looks like a seed phrase
        if (words.length === 12 || words.length === 24) {
            console.log(`[IdentityManager] Auto-detected seed phrase (${words.length} words)`)
            return this.discoverFromSeed(trimmedInput, {
                ...options,
                maxIdentityIndex: 5
            })
        }

        // Otherwise treat as key
        console.log(`[IdentityManager] Auto-detected key input (${trimmedInput.length} chars)`)
        return this.discoverFromKey(trimmedInput, options)
    }

    /**
     * Get DPNS username for an identity
     */
    async getDPNSUsername(
        identityId: string,
        network: 'mainnet' | 'testnet' = 'testnet'
    ): Promise<string | null> {
        try {
            if (!identityId || typeof identityId !== 'string' || identityId.trim().length === 0) {
                console.warn('[IdentityManager] Invalid identity ID for DPNS lookup:', identityId)
                return null
            }

            return await DAPIService.getDPNSUsername(identityId.trim(), network)
        } catch (error) {
            console.error('[IdentityManager] Failed to get DPNS username:', error)
            return null
        }
    }

    /**
     * Get identity by ID
     */
    async getIdentityById(
        identityId: string,
        network: 'mainnet' | 'testnet' = 'testnet'
    ): Promise<DiscoveryResult> {
        try {
            if (!identityId || typeof identityId !== 'string' || identityId.trim().length === 0) {
                return {
                    success: false,
                    error: 'Invalid identity ID',
                    identities: null,
                    identity: null,
                    detectedKeyType: null,
                    associatedKeys: null,
                    debug: {
                        step: 'identity_id_validation',
                        identityId,
                        network
                    }
                }
            }

            const result = await DAPIService.getIdentityById(identityId.trim(), network)

            if (result.success && result.data) {
                const identityData = result.data

                // Get DPNS username if available
                const dpnsUsername = await this.getDPNSUsername(identityId.trim(), network)

                const discoveredIdentity: DiscoveredIdentity = {
                    identityId: identityData.identityId || identityData.id || identityId.trim(),
                    balance: this.formatBalance(identityData.balance),
                    revision: this.formatRevision(identityData.revision),
                    publicKeys: identityData.publicKeys || [],
                    dpnsUsername
                }

                const associatedKeys = this.extractAssociatedKeys(discoveredIdentity.publicKeys)

                return {
                    success: true,
                    identity: discoveredIdentity,
                    identities: null,
                    detectedKeyType: 'IDENTITY_ID',
                    associatedKeys,
                    debug: result.debug
                }
            }

            return {
                success: false,
                error: result.error || `No identity found with ID: ${identityId}`,
                identities: null,
                identity: null,
                detectedKeyType: null,
                associatedKeys: null,
                debug: result.debug
            }
        } catch (error: any) {
            return {
                success: false,
                error: `Failed to get identity by ID: ${error.message || 'Unknown error'}`,
                identities: null,
                identity: null,
                detectedKeyType: null,
                associatedKeys: null,
                debug: {
                    step: 'get_identity_by_id_exception',
                    identityId,
                    network,
                    error: error.message,
                    stack: error.stack
                }
            }
        }
    }

    /**
     * Detect key format
     */
    detectKeyFormat(keyInput: string): { format: KeyType; description: string } {
        return KeyDerivationService.detectKeyFormat(keyInput)
    }

    /**
     * Derive key hashes (for advanced use cases)
     */
    async deriveKeyHashes(
        keyInput: string,
        network: 'mainnet' | 'testnet' = 'testnet'
    ): Promise<KeyHashDerivationResult> {
        return KeyDerivationService.deriveAllPossibleHashes(keyInput, network)
    }

    /**
     * Helper methods for formatting and extraction (copied from BaseDiscovery)
     */
    private formatBalance(balance: any): string {
        if (balance === undefined || balance === null) return '0'
        if (typeof balance === 'number') return balance.toString()
        if (typeof balance === 'string') return balance
        try {
            return balance.toString()
        } catch {
            return '0'
        }
    }

    private formatRevision(revision: any): string {
        if (revision === undefined || revision === null) return '0'
        if (typeof revision === 'number') return revision.toString()
        if (typeof revision === 'string') return revision
        try {
            return revision.toString()
        } catch {
            return '0'
        }
    }

    private extractAssociatedKeys(publicKeys: any[]): AssociatedKey[] {
        if (!Array.isArray(publicKeys) || publicKeys.length === 0) {
            return []
        }

        return publicKeys.map(key => ({
            purpose: this.getKeyPurposeDisplay(key.purpose),
            securityLevel: this.getSecurityLevelDisplay(key.securityLevel),
            keyType: key.keyType || 'UNKNOWN',
            data: key.data || key.dataB64 || '',
            derivedFromInput: false
        }))
    }

    private getKeyPurposeDisplay(purpose: string): string {
        if (!purpose) return 'Unknown'

        const purposeMap: Record<string, string> = {
            'AUTHENTICATION': 'Authentication',
            'TRANSFER': 'Transfer',
            'ENCRYPTION': 'Encryption',
            'KEY_MANAGEMENT': 'Key Management',
            'SIGNING': 'Signing',
            'MASTER': 'Master'
        }
        return purposeMap[purpose.toUpperCase()] || purpose
    }

    private getSecurityLevelDisplay(securityLevel: string): string {
        if (!securityLevel) return 'Unknown'

        const levelMap: Record<string, string> = {
            'CRITICAL': 'Critical',
            'HIGH': 'High',
            'MEDIUM': 'Medium',
            'LOW': 'Low',
            'MASTER': 'Master'
        }
        return levelMap[securityLevel.toUpperCase()] || securityLevel
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        KeyDerivationService.cleanup()
    }
}

// Singleton instance
let identityManager: IdentityManager | null = null

export function getIdentityManager(): IdentityManager {
    if (!identityManager) {
        identityManager = new IdentityManager()
    }
    return identityManager
}
