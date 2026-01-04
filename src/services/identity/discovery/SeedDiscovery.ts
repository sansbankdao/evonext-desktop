// src/services/identity/discovery/SeedDiscovery.ts
import { KeyDerivationService } from '../keyDerivation.service'
import { DAPIService } from './DAPIService'
import { BaseDiscovery } from './BaseDiscovery'
import { invoke } from '@tauri-apps/api/core'
import type { DiscoveredIdentity } from '@/types'
import type {
    DiscoveryResult,
    DiscoveryOptions,
    QueryTrace,
    ScanProgress,
} from '../types'
// Helper for hex conversion
const toHexString = (bytes: Uint8Array | number[]): string => {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
export interface SeedDiscoveryOptions {
    network: 'mainnet' | 'testnet'
    maxIdentityIndex: number
    maxKeyIndex: number
}
export type ProgressCallback = (progress: ScanProgress) => void
const GAP_LIMIT = 5;
const MAX_IDENTITY_SCAN = 20;
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
                return false
            }
            const now = new Date().toISOString()
            const privateKeyEntries: any[] = []
            for (let i = 0; i < publicKeys.length; i++) {
                const publicKey = publicKeys[i]
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
                    identityId: identityId,
                    privateKeys: privateKeyEntries
                })
                return true
            }
            return false
        } catch (err) {
            console.error(`[SeedDiscovery] Failed to save keys:`, err)
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
            let gapCount = 0;
            let currentIdentityIdx = 0;
            this.currentProgress = {
                currentIdentityIndex: 0,
                currentKeyIndex: 0,
                totalIdentities: 0,
                totalKeysPerIdentity: Math.min(5, options.maxKeyIndex),
                currentPublicKeyHash: '',
                currentPath: '',
                status: 'scanning',
                scannedCount: 0,
                foundCount: 0
            }
            // --- GAP LIMIT LOOP ---
            while (gapCount < GAP_LIMIT && currentIdentityIdx < MAX_IDENTITY_SCAN) {
                this.updateProgress({
                    currentIdentityIndex: currentIdentityIdx,
                    totalIdentities: currentIdentityIdx + GAP_LIMIT
                });
                let foundForThisIdentity = false;
                const keysToCheck = 5;
                for (let kIndex = 0; kIndex < keysToCheck; kIndex++) {
                    if (foundForThisIdentity) break;
                    try {
                        // Derive single key
                        const derivation = await KeyDerivationService.getPrivateKeyWASM(
                            seedPhrase,
                            options.network,
                            currentIdentityIdx,
                            kIndex
                        );
                        // FIX: Use correct WASM methods
                        // 1. Get PublicKeyWASM object
                        const pubKeyWasm = derivation.privateKey.getPublicKey();
                        // 2. Get hash160 (returns Uint8Array)
                        const hashBytes = pubKeyWasm.hash160();
                        // 3. Convert to Hex
                        const pkh = toHexString(hashBytes);
                        const keyInfo = {
                            keyIndex: kIndex,
                            publicKeyHash: pkh,
                            path: `m/44'/${options.network === 'mainnet' ? '5' : '1'}'/${currentIdentityIdx}'/0/${kIndex}`
                        };
                        this.updateProgress({
                            currentKeyIndex: kIndex,
                            currentPublicKeyHash: keyInfo.publicKeyHash,
                            currentPath: keyInfo.path
                        });
                        // 1. Unique Lookup
                        if (keyInfo.publicKeyHash) {
                            const uniqueResult = await DAPIService.queryIdentityByHash(keyInfo.publicKeyHash, options.network, true);
                            if (this.currentProgress) {
                                this.currentProgress.scannedCount++;
                                this.updateProgress({ scannedCount: this.currentProgress.scannedCount });
                            }
                            if (uniqueResult.success && uniqueResult.data) {
                                await this.addIdentity(foundIdentities, uniqueResult.data, options.network, currentIdentityIdx, seedPhrase);
                                foundForThisIdentity = true;
                                break;
                            }
                            // 2. Fallback: Non-Unique
                            const nonUniqueResult = await DAPIService.queryIdentityByHash(keyInfo.publicKeyHash, options.network, false);
                            if (this.currentProgress) {
                                this.currentProgress.scannedCount++;
                                this.updateProgress({ scannedCount: this.currentProgress.scannedCount });
                            }
                            if (nonUniqueResult.success && nonUniqueResult.data) {
                                await this.addIdentity(foundIdentities, nonUniqueResult.data, options.network, currentIdentityIdx, seedPhrase);
                                foundForThisIdentity = true;
                                break;
                            }
                        }
                    } catch (e) {
                         // Derivation error, skip key
                    }
                }
                if (foundForThisIdentity) {
                    gapCount = 0;
                    if (this.currentProgress) {
                        this.currentProgress.foundCount++;
                        this.updateProgress({ foundCount: this.currentProgress.foundCount });
                    }
                } else {
                    gapCount++;
                }
                currentIdentityIdx++;
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
        // Prevent adding duplicates
        if (list.some(i => i.identityId === (data.identityId || data.id))) return;
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
