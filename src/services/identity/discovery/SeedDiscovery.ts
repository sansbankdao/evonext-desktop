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
    path: string
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
            maxIdentityIndex: 3, // EXPLICITLY 3 (0, 1, 2)
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

            // 1. Derive keys with corrected paths
            const allDerivations = await KeyDerivationService.deriveAllKeysFromSeed(
                seedPhrase,
                options.network,
                options.maxIdentityIndex,
                options.maxKeyIndex
            )

            // 2. Iterate Identity Indices (0, 1, 2)
            for (const derivation of allDerivations) {
                const identityIdx = derivation.identityIndex
                let foundForThisIndex = false

                // 3. Iterate Keys (0..4)
                for (const key of derivation.keys) {
                    // Stop checking KEYS for this identity if we already found the identity
                    if (foundForThisIndex) break

                    const hash = key.publicKeyHash

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

                    if (uniqueResult.success && uniqueResult.data) {
                        await this.addIdentity(foundIdentities, uniqueResult.data, options.network)
                        foundForThisIndex = true
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

                    if (nonUniqueResult.success && nonUniqueResult.data) {
                        await this.addIdentity(foundIdentities, nonUniqueResult.data, options.network)
                        foundForThisIndex = true
                        break // Found via Non-Unique, stop checking this identity
                    }
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
                        trace: traceLog
                    }
                )
            }

            return this.createErrorResult(
                'No identities found for this seed phrase on the current network.',
                {
                    step: 'no_identities',
                    network: options.network,
                    trace: traceLog
                }
            )

        } catch (error: any) {
            console.error('[SeedDiscovery] Critical failure:', error)
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

    private async addIdentity(list: DiscoveredIdentity[], data: any, network: 'mainnet'|'testnet') {
        const id = data.identityId || data.id
        const dpnsUsername = await this.getDPNSUsernameFromData(data, network)

        list.push({
            identityId: id,
            balance: this.formatBalance(data.balance),
            revision: this.formatRevision(data.revision),
            publicKeys: data.publicKeys || [],
            dpnsUsername
        })
    }

    private async getDPNSUsernameFromData(data: any, network: 'mainnet' | 'testnet'): Promise<string | null> {
        if (data.dpnsUsername || data.username) return data.dpnsUsername || data.username
        const id = data.identityId || data.id
        if (id) return await DAPIService.getDPNSUsername(id, network)
        return null
    }
}
