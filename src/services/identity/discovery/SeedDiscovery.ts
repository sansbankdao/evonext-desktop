// src/services/identity/discovery/SeedDiscovery.ts

import { BaseDiscovery } from './BaseDiscovery'
import { DAPIService } from './DAPIService'
import { KeyDerivationService } from '../keyDerivation.service'
import type {
    DiscoveredIdentity,
    IIdentityActions,
    DiscoveryOptions,
    DiscoveryResult,
    DerivedKeyInfo
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
    private async _matchAndDeriveKeys(
        phrase: string,
        net: 'mainnet' | 'testnet',
        idx: number,
        identityId: string,
        dapiKeys: any[]
    ): Promise<DerivedKeyInfo[]> {
        const matchedEntries: DerivedKeyInfo[] = []
        const now = new Date().toISOString()
        const checkLimit = dapiKeys.length > 0 ? dapiKeys.length : 1
        for (let k = 0; k < checkLimit; k++) {
            try {
                const res = await KeyDerivationService.getPrivateKeyWASM(phrase, net, idx, k)
                let localHash = ''
                const bytes = res.publicKeyBytes || res.privateKey?.getPublicKey?.()?.bytes?.()
                if (bytes) {
                    localHash = binToHex(await hash160(bytes))
                }
                const matchedKey = dapiKeys.find((dk: any) => dk.data === localHash)
                if (matchedKey || dapiKeys.length === 0) {
                    matchedEntries.push({
                        keyId: k,
                        purpose: Number(matchedKey?.purpose ?? 0),
                        securityLevel: Number(matchedKey?.securityLevel ?? 3),
                        keyType: String(matchedKey?.keyType || 'ECDSA_SECP256K1'),
                        privateKeyWIF: res.privateKey?.WIF?.() || '',
                        publicKeyHex: localHash,
                        derivationPath: `m/${idx}'/${k}'`,
                        createdAt: now,
                        lastUsed: now
                    })
                }
            } catch (e) {
                console.warn(`Key derivation error at idx ${idx} key ${k}:`, e)
            }
        }
        return matchedEntries
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
            })
            try {
                const res = await KeyDerivationService.getPrivateKeyWASM(
                    seedPhrase, network, currentIndex, 0
                )
                const bytes = res.publicKeyBytes || res.privateKey?.getPublicKey?.()?.bytes?.()
                if (!bytes || bytes.length === 0) {
                    throw new Error('Key derivation failed to return public key bytes')
                }
                const pubKeyHash = binToHex(await hash160(bytes))
                let result = await DAPIService.queryIdentityByHash(pubKeyHash, network, true)
                if (!result.success || !result.data) {
                    result = await DAPIService.queryIdentityByHash(pubKeyHash, network, false)
                }
                if (result.success && result.data) {
                    const identityId = result.data.identityId
                    const derivedKeys = await this._matchAndDeriveKeys(
                        seedPhrase,
                        network,
                        currentIndex,
                        identityId,
                        result.data.publicKeys || []
                    )
                    const identityObj: DiscoveredIdentity = {
                        identityId,
                        identityIdx: currentIndex,
                        balance: result.data.balance || '0',
                        revision: result.data.revision || 0,
                        username: result.data.dpnsUsername || result.data.username,
                        displayName: result.data.displayName || result.data.username,
                        publicKeys: result.data.publicKeys || [],
                        derivedKeys: derivedKeys as any
                    }
                    results.push(identityObj)
                    if (derivedKeys.length > 0) {
                        await this.store.saveKeys(network, identityId, derivedKeys as any)
                    }
                }
            } catch (e: any) {
                if (e.name === 'AbortError') break
                console.error(`Discovery error at index ${currentIndex}:`, e)
            }
            currentIndex++
        }
        return results
    }
}
