// src/services/identity/discovery/IdentityManager.ts
import { KeyDiscovery } from './KeyDiscovery'
import { SeedDiscovery } from './SeedDiscovery'
import { DAPIService } from './DAPIService'
import { KeyDerivationService } from '../keyDerivation.service'
import type { DiscoveryResult, DiscoveryOptions } from '../types'
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
        options: DiscoveryOptions
    ): Promise<DiscoveryResult> {
        return this.keyDiscovery.discoverFromKey(keyInput, options)
    }
    /**
     * Discover identities from seed phrase
     */
    async discoverFromSeed(
        seedPhrase: string,
        options: DiscoveryOptions & { maxIdentityIndex?: number }
    ): Promise<DiscoveryResult> {
        return this.seedDiscovery.discoverFromSeed(seedPhrase, {
            network: options.network,
            maxIdentityIndex: options.maxIdentityIndex || 5,
            maxKeyIndex: options.maxKeyIndex || 5
        })
    }
    /**
     * Get DPNS username for an identity
     */
    async getDPNSUsername(
        identityId: string,
        network: 'mainnet' | 'testnet'
    ): Promise<string | null> {
        return DAPIService.getDPNSUsername(identityId, network)
    }
    /**
     * Get identity by ID
     */
    async getIdentityById(
        identityId: string,
        network: 'mainnet' | 'testnet'
    ): Promise<DiscoveryResult> {
        return DAPIService.getIdentityById(identityId, network)
    }
    /**
     * Detect key format
     */
    detectKeyFormat(keyInput: string): ReturnType<typeof KeyDerivationService.detectKeyFormat> {
        return KeyDerivationService.detectKeyFormat(keyInput)
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
