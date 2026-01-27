// src/services/identity/discovery/SeedDiscovery.ts

import { BaseDiscovery } from './BaseDiscovery'
import { DAPIService } from './DAPIService'
import { KeyDerivationService } from '../keyDerivation.service'
import type {
    DiscoveredIdentity,
    IIdentityActions,
    DiscoveryOptions,
    DiscoveryResult,
} from '@/types'
// @ts-ignore
import { hash160 } from '@evonext/crypto'
// @ts-ignore
import { binToHex } from '@evonext/utils'

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
        try {
            const identities = await this.discoverFromSeed(input, network, options)
            return {
                success: true,
                identities: identities,
                debug: { step: 'completed', network }
            }
        } catch (err: any) {
            return {
                success: false,
                error: err.message || 'Seed discovery failed',
                identities: [],
                debug: { step: 'error', error: err.message }
            }
        }
    }

    cancel(): void {
        this.isCancelled = true
    }

    setProgressCallback(callback: ProgressCallback): void {
        this.progressCallback = callback
    }

    protected updateProgress(details: any) {
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

        while (currentIndex < searchLimit) {
            if (this.isCancelled) break

            this.updateProgress({
                currentIdentityIndex: currentIndex,
                totalIdentities: searchLimit,
                message: `Scanning Identity Index ${currentIndex}...`
            })

            try {
                const { privateKey } = await KeyDerivationService.getPrivateKeyWASM(
                    seedPhrase, network, currentIndex, 0
                )
                const pubKeyHash = binToHex(hash160(privateKey.getPublicKey().bytes()))

                const result = await DAPIService.queryIdentityByHash(pubKeyHash, network, true)

                if (result.success && result.data) {
                    const id = result.data.identityId
                    const dpns = await DAPIService.getDPNSUsername(id, network)

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

                    await this.saveDerivedKeys(seedPhrase, network, currentIndex, id, discovered.publicKeys)
                }
            } catch (e) {
                // Identity not found at this index
            }
            currentIndex++
        }

        this.updateProgress({
            currentIdentityIndex: searchLimit,
            totalIdentities: searchLimit,
            message: `Found ${results.length} identities.`
        })

        return results
    }

    private async saveDerivedKeys(phrase: string, net: any, idx: number, id: string, keys: any[]) {
        const entries = []
        const now = new Date().toISOString()

        for (let i = 0; i < keys.length; i++) {
            try {
                const kId = (keys[i].id !== undefined && keys[i].id !== null) ? Number(keys[i].id) : i
                if (kId > 10) continue

                const res = await KeyDerivationService.getPrivateKeyWASM(phrase, net, idx, kId)

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
            } catch (e) {
                continue
            }
        }

        if (entries.length > 0) {
            await this.store.saveKeys(net, id, entries)
        }
    }
}
