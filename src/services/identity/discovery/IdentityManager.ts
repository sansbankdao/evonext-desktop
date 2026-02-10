// src/services/identity/discovery/IdentityManager.ts

import { KeyDiscovery } from './KeyDiscovery'
import { SeedDiscovery, type ProgressCallback } from './SeedDiscovery'
import { DAPIService } from './DAPIService'
import { KeyDerivationService } from '../keyDerivation.service'
import type { DiscoveredIdentity } from '@/types'
import type {
    DiscoveryResult,
    DiscoveryOptions,
    AssociatedKey,
} from '@/types'
import type { IIdentityActions } from '@/types'

export class IdentityManager {
    private keyDiscovery: KeyDiscovery
    private seedDiscovery: SeedDiscovery
    constructor(private store: IIdentityActions) {
        this.keyDiscovery = new KeyDiscovery(this.store)
        this.seedDiscovery = new SeedDiscovery(this.store)
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
        if (!keyInput?.trim()) {
            return {
                success: false,
                error: 'Invalid key input.',
                identities: null
            }
        }
        try {
            return await this.keyDiscovery.discover(keyInput.trim(), options)
        } catch (error: any) {
            return {
                success: false,
                error: `Key discovery failed: ${error.message || 'Unknown error'}`,
                identities: null
            }
        }
    }
    async discoverFromSeed(
        seedPhrase: string,
        options: DiscoveryOptions
    ): Promise<DiscoveryResult> {
        if (!seedPhrase?.trim()) {
            return {
                success: false,
                error: 'Invalid seed phrase.',
                identities: null
            }
        }
        const words = seedPhrase.trim().split(/\s+/)
        if (words.length !== 12 && words.length !== 24) {
            return {
                success: false,
                error: `Invalid seed phrase length: ${words.length} words.`,
                identities: null
            }
        }
        try {
            const seedOptions = {
                network: options.network,
                maxIdentityIndex: options.maxIdentityIndex || 5
            }
            const identities = await this.seedDiscovery.discoverFromSeed(
                seedPhrase.trim(),
                options.network,
                seedOptions
            )
            return {
                success: true,
                identities,
                detectedKeyType: 'SEED'
            }
        } catch (error: any) {
            return {
                success: false,
                error: `Seed discovery failed: ${error.message}`,
                identities: null
            }
        }
    }
    async discover(
        input: string,
        options: DiscoveryOptions = { network: 'testnet' }
    ): Promise<DiscoveryResult> {
        if (!input?.trim()) {
            return { success: false, error: 'Invalid input.', identities: null }
        }
        const trimmedInput = input.trim()
        const words = trimmedInput.split(/\s+/)
        if (words.length === 12 || words.length === 24) {
            return this.discoverFromSeed(trimmedInput, { ...options, maxIdentityIndex: 5 })
        }
        return this.discoverFromKey(trimmedInput, options)
    }
    async getIdentityById(
        identityId: string,
        network: 'mainnet' | 'testnet' = 'testnet'
    ): Promise<DiscoveryResult> {
        try {
            if (!identityId) return { success: false, error: 'Invalid ID', identities: null }
            const result = await DAPIService.getIdentityById(identityId.trim(), network)
            if (result.success && result.data) {
                const identityId = result.data.identityId
                const dpnsUsername = await DAPIService.getDPNSUsername(identityId, network)
                const discoveredIdentity: DiscoveredIdentity = {
                    identityId,
                    identityIdx: 0,
                    balance: this.formatBalance(result.data.balance),
                    revision: result.data.revision,
                    publicKeys: result.data.publicKeys || [],
                    dpnsUsername
                }
                return {
                    success: true,
                    identity: discoveredIdentity,
                    identities: null,
                    detectedKeyType: 'IDENTITY_ID',
                    associatedKeys: this.extractAssociatedKeys(discoveredIdentity.publicKeys)
                }
            }
            return { success: false, error: 'No identity found', identities: null }
        } catch (error: any) {
            return { success: false, error: error.message, identities: null }
        }
    }
    private formatBalance(balance: any): string {
        if (balance === undefined || balance === null) return '0'
        return balance.toString()
    }
    private extractAssociatedKeys(publicKeys: any[]): AssociatedKey[] {
        if (!Array.isArray(publicKeys)) return []
        return publicKeys.map((key: any) => ({
            purpose: this.getKeyPurposeDisplay(key.purpose),
            securityLevel: this.getSecurityLevelDisplay(key.securityLevel),
            keyType: key.keyType || 'UNKNOWN',
            derivedFromInput: false,
            data: key.data || key.dataB64 || ''
        }))
    }
    private getKeyPurposeDisplay(purpose: any): string {
        const p = String(purpose).toUpperCase()
        const map: Record<string, string> = {
            '0': 'Authentication', '1': 'Encryption',
            '2': 'Decryption', '3': 'Transfer',
            'AUTHENTICATION': 'Authentication', 'TRANSFER': 'Transfer'
        }
        return map[p] || p
    }
    private getSecurityLevelDisplay(level: any): string {
        const s = String(level).toUpperCase()
        const map: Record<string, string> = {
            '0': 'Master', '1': 'Critical', '2': 'High',
            '3': 'Medium', '4': 'Low',
            'MASTER': 'Master', 'HIGH': 'High'
        }
        return map[s] || s
    }
    cleanup() {
        this.cancelSeedDiscovery()
        KeyDerivationService.cleanup()
    }
}
let instance: IdentityManager | null = null
export function getIdentityManager(store?: any): IdentityManager {
    if (!instance) {
        if(!store) throw new Error('[IdentityManager] Store required');
        instance = new IdentityManager(store)
    }
    return instance
}
