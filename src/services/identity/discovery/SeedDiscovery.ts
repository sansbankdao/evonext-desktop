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
interface QueryTrace {
    step: number
    identityIndex: number
    keyIndex: number
    publicKeyHash: string
    method: 'unique' | 'non-unique'
    found: boolean
    id?: string
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
        // Trace log to return to the UI for debugging
        const traceLog: QueryTrace[] = []
        try {
            console.log(`[SeedDiscovery] Starting sequential discovery on ${options.network}`)
            if (!this.isSeedPhrase(seedPhrase)) {
                return this.createErrorResult('Invalid seed phrase length')
            }
            const foundIdentities: DiscoveredIdentity[] = []
            // 1. Derive all keys upfront using the efficient batch service
            // This returns a structure of [ { identityIndex: 0, keys: [...] }, { identityIndex: 1... } ]
            const allDerivations = await KeyDerivationService.deriveAllKeysFromSeed(
                seedPhrase,
                options.network,
                options.maxIdentityIndex,
                options.maxKeyIndex
            )
            // 2. Iterate Sequentially: Identity Index (0 -> max)
            let stepCounter = 1
            for (const derivation of allDerivations) {
                const identityIdx = derivation.identityIndex
                console.log(`[SeedDiscovery] Scanning Identity Index ${identityIdx}...`)
                let foundForThisIndex = false
                // 3. Iterate Sequentially: Key Index (0 -> max)
                for (const key of derivation.keys) {
                    // Check logic: We stop checking KEYS for this identity if we already found the identity
                    if (foundForThisIndex) break
                    const hash = key.publicKeyHash
                    // Perform the search (Both Unique AND Non-Unique are handled inside searchByHash)
                    const searchResult = await DAPIService.searchByHash(hash, options.network)
                    // Log the attempt
                    traceLog.push({
                        step: stepCounter++,
                        identityIndex: identityIdx,
                        keyIndex: key.keyIndex,
                        publicKeyHash: hash,
                        method: searchResult.searchType === 'none' ? 'unique' : searchResult.searchType, // simplified log
                        found: searchResult.success,
                    })
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
                        // Identity found for this index. Stop checking keys, move to next Identity Index.
                        break
                    }
                }
                if (!foundForThisIndex) {
                    console.log(`[SeedDiscovery] No identity found at Index ${identityIdx}. Moving to next...`)
                }
            }
            if (foundIdentities.length > 0) {
                // Deduplicate
                const uniqueIds = Array.from(new Set(foundIdentities.map(i => i.identityId)))
                    .map(id => foundIdentities.find(i => i.identityId === id)!)
                return this.createSuccessResult(
                    null,
                    uniqueIds,
                    undefined,
                    undefined,
                    {
                        step: 'scan_complete',
                        count: uniqueIds.length,
                        network: options.network,
                        trace: traceLog // Attaching full log
                    }
                )
            }
            // Return "Success" structure but with empty identities list if none found
            // This is better than "Error" because it allows showing the trace log in the UI
            // However, useConnect expects error string for empty results usually,
            // but we want to show the debug.
            // Let's return createErrorResult but ATTACH the trace.
            return this.createErrorResult(
                'No identities found for this seed phrase on the current network.',
                {
                    step: 'no_identities',
                    network: options.network,
                    trace: traceLog // Attaching full log
                }
            )
        } catch (error: any) {
            console.error('[SeedDiscovery] Critical failure:', error)
            // Even on crash, try to return what we logged so far
            return {
                success: false,
                error: error.message || 'Unknown discovery error',
                debug: {
                    step: 'exception',
                    network: options.network,
                    error: error.message,
                    trace: traceLog
                }
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
