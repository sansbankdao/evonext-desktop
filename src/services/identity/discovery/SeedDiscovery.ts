// src/services/identity/discovery/SeedDiscovery.ts

import { BaseDiscovery } from './BaseDiscovery'
import { DAPIService } from './DAPIService'
import { KeyDerivationService } from '../keyDerivation.service'
import type {
    DiscoveredIdentity,
    IIdentityActions,
    DiscoveryOptions,
    DiscoveryResult
} from '@/types'
// @ts-ignore
import { binToHex } from '@evonext/utils'
import { hash160 } from '@/services/crypto'

export type ProgressCallback = (details: any) => void
export class SeedDiscovery extends BaseDiscovery {
    private isCancelled = false
    private store: IIdentityActions
    private progressCallback: ProgressCallback | null = null
    constructor(store: IIdentityActions) {
        super()
        this.store = store
    }
    // Correctly implement the abstract method to match DiscoveryResult interface
    async discover(input: string, options?: DiscoveryOptions): Promise<DiscoveryResult> {
        const network = options?.network || 'testnet'
        console.log(`[SeedDiscovery] Starting discovery with network: ${network}`)
        try {
            const identities = await this.discoverFromSeed(input, network, options)
            console.log(`[SeedDiscovery] Discovery completed, found ${identities.length} identities`)
            return {
                success: true,
                identities: identities,
                debug: { step: 'completed', network, count: identities.length }
            }
        } catch (err: any) {
            console.error(`[SeedDiscovery] Discovery failed:`, err)
            return {
                success: false,
                error: err.message || 'Seed discovery failed',
                identities: [],
                debug: { step: 'error', error: err.message, stack: err.stack }
            }
        }
    }
    cancel(): void {
        console.log(`[SeedDiscovery] Discovery cancelled`)
        this.isCancelled = true
    }
    setProgressCallback(callback: ProgressCallback): void {
        this.progressCallback = callback
    }
    protected updateProgress(details: any) {
        console.log(`[SeedDiscovery] Progress:`, details)
        if (this.progressCallback) {
            this.progressCallback(details)
        }
        const event = new CustomEvent('discovery:progress', { detail: details })
        window.dispatchEvent(event)
    }
    async discoverFromSeed(
        seedPhrase: string,
        network: 'mainnet' | 'testnet',
        options?: any
    ): Promise<DiscoveredIdentity[]> {
        this.isCancelled = false
        const results: DiscoveredIdentity[] = []
        let currentIndex = 0
        const searchLimit = options?.maxIdentityIndex ?? 5
        console.log(`[SeedDiscovery] Starting discovery for seed phrase (first 10 chars): ${seedPhrase.substring(0, 10)}...`)
        console.log(`[SeedDiscovery] Network: ${network}, Search limit: ${searchLimit}`)
        while (currentIndex < searchLimit) {
            if (this.isCancelled) {
                console.log(`[SeedDiscovery] Discovery cancelled at index ${currentIndex}`)
                break
            }
            this.updateProgress({
                currentIdentityIndex: currentIndex,
                totalIdentities: searchLimit,
                message: `Scanning Identity Index ${currentIndex}...`
            })
            try {
                console.log(`[SeedDiscovery] Deriving key for identity index ${currentIndex}, key index 0`)
                // Get private key for identity index, key index 0 (master key)
                const { privateKey } = await KeyDerivationService.getPrivateKeyWASM(
                    seedPhrase, network, currentIndex, 0
                )
                // Get public key bytes and hash
                const pubKeyBytes = privateKey.getPublicKey().bytes()
                const pubKeyHash = binToHex(await hash160(pubKeyBytes))
                console.log(`[SeedDiscovery] Derived pubKeyHash for index ${currentIndex}: ${pubKeyHash}`)
                // Query DAPI for identity by hash
                console.log(`[SeedDiscovery] Querying DAPI for hash ${pubKeyHash}`)
                const result = await DAPIService.queryIdentityByHash(pubKeyHash, network, true)
                console.log(`[SeedDiscovery] DAPI result for index ${currentIndex}:`, result)
                if (result.success && result.data) {
                    const id = result.data.identityId || result.data.id
                    console.log(`[SeedDiscovery] Found identity ${id} at index ${currentIndex}`)
                    const dpns = await DAPIService.getDPNSUsername(id, network)
                    console.log(`[SeedDiscovery] DPNS username for ${id}:`, dpns)
                    const discovered: DiscoveredIdentity = {
                        identityId: id,
                        identityIdx: currentIndex,
                        publicKeys: result.data.publicKeys || [],
                        balance: result.data.balance,
                        username: dpns || id,
                        dpnsUsername: dpns,
                        displayName: dpns || `Identity ${currentIndex}`,
                        revision: result.data.revision
                    }
                    results.push(discovered)
                    console.log(`[SeedDiscovery] Saving derived keys for ${id}`)
                    await this.saveDerivedKeys(seedPhrase, network, currentIndex, id, discovered.publicKeys)
                } else {
                    console.log(`[SeedDiscovery] No identity found at index ${currentIndex}:`, result.error)
                }
            } catch (e: any) {
                // Identity not found at this index
                console.log(`[SeedDiscovery] Error at index ${currentIndex}:`, e.message)
            }
            currentIndex++
        }
        this.updateProgress({
            currentIdentityIndex: searchLimit,
            totalIdentities: searchLimit,
            message: `Found ${results.length} identities.`
        })
        console.log(`[SeedDiscovery] Discovery complete. Found ${results.length} identities`)
        return results
    }
    private async saveDerivedKeys(phrase: string, net: any, idx: number, id: string, keys: any[]) {
        console.log(`[SeedDiscovery] Saving ${keys.length} keys for identity ${id}`)
        const entries = []
        const now = new Date().toISOString()
        for (let i = 0; i < keys.length; i++) {
            try {
                const kId = (keys[i].id !== undefined && keys[i].id !== null) ? Number(keys[i].id) : i
                if (kId > 10) {
                    console.log(`[SeedDiscovery] Skipping key ID ${kId} > 10`)
                    continue
                }
                console.log(`[SeedDiscovery] Deriving private key for key ID ${kId}`)
                const res = await KeyDerivationService.getPrivateKeyWASM(phrase, net, idx, kId)
                // Get the public key from the private key to verify it matches
                const derivedPubKey = binToHex(res.privateKey.getPublicKey().bytes())
                const keyData = keys[i].data
                console.log(`[SeedDiscovery] Derived pubkey: ${derivedPubKey.substring(0, 16)}...`)
                console.log(`[SeedDiscovery] Key data from DAPI: ${keyData}`)
                entries.push({
                    identityId: id,
                    keyId: kId,
                    purpose: Number(keys[i].purpose ?? 0),
                    securityLevel: Number(keys[i].securityLevel ?? 0),
                    keyType: String(keys[i].keyType || keys[i].type || 'ECDSA_HASH160'),
                    privateKey: res.privateKey.WIF(),
                    publicKey: keys[i].data || '',
                    derivedFromMnemonic: true,
                    createdAt: now,
                    lastUsed: now
                })
                console.log(`[SeedDiscovery] Added key entry for ID ${kId}`)
            } catch (e: any) {
                console.error(`[SeedDiscovery] Failed to derive key ${i}:`, e.message)
                continue
            }
        }
        if (entries.length > 0) {
            console.log(`[SeedDiscovery] Saving ${entries.length} key entries to store`)
            await this.store.saveKeys(net, id, entries)
        } else {
            console.log(`[SeedDiscovery] No key entries to save`)
        }
    }
}
