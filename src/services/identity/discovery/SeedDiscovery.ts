// src/services/identity/discovery/SeedDiscovery.ts

import { KeyDerivationService } from '../keyDerivation.service'
import { DAPIService } from './DAPIService'
import { BaseDiscovery } from './BaseDiscovery'
import { invoke } from '@tauri-apps/api/core' // ADD THIS import
import { log } from '@/utils/env' // ADD THIS import
import type { DiscoveredIdentity } from '@/types'
import type {
    DiscoveryResult,
    DiscoveryOptions,
    KeyDerivationResult,
    QueryTrace,
    ScanProgress,
    // DerivedKeyInfo // ADD THIS import
} from '../types'
export interface SeedDiscoveryOptions {
    network: 'mainnet' | 'testnet'
    maxIdentityIndex: number
    maxKeyIndex: number
}
// Progress callback type
export type ProgressCallback = (progress: ScanProgress) => void
export class SeedDiscovery extends BaseDiscovery {
    private currentProgress: ScanProgress | null = null
    private progressCallback: ProgressCallback | null = null
    // Set a callback to receive progress updates
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
    // NEW: Helper to save derived keys to Rust
    private async saveDerivedKeysToStorage(
        seedPhrase: string,
        network: 'mainnet' | 'testnet',
        identityIdx: number,
        identityId: string,
        publicKeys: any[]
    ): Promise<boolean> {
        try {
            if (!identityId || !publicKeys || publicKeys.length === 0) {
                log('warn', `Cannot save keys: missing identity ID or public keys for identity ${identityId}`)
                return false
            }
            const now = new Date().toISOString()
            const privateKeyEntries: any[] = []
            for (let i = 0; i < publicKeys.length; i++) {
                const publicKey = publicKeys[i]
                const keyIndex = i

                try {
                    // Skip if we don't have required info
                    if (publicKey.purpose === undefined || publicKey.securityLevel === undefined) {
                        log('warn', `Skipping public key ${publicKey.id}: missing purpose or securityLevel`)
                        continue
                    }
                    // Derive private key based on the public key's purpose and security level
                    const derivationResult = await KeyDerivationService.getPrivateKeyWASM(
                        seedPhrase,
                        network,
                        identityIdx,
                        keyIndex
                    )
                    const privateKeyWIF = derivationResult.privateKey.WIF()
                    const keyEntry = {
                        identity_id: identityId,
                        key_id: publicKey.id || 0,
                        purpose: publicKey.purpose,
                        security_level: publicKey.securityLevel || 0,
                        key_type: publicKey.keyType || 'ecdsa',
                        private_key: privateKeyWIF,
                        public_key: publicKey.data || publicKey.dataB64 || '',
                        derived_from_mnemonic: true,
                        created_at: now,
                        last_used: now
                    }
                    privateKeyEntries.push(keyEntry)
                    log('info', `Derived key for identity ${identityId}:`, {
                        purpose: publicKey.purpose,
                        securityLevel: publicKey.securityLevel,
                        keyId: publicKey.id
                    })
                } catch (deriveErr) {
                    log('error', `Error deriving key ${publicKey.id} for identity ${identityId}:`, deriveErr)
                }
            }
            if (privateKeyEntries.length > 0) {
                // Save keys to Rust
                await invoke('save_private_keys', {
                    network,
                    identity_id: identityId,
                    private_keys: privateKeyEntries
                })
                log('info', `Saved ${privateKeyEntries.length} keys for identity ${identityId}`)
                return true
            } else {
                log('warn', `No keys derived for identity ${identityId}`)
                return false
            }
        } catch (err) {
            log('error', `Failed to save derived keys for ${identityId}:`, err)
            return false
        }
    }
    async discover(
        input: string,
        options: DiscoveryOptions = { network: 'testnet' }
    ): Promise<DiscoveryResult> {
        const seedOptions: SeedDiscoveryOptions = {
            network: options.network,
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
        let stepCounter = 1
        try {
            console.log(`[SeedDiscovery] Starting sequential discovery on ${options.network}`)
            if (!this.isSeedPhrase(seedPhrase)) {
                return this.createErrorResult('Invalid seed phrase length')
            }
            const foundIdentities: DiscoveredIdentity[] = []
            // Initialize progress tracking
            this.currentProgress = {
                currentIdentityIndex: 0,
                currentKeyIndex: 0,
                totalIdentities: options.maxIdentityIndex,
                totalKeysPerIdentity: Math.min(5, options.maxKeyIndex), // Max 5 key purposes
                currentPublicKeyHash: '',
                currentPath: '',
                status: 'deriving',
                scannedCount: 0,
                foundCount: 0
            }
            // Update: Deriving keys
            this.updateProgress({ status: 'deriving' })
            console.log(`[SeedDiscovery] Deriving keys and scanning network...`)
            // 1. Derive keys with corrected paths
            const allDerivations: KeyDerivationResult[] = await KeyDerivationService.deriveAllKeysFromSeed(
                seedPhrase,
                options.network,
                options.maxIdentityIndex,
                options.maxKeyIndex
            )
            // Update total counts based on actual derived results
            const totalKeysToScan = allDerivations.reduce((total, derivation) => {
                return total + derivation.keys.length
            }, 0)
            this.updateProgress({
                totalIdentities: allDerivations.length,
                scannedCount: 0
            })
            console.log(`[SeedDiscovery] Derived ${allDerivations.length} identities with ${totalKeysToScan} total keys`)
            // 2. Iterate Identity Indices
            for (let dIndex = 0; dIndex < allDerivations.length; dIndex++) {
                const derivation = allDerivations[dIndex]
                // Guard clause: Ensure derivation exists
                if (!derivation) {
                    console.warn(`[SeedDiscovery] Skipping undefined derivation at index ${dIndex}`)
                    continue
                }
                const identityIdx = derivation.identityIndex
                let foundForThisIndex = false
                this.updateProgress({
                    currentIdentityIndex: identityIdx,
                    status: 'scanning'
                })
                console.log(`[SeedDiscovery] Scanning Identity ${identityIdx}...`)
                // 3. Iterate Keys
                for (let kIndex = 0; kIndex < derivation.keys.length; kIndex++) {
                    const key = derivation.keys[kIndex]
                    // Guard clause: Ensure key exists
                    if (!key) {
                        console.warn(`[SeedDiscovery] Skipping undefined key at identity ${identityIdx}, index ${kIndex}`)
                        continue
                    }
                    // Stop checking KEYS for this identity if we already found identity
                    if (foundForThisIndex) break
                    const hash = key.publicKeyHash
                    // Update progress with current key
                    this.updateProgress({
                        currentKeyIndex: key.keyIndex,
                        currentPublicKeyHash: hash,
                        currentPath: key.path
                    })
                    console.log(`[SeedDiscovery] Scanning Identity ${identityIdx}, Key ${key.keyIndex} (${hash.substring(0, 16)}...)`)
                    // --- EXPLICIT LOOKUP 1: UNIQUE ---
                    const uniqueResult = await DAPIService.queryIdentityByHash(hash, options.network, true)
                    traceLog.push({
                        step: stepCounter++,
                        identityIndex: identityIdx,
                        keyIndex: key.keyIndex,
                        path: key.path,
                        publicKeyHash: hash,
                        method: 'unique',
                        found: uniqueResult.success,
                    })
                    // Update scanned count
                    if (this.currentProgress) {
                        this.currentProgress.scannedCount += 1
                        this.updateProgress({ scannedCount: this.currentProgress.scannedCount })
                    }
                    if (uniqueResult.success && uniqueResult.data) {
                        // FIX: Pass identityIdx here
                        await this.addIdentity(foundIdentities, uniqueResult.data, options.network, identityIdx, seedPhrase) // MODIFIED
                        foundForThisIndex = true
                        // Update found count
                        if (this.currentProgress) {
                            this.currentProgress.foundCount += 1
                            this.updateProgress({ foundCount: this.currentProgress.foundCount })
                        }
                        console.log(`[SeedDiscovery] ✓ Found identity with ID: ${uniqueResult.data.identityId || uniqueResult.data.id}`)
                        break // Found via Unique, stop checking this identity
                    }
                    // --- EXPLICIT LOOKUP 2: NON-UNIQUE (Fallback) ---
                    // Only runs if unique failed
                    const nonUniqueResult = await DAPIService.queryIdentityByHash(hash, options.network, false)
                    traceLog.push({
                        step: stepCounter++,
                        identityIndex: identityIdx,
                        keyIndex: key.keyIndex,
                        path: key.path,
                        publicKeyHash: hash,
                        method: 'non-unique',
                        found: nonUniqueResult.success,
                    })
                    // Update scanned count for non-unique check
                    if (this.currentProgress) {
                        this.currentProgress.scannedCount += 1
                        this.updateProgress({ scannedCount: this.currentProgress.scannedCount })
                    }
                    if (nonUniqueResult.success && nonUniqueResult.data) {
                        // FIX: Pass identityIdx here
                        await this.addIdentity(foundIdentities, nonUniqueResult.data, options.network, identityIdx, seedPhrase) // MODIFIED
                        foundForThisIndex = true
                        // Update found count
                        if (this.currentProgress) {
                            this.currentProgress.foundCount += 1
                            this.updateProgress({ foundCount: this.currentProgress.foundCount })
                        }
                        console.log(`[SeedDiscovery] ✓ Found identity with ID: ${nonUniqueResult.data.identityId || nonUniqueResult.data.id}`)
                        break // Found via Non-Unique, stop checking this identity
                    }
                }
                // Reset key index for next identity
                this.updateProgress({
                    currentKeyIndex: 0,
                    currentPublicKeyHash: '',
                    currentPath: ''
                })
            }
            // Update progress to completed
            this.updateProgress({ status: 'completed' })
            if (foundIdentities.length > 0) {
                // Deduplicate
                const uniqueIds = Array.from(new Set(foundIdentities.map(i => i.identityId)))
                    .map(id => foundIdentities.find(i => i.identityId === id)!)
                console.log(`[SeedDiscovery] Scan complete. Found ${uniqueIds.length} unique identities`)
                return this.createSuccessResult(
                    null,
                    uniqueIds,
                    undefined,
                    undefined,
                    {
                        step: 'scan_complete',
                        count: uniqueIds.length,
                        network: options.network,
                        trace: traceLog,
                        progressSnapshot: this.currentProgress || undefined
                    }
                )
            }
            console.log(`[SeedDiscovery] No identities found`)
            return this.createErrorResult(
                'No identities found for this seed phrase on current network.',
                {
                    step: 'no_identities',
                    network: options.network,
                    trace: traceLog,
                    progressSnapshot: this.currentProgress || undefined
                }
            )
        } catch (error: any) {
            console.error('[SeedDiscovery] Critical failure:', error)
            // Update progress to failed
            if (this.currentProgress) {
                this.updateProgress({ status: 'failed' })
            }
            return {
                success: false,
                error: error.message || 'Unknown discovery error',
                debug: {
                    step: 'exception',
                    network: options.network,
                    error: error.message,
                    trace: traceLog,
                    progressSnapshot: this.currentProgress || undefined
                }
            }
        } finally {
            // Clear progress tracking
            this.currentProgress = null
        }
    }
    // MODIFIED: Added seedPhrase parameter
    private async addIdentity(
        list: DiscoveredIdentity[],
        data: any,
        network: 'mainnet'|'testnet',
        identityIdx: number,
        seedPhrase?: string // ADDED optional parameter
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
        // NEW: Save derived keys for this identity if seedPhrase is provided
        if (seedPhrase && id && data.publicKeys && data.publicKeys.length > 0) {
            try {
                await this.saveDerivedKeysToStorage(seedPhrase, network, identityIdx, id, data.publicKeys)
            } catch (saveErr) {
                console.error(`[SeedDiscovery] Failed to save derived keys for identity ${id}:`, saveErr)
                // Continue anyway - don't fail the whole discovery if key save fails
            }
        }
    }
    private async getDPNSUsernameFromData(data: any, network: 'mainnet' | 'testnet'): Promise<string | null> {
        if (data.dpnsUsername || data.username) return data.dpnsUsername || data.username
        const id = data.identityId || data.id
        if (id) return await DAPIService.getDPNSUsername(id, network)
        return null
    }
}
