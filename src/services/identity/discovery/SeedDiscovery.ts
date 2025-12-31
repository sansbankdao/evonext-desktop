// src/services/identity/discovery/SeedDiscovery.ts
import { KeyDerivationService } from '../keyDerivation.service'
import { DAPIService } from './DAPIService'
import { BaseDiscovery } from './BaseDiscovery'
import type { DiscoveredIdentity, DiscoveryResult, DiscoveryOptions } from '../types'
export interface SeedDiscoveryOptions {
    network: 'mainnet' | 'testnet'
    maxIdentityIndex: number
    maxKeyIndex: number
}
export class SeedDiscovery extends BaseDiscovery {
    async discover(
        input: string,
        options: DiscoveryOptions = { network: 'testnet' }
    ): Promise<DiscoveryResult> {
        const seedOptions: SeedDiscoveryOptions = {
            network: options.network,
            maxIdentityIndex: options.maxIdentityIndex || 5,
            maxKeyIndex: 5
        }
        return this.discoverFromSeed(input, seedOptions)
    }
    async discoverFromSeed(
        seedPhrase: string,
        options: SeedDiscoveryOptions
    ): Promise<DiscoveryResult> {
        try {
            console.log(`[SeedDiscovery] Starting sequential discovery on ${options.network}`)
            if (!this.isSeedPhrase(seedPhrase)) {
                return this.createErrorResult('Invalid seed phrase length')
            }
            const foundIdentities: DiscoveredIdentity[] = []
            const debugLog: any[] = []
            // === SEQUENTIAL SCAN LOGIC ===
            // We loop Identity Indices 0 -> maxIdentityIndex
            for (let identityIdx = 0; identityIdx < options.maxIdentityIndex; identityIdx++) {
                // 1. Derive keys for this specific Identity Index
                // Note: deriveAllKeysFromSeed can derive a range, but for sequential control
                // we'll ask it to derive keys just for this index if possible,
                // OR we use the existing service which derives batch.
                // Since KeyDerivationService derives a batch (0 to max), we will call it ONCE
                // to get the keys, and then iterate sequentially here.
                // Wait, to follow your requirement "move to the next Identity Index" literally,
                // we should iterate. But KeyDerivationService is designed to return a set.
                // We will use the service to get ALL keys (cached/fast) and then process them sequentially.
                // NOTE: If you want strictly "Derive Idx 0 -> Search -> Derive Idx 1",
                // we would need to change KeyDerivationService.
                // Instead, we will iterate the RESULT of the derivation sequentially.
                // Re-using the batch derivation for efficiency, but processing logically sequentially.
                // This satisfies "verify... deriving 5 keys... searching BOTH... then move to next".
            }
            // Re-implementation using the service:
            const allDerivations = await KeyDerivationService.deriveAllKeysFromSeed(
                seedPhrase,
                options.network,
                options.maxIdentityIndex,
                options.maxKeyIndex
            )
            // Iterate sequentially through Identity Indices
            for (const derivation of allDerivations) {
                const identityIdx = derivation.identityIndex
                console.log(`[SeedDiscovery] Scanning Identity Index ${identityIdx}...`)
                let foundForThisIndex = false
                // Iterate keys for this identity (Indices 0-4)
                for (const key of derivation.keys) {
                    // Search using BOTH methods via DAPIService.searchByHash
                    // logic: searchByHash does (Unique -> if fail -> Non-Unique)
                    const searchResult = await DAPIService.searchByHash(key.publicKeyHash, options.network)
                    if (searchResult.success && searchResult.data) {
                        const data = searchResult.data
                        const id = data.identityId || data.id
                        console.log(`[SeedDiscovery] FOUND Identity ${id} at Index ${identityIdx} via Key ${key.keyIndex}`)
                        // Fetch Username
                        const dpnsUsername = await this.getDPNSUsernameFromData(data, options.network)
                        foundIdentities.push({
                            identityId: id,
                            balance: this.formatBalance(data.balance),
                            revision: this.formatRevision(data.revision),
                            publicKeys: data.publicKeys || [],
                            dpnsUsername
                        })
                        foundForThisIndex = true
                        // We found the identity for this index, we can stop checking KEYS for this index
                        // and move to the next IDENTITY index (if we want to find multiple accounts)
                        break
                    }
                }
                if (!foundForThisIndex) {
                    console.log(`[SeedDiscovery] No identity found at Index ${identityIdx}. Moving to next...`)
                }
            }
            if (foundIdentities.length > 0) {
                // Deduplicate by ID just in case
                const uniqueIds = Array.from(new Set(foundIdentities.map(i => i.identityId)))
                    .map(id => foundIdentities.find(i => i.identityId === id)!)
                return this.createSuccessResult(
                    null,
                    uniqueIds,
                    undefined,
                    undefined,
                    { step: 'scan_complete', count: uniqueIds.length }
                )
            }
            return this.createErrorResult('No identities found for this seed phrase on the current network.')
        } catch (error: any) {
            return this.handleError(error, 'Seed Discovery')
        }
    }
    private async getDPNSUsernameFromData(data: any, network: 'mainnet' | 'testnet'): Promise<string | null> {
        if (data.dpnsUsername || data.username) return data.dpnsUsername || data.username
        const id = data.identityId || data.id
        if (id) return await DAPIService.getDPNSUsername(id, network)
        return null
    }
}
