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
    private controller: AbortController
    private store: IIdentityActions
    private progressCallback: ProgressCallback | null = null
    constructor(store: IIdentityActions) {
        super()
        this.store = store
        this.controller = new AbortController()
    }
    async discover(input: string, options?: DiscoveryOptions): Promise<DiscoveryResult> {
        const network = options?.network || 'testnet'
        // Abort any existing session and create a new one
        this.controller.abort()
        this.controller = new AbortController()
        try {
            const identities = await this.discoverFromSeed(input, network, options)
            return {
                success: true,
                identities: identities,
                debug: { step: 'completed', network, count: identities.length }
            }
        } catch (err: any) {
            if (err.name === 'AbortError') {
                return { success: false, identities: [], error: 'Discovery Aborted' }
            }
            return {
                success: false,
                error: err.message || 'Seed discovery failed',
                identities: [],
                debug: { step: 'error', error: err.message }
            }
        }
    }
    cancel(): void {
        this.controller.abort()
    }
    setProgressCallback(callback: ProgressCallback): void {
        this.progressCallback = callback
    }
    protected updateProgress(details: any) {
        if (this.progressCallback) {
            this.progressCallback(details)
        }
        window.dispatchEvent(new CustomEvent('discovery:progress', { detail: details }))
    }
    async discoverFromSeed(
        seedPhrase: string,
        network: 'mainnet' | 'testnet',
        options?: any
    ): Promise<DiscoveredIdentity[]> {
        const results: DiscoveredIdentity[] = []
        let currentIndex = 0
        const searchLimit = options?.maxIdentityIndex ?? 5
        const signal = this.controller.signal
        while (currentIndex < searchLimit) {
            if (signal.aborted) break
            this.updateProgress({
                currentIdentityIndex: currentIndex,
                totalIdentities: searchLimit,
                message: `Checking Identity Index ${currentIndex}...`
            })
            try {
                // 1. Derive the Master Key (Local Index 0) to use as search anchor
                const { privateKey } = await KeyDerivationService.getPrivateKeyWASM(
                    seedPhrase, network, currentIndex, 0
                )
                const pubKeyBytes = privateKey.getPublicKey().bytes()
                const pubKeyHash = binToHex(await hash160(pubKeyBytes))
                // 2. Query DAPI
                let result = await DAPIService.queryIdentityByHash(pubKeyHash, network, true)
                if (!result.success || !result.data) {
                    result = await DAPIService.queryIdentityByHash(pubKeyHash, network, false)
                }
                if (result.success && result.data) {
                    const identityId = result.data.identityId
                    // 3. Resolve metadata (DPNS)
                    let dpns = ''
                    try {
                        dpns = await DAPIService.getDPNSUsername(identityId, network) || ''
                    } catch (e) { /* non-critical */ }
                    // 4. Handle Keys: Match DAPI manifest against local derivation
                    const dapiKeys = result.data.publicKeys || []
                    const entriesToSave = await this.matchAndDeriveKeys(
                        seedPhrase,
                        network,
                        currentIndex,
                        identityId,
                        dapiKeys
                    )
                    if (entriesToSave.length > 0) {
                        await this.store.saveKeys(network, identityId, entriesToSave)
                    }
                    results.push({
                        identityId,
                        identityIdx: currentIndex,
                        publicKeys: dapiKeys,
                        balance: result.data.balance,
                        username: dpns || identityId,
                        dpnsUsername: dpns,
                        displayName: dpns || `Identity ${currentIndex}`,
                        revision: result.data.revision
                    })
                }
            } catch (e: any) {
                if (e.name === 'AbortError') throw e
                console.warn(`[SeedDiscovery] Skip index ${currentIndex}: ${e.message}`)
            }
            currentIndex++
        }
        return results
    }
    private async matchAndDeriveKeys(
        phrase: string,
        net: any,
        idx: number,
        identityId: string,
        dapiKeys: any[]
    ) {
        const matchedEntries = []
        const now = new Date().toISOString()
        for (let i = 0; i < dapiKeys.length; i++) {
            const dk = dapiKeys[i]
            const dapiData = (dk.data || dk.dataB64 || '').toLowerCase()
            const keyId = i
            try {
                const res = await KeyDerivationService.getPrivateKeyWASM(phrase, net, idx, keyId)
                const pubBytes = res.privateKey.getPublicKey().bytes()
                const localHex = binToHex(pubBytes).toLowerCase()
                const localHash = binToHex(await hash160(pubBytes)).toLowerCase()
                if (dapiData === localHex || dapiData === localHash) {
                    matchedEntries.push({
                        identityId,
                        keyId,
                        purpose: dk.purpose,
                        securityLevel: dk.securityLevel,
                        keyType: dk.keyType,
                        privateKey: res.privateKey.WIF(),
                        publicKey: localHex,
                        derivedFromMnemonic: true,
                        createdAt: now,
                        lastUsed: now
                    })
                }
            } catch (e) {
                console.error(`[SeedDiscovery] Derivation failed for key index ${keyId}`)
            }
        }
        return matchedEntries
    }
}
