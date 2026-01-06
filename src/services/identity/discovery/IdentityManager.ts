// src/services/identity/discovery/IdentityManager.ts

import { KeyDiscovery } from './KeyDiscovery'
import { SeedDiscovery, type ProgressCallback } from './SeedDiscovery'
import { DAPIService } from './DAPIService'
import { KeyDerivationService, type KeyType } from '../keyDerivation.service'
import type { DiscoveredIdentity } from '@/types'
import type {
    DiscoveryResult,
    DiscoveryOptions,
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
    setProgressCallback(callback: ProgressCallback) {
        this.seedDiscovery.setProgressCallback(callback)
    }
    clearProgressCallback() {
        this.seedDiscovery.setProgressCallback(() => {})
    }
    cancelSeedDiscovery() {
        this.seedDiscovery.cancel()
    }
    async discoverFromKey(
        keyInput: string,
        options: DiscoveryOptions = { network: 'testnet' }
    ): Promise<DiscoveryResult> {
        if (!keyInput || typeof keyInput !== 'string' || keyInput.trim().length === 0) {
            return {
                success: false,
                error: 'Invalid key input. Please provide a valid private key or public key.',
                identities: null,
                identity: null,
                detectedKeyType: null,
                associatedKeys: null,
                debug: { step: 'input_validation', network: options.network }
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
                debug: { step: 'key_discovery_exception', network: options.network, error: error.message }
            }
        }
    }
    async discoverFromSeed(
        seedPhrase: string,
        options: DiscoveryOptions & { maxIdentityIndex?: number } = {
            network: 'testnet',
            maxIdentityIndex: 5
        }
    ): Promise<DiscoveryResult> {
        if (!seedPhrase || typeof seedPhrase !== 'string' || seedPhrase.trim().length === 0) {
            return {
                success: false,
                error: 'Invalid seed phrase. Please provide a valid 12 or 24-word seed phrase.',
                identities: null,
                identity: null,
                detectedKeyType: null,
                associatedKeys: null,
                debug: { step: 'input_validation', network: options.network }
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
                debug: { step: 'seed_validation', network: options.network }
            }
        }
        try {
            const seedOptions = {
                network: options.network,
                minIndexSearch: options.maxIdentityIndex || 5,
                gapLimit: 5,
                maxKeyIndex: 5
            }
            const identities = await this.seedDiscovery.discoverFromSeed(
                seedPhrase,
                options.network,
                seedOptions
            )
            return {
                success: true,
                identities,
                identity: null,
                detectedKeyType: 'SEED',
                associatedKeys: null,
                debug: { step: 'seed_discovery_success', network: options.network }
            }
        } catch (error: any) {
            return {
                success: false,
                error: `Seed discovery failed: ${error.message || 'Unknown error'}`,
                identities: null,
                identity: null,
                detectedKeyType: null,
                associatedKeys: null,
                debug: { step: 'seed_discovery_exception', network: options.network, error: error.message }
            }
        }
    }
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
                debug: { step: 'input_validation', network: options.network }
            }
        }
        const trimmedInput = input.trim()
        const words = trimmedInput.split(/\s+/)
        if (words.length === 12 || words.length === 24) {
            console.log(`[IdentityManager] Auto-detected seed phrase (${words.length} words)`)
            return this.discoverFromSeed(trimmedInput, { ...options, maxIdentityIndex: 5 })
        }
        console.log(`[IdentityManager] Auto-detected key input (${trimmedInput.length} chars)`)
        return this.discoverFromKey(trimmedInput, options)
    }
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
                    debug: { step: 'identity_id_validation', network }
                }
            }
            const result = await DAPIService.getIdentityById(identityId.trim(), network)
            if (result.success && result.data) {
                const identityData = result.data
                const dpnsUsername = await this.getDPNSUsername(identityId.trim(), network)
                const discoveredIdentity: DiscoveredIdentity = {
                    identityId: identityData.identityId || identityData.id || identityId.trim(),
                    identityIdx: 0,
                    balance: this.formatBalance(identityData.balance),
                    revision: identityData.revision,
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
                debug: { step: 'get_identity_by_id_exception', network, error: error.message }
            }
        }
    }
    detectKeyFormat(keyInput: string): { format: KeyType; description: string } {
        return KeyDerivationService.detectKeyFormat(keyInput)
    }
    async deriveKeyHashes(
        keyInput: string,
        network: 'mainnet' | 'testnet' = 'testnet'
    ): Promise<KeyHashDerivationResult> {
        return KeyDerivationService.deriveAllPossibleHashes(keyInput, network)
    }
    // Helper methods
    private formatBalance(balance: any): string {
        if (balance === undefined || balance === null) return '0'
        if (typeof balance === 'number') return balance.toString()
        if (typeof balance === 'string') return balance
        try { return balance.toString() } catch { return '0' }
    }
    private extractAssociatedKeys(publicKeys: any[]): AssociatedKey[] {
        if (!Array.isArray(publicKeys) || publicKeys.length === 0) {
            return []
        }
        return publicKeys.map((key: any) => ({
            purpose: this.getKeyPurposeDisplay(key.purpose),
            securityLevel: this.getSecurityLevelDisplay(key.securityLevel),
            keyType: key.keyType || 'UNKNOWN',
            data: key.data || key.dataB64 || '',
            derivedFromInput: false
        }))
    }
    private getKeyPurposeDisplay(purpose: string | number): string {
        const p = typeof purpose === 'string' ? purpose.toUpperCase() : String(purpose)
        const purposeMap: Record<string, string> = {
            '0': 'Authentication',
            '1': 'Transfer',
            '2': 'Encryption',
            '3': 'Key Management',
            'AUTHENTICATION': 'Authentication',
            'TRANSFER': 'Transfer',
            'ENCRYPTION': 'Encryption',
            'KEY_MANAGEMENT': 'Key Management',
            'SIGNING': 'Signing',
            'MASTER': 'Master'
        }
        return purposeMap[p] || String(purpose)
    }
    private getSecurityLevelDisplay(securityLevel: string | number): string {
        const s = typeof securityLevel === 'string' ? securityLevel.toUpperCase() : String(securityLevel)
        const levelMap: Record<string, string> = {
            '0': 'Master',
            '1': 'Critical',
            '2': 'High',
            '3': 'Medium',
            '4': 'Low',
            'CRITICAL': 'Critical',
            'HIGH': 'High',
            'MEDIUM': 'Medium',
            'LOW': 'Low',
            'MASTER': 'Master'
        }
        return levelMap[s] || String(securityLevel)
    }
    cleanup() {
        this.cancelSeedDiscovery()
        KeyDerivationService.cleanup()
    }
}
// Singleton accessor to preserve existing imports
let identityManagerSingleton: IdentityManager | null = null
export function getIdentityManager(): IdentityManager {
    if (!identityManagerSingleton) {
        identityManagerSingleton = new IdentityManager()
    }
    return identityManagerSingleton
}
