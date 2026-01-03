// src/services/identity/discovery/SeedDiscovery.ts

import { KeyDerivationService } from '../keyDerivation.service'
import { DAPIService } from './DAPIService'
import { BaseDiscovery } from './BaseDiscovery'
import { invoke } from '@tauri-apps/api/core'
import { log } from '@/utils/env'
import type { DiscoveredIdentity } from '@/types'
import type {
    DiscoveryResult,
    DiscoveryOptions,
    // KeyDerivationResult,
    QueryTrace,
    ScanProgress,
} from '../types'
export interface SeedDiscoveryOptions {
    network: 'mainnet' | 'testnet'
    maxIdentityIndex: number
    maxKeyIndex: number
}
export type ProgressCallback = (progress: ScanProgress) => void
export class SeedDiscovery extends BaseDiscovery {
    private currentProgress: ScanProgress | null = null
    private progressCallback: ProgressCallback | null = null
    setProgressCallback(callback: ProgressCallback) {
        this.progressCallback = callback
    }
    private updateProgress(updates: Partial<ScanProgress>) {
        if (this.currentProgress) {
            this.currentProgress = { ...this.currentProgress, ...updates }
            if (this.progressCallback) {
                this.progressCallback(this.currentProgress)
            }
        }
    }
    // Helper to save derived keys to Rust
    private async saveDerivedKeysToStorage(
        seedPhrase: string,
        network: 'mainnet' | 'testnet',
        identityIdx: number,
        identityId: string,
        publicKeys: any[]
    ): Promise<boolean> {
        try {
            if (!identityId || !publicKeys || publicKeys.length === 0) {
                log('warn', `Cannot save keys: missing identity ID or public keys for ${identityId}`)
                return false
            }
            const now = new Date().toISOString()
            const privateKeyEntries: any[] = []
            for (let i = 0; i < publicKeys.length; i++) {
                const publicKey = publicKeys[i]
                // Simple assumption: iterating public keys matches derivation indices roughly
                // In a robust system, we would check the key derivation path stored in the public key if available
                const keyIndex = i
                try {
                    const derivationResult = await KeyDerivationService.getPrivateKeyWASM(
                        seedPhrase,
                        network,
                        identityIdx,
                        keyIndex
                    )
                    const keyEntry = {
                        identity_id: identityId,
                        key_id: publicKey.id || 0,
                        purpose: publicKey.purpose || 0,
                        security_level: publicKey.securityLevel || 0,
                        key_type: publicKey.keyType || 'ecdsa',
                        private_key: derivationResult.privateKey.WIF(),
                        public_key: publicKey.data || '',
                        derived_from_mnemonic: true,
                        created_at: now,
                        last_used: now
                    }
                    privateKeyEntries.push(keyEntry)
                } catch (deriveErr) {
                    continue
                }
            }
            if (privateKeyEntries.length > 0) {
                await invoke('save_private_keys', {
                    network,
                    identity_id: identityId,
                    private_keys: privateKeyEntries
                })
                log('info', `Saved ${privateKeyEntries.length} keys for identity ${identityId}`)
                return true
            }
            return false
        } catch (err) {
            log('error', `Failed to save derived keys for ${identityId}:`, err)
            return false
        }
    }
    // Implements abstract method from BaseDiscovery
    async discover(
        input: string,
        options: DiscoveryOptions = { network: 'testnet' }
    ): Promise<DiscoveryResult> {
        const seedOptions: SeedDiscoveryOptions = {
            network: options.network || 'testnet',
            maxIdentityIndex: 3,
            maxKeyIndex: 5
        }
        return this.discoverFromSeed(input, seedOptions)
    }
    async discoverFromSeed(
        seedPhrase: string,
        options: SeedDiscoveryOptions
    ): Promise<DiscoveryResult> {
        const traceLog: QueryTrace[] = []
        try {
            if (!this.isSeedPhrase(seedPhrase)) {
                return this.createErrorResult('Invalid seed phrase length')
            }
            const foundIdentities: DiscoveredIdentity[] = []
            this.currentProgress = {
                currentIdentityIndex: 0,
                currentKeyIndex: 0,
                totalIdentities: options.maxIdentityIndex,
                totalKeysPerIdentity: Math.min(5, options.maxKeyIndex),
                currentPublicKeyHash: '',
                currentPath: '',
                status: 'deriving',
                scannedCount: 0,
                foundCount: 0
            }
            // 1. Derive All Keys
            this.updateProgress({ status: 'deriving' })
            const allDerivations = await KeyDerivationService.deriveAllKeysFromSeed(
                seedPhrase,
                options.network,
                options.maxIdentityIndex,
                options.maxKeyIndex
            )
            this.updateProgress({
                totalIdentities: allDerivations.length,
                scannedCount: 0,
                status: 'scanning'
            })
            // 2. Scan
            for (let dIndex = 0; dIndex < allDerivations.length; dIndex++) {
                const derivation = allDerivations[dIndex]
                if (!derivation) continue;
                const identityIdx = derivation.identityIndex
                let foundForThisIndex = false
                this.updateProgress({ currentIdentityIndex: identityIdx })
                for (let kIndex = 0; kIndex < derivation.keys.length; kIndex++) {
                    const key = derivation.keys[kIndex]
                    if (!key || foundForThisIndex) break
                    const hash = key.publicKeyHash
                    this.updateProgress({
                        currentKeyIndex: key.keyIndex,
                        currentPublicKeyHash: hash,
                        currentPath: key.path
                    })
                    // Unique Lookup
                    const uniqueResult = await DAPIService.queryIdentityByHash(hash, options.network, true)
                    if (this.currentProgress) {
                        this.currentProgress.scannedCount++
                        this.updateProgress({ scannedCount: this.currentProgress.scannedCount })
                    }
                    if (uniqueResult.success && uniqueResult.data) {
                        await this.addIdentity(foundIdentities, uniqueResult.data, options.network, identityIdx, seedPhrase)
                        foundForThisIndex = true
                        if (this.currentProgress) {
                            this.currentProgress.foundCount++
                            this.updateProgress({ foundCount: this.currentProgress.foundCount })
                        }
                        break
                    }
                    // Fallback: Non-Unique
                    const nonUniqueResult = await DAPIService.queryIdentityByHash(hash, options.network, false)
                    if (this.currentProgress) {
                        this.currentProgress.scannedCount++
                        this.updateProgress({ scannedCount: this.currentProgress.scannedCount })
                    }
                    if (nonUniqueResult.success && nonUniqueResult.data) {
                        await this.addIdentity(foundIdentities, nonUniqueResult.data, options.network, identityIdx, seedPhrase)
                        foundForThisIndex = true
                        if (this.currentProgress) {
                            this.currentProgress.foundCount++
                            this.updateProgress({ foundCount: this.currentProgress.foundCount })
                        }
                        break
                    }
                }
            }
            this.updateProgress({ status: 'completed' })
            // Deduplicate results
            const uniqueIds = Array.from(new Set(foundIdentities.map(i => i.identityId)))
                .map(id => foundIdentities.find(i => i.identityId === id)!)
            if (uniqueIds.length > 0) {
                return this.createSuccessResult(null, uniqueIds)
            }
            return this.createErrorResult('No identities found.')
        } catch (error: any) {
            if (this.currentProgress) this.updateProgress({ status: 'failed' })
            return {
                success: false,
                error: error.message || 'Discovery failed',
                debug: { error: error.message, trace: traceLog }
            }
        } finally {
            this.currentProgress = null
        }
    }
    private async addIdentity(
        list: DiscoveredIdentity[],
        data: any,
        network: 'mainnet' | 'testnet',
        identityIdx: number,
        seedPhrase?: string
    ) {
        const id = data.identityId || data.id
        const dpnsUsername = await this.getDPNSUsernameFromData(data, network)
        const identity: DiscoveredIdentity = {
            identityId: id,
            identityIdx: identityIdx,
            balance: this.formatBalance(data.balance),
            revision: data.revision || 0,
            publicKeys: data.publicKeys || [],
            dpnsUsername
        }
        list.push(identity)
        // SAVE KEYS TO RUST IMMEDIATELY
        if (seedPhrase && id && data.publicKeys) {
            await this.saveDerivedKeysToStorage(seedPhrase, network, identityIdx, id, data.publicKeys)
        }
    }
    private async getDPNSUsernameFromData(data: any, network: 'mainnet' | 'testnet'): Promise<string | null> {
        if (data.dpnsUsername || data.username) return data.dpnsUsername || data.username
        const id = data.identityId || data.id
        if (id) return await DAPIService.getDPNSUsername(id, network)
        return null
    }
}
