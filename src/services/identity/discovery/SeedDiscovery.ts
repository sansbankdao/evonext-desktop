// src/services/identity/discovery/SeedDiscovery.ts

import { BaseDiscovery } from './BaseDiscovery'
import { DAPIService } from './DAPIService'
import { KeyDerivationService } from '../keyDerivation.service'
import type { DiscoveredIdentity } from '@/types'
import type { IIdentityActions } from '@/types'
// @ts-ignore
import { hash160 } from '@evonext/crypto'
// @ts-ignore
import { binToHex } from '@evonext/utils'

export type ProgressCallback = (details: any) => void

export interface SeedDiscoveryOptions {
    network?: 'mainnet' | 'testnet'
    minIndexSearch?: number
    gapLimit?: number
    maxKeyIndex?: number
}

export class SeedDiscovery extends BaseDiscovery {
    private isCancelled = false
    private GAP_LIMIT = 5
    private progressCallback: ProgressCallback | null = null
    private scanLimit = 0
    private store: IIdentityActions

    constructor(store: IIdentityActions) {
        super()
        this.store = store
    }

    cancel(): void {
        this.isCancelled = true
    }

    setProgressCallback(callback: ProgressCallback): void {
        this.progressCallback = callback
    }

    async discover(input: string, options?: any): Promise<any> {
        const network = options?.network || 'mainnet'
        return this.discoverFromSeed(input, network, options)
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
        network: 'mainnet' | 'testnet' = 'mainnet',
        options?: SeedDiscoveryOptions
    ): Promise<DiscoveredIdentity[]> {
        this.isCancelled = false
        const results: DiscoveredIdentity[] = []
        let gapCount = 0
        let currentIndex = 0

        const minSearch = options?.minIndexSearch ?? 5
        const activeGapLimit = options?.gapLimit ?? this.GAP_LIMIT
        const maxKeyIndex = options?.maxKeyIndex ?? 5
        const maxSearchRange = minSearch + activeGapLimit
        this.scanLimit = maxSearchRange

        while ((gapCount < activeGapLimit) || (currentIndex < minSearch)) {
            if (this.isCancelled) break

            let foundForIndex = false

            for (let keyIndex = 0; keyIndex <= maxKeyIndex; keyIndex++) {
                if (this.isCancelled) break

                try {
                    this.updateProgress({
                        currentIdentityIndex: Math.min(currentIndex, this.scanLimit),
                        totalIdentities: this.scanLimit,
                        currentKeyIndex: keyIndex,
                        totalKeysPerIdentity: maxKeyIndex + 1,
                        scannedCount: currentIndex,
                        foundCount: results.length,
                        message: `Scanning Identity #${currentIndex}`
                    })

                    const { privateKey } = await KeyDerivationService.getPrivateKeyWASM(
                        seedPhrase,
                        network,
                        currentIndex,
                        keyIndex
                    )

                    const pubKeyBytes = privateKey.getPublicKey().bytes()
                    const pubKeyHash = binToHex(hash160(pubKeyBytes))
                    const uniqueResult = await DAPIService.queryIdentityByHash(pubKeyHash, network, true)
                    const result = uniqueResult.success
                        ? uniqueResult
                        : await DAPIService.queryIdentityByHash(pubKeyHash, network, false)

                    if (result.success && result.data) {
                        const identityData = result.data
                        const identityId = identityData.identityId || identityData.id
                        const dpnsName = await DAPIService.getDPNSUsername(identityId, network)

                        const discovered: DiscoveredIdentity = {
                            identityId: identityId,
                            identityIdx: currentIndex,
                            publicKeys: identityData.publicKeys || [],
                            balance: identityData.balance,
                            username: identityId,
                            dpnsUsername: dpnsName,
                            displayName: dpnsName || `Identity ${currentIndex}`,
                            revision: identityData.revision
                        }

                        results.push(discovered)

                        gapCount = 0

                        foundForIndex = true

                        await this.saveDerivedKeysToStorage(
                            seedPhrase,
                            network,
                            currentIndex,
                            identityId,
                            identityData.publicKeys || []
                        )
                        break
                    }
                } catch (error) {
                    // ignore key derivation errors
                }
            }
            if (!foundForIndex) {
                gapCount++
            }

            currentIndex++
        }
        this.updateProgress({
            currentIdentityIndex: this.scanLimit,
            totalIdentities: this.scanLimit,
            scannedCount: currentIndex,
            foundCount: results.length,
            message: `Found ${results.length} identities.`
        })

        return results
    }
    private async saveDerivedKeysToStorage(
        seedPhrase: string,
        network: 'mainnet' | 'testnet',
        identityIdx: number,
        identityId: string,
        publicKeys: any[]
    ): Promise<boolean> {
        try {
            if (!identityId || !publicKeys || publicKeys.length === 0) return false

            const now = new Date().toISOString()
            const privateKeyEntries: any[] = []

            for (let i = 0; i < publicKeys.length; i++) {
                const publicKey = publicKeys[i]
                const keyIndex = publicKey.id

                if (keyIndex === undefined || keyIndex === null) continue

                try {
                    const derivationResult = await KeyDerivationService.getPrivateKeyWASM(
                        seedPhrase,
                        network,
                        identityIdx,
                        keyIndex
                    )

                    const derivedPubHex = binToHex(derivationResult.privateKey.getPublicKey().bytes())

                    privateKeyEntries.push({
                        identityId: identityId,
                        keyId: publicKey.id,
                        purpose: publicKey.purpose,
                        securityLevel: publicKey.securityLevel,
                        keyType: publicKey.keyType || 'ecdsa',
                        privateKey: derivationResult.privateKey.WIF(),
                        publicKey: derivedPubHex,
                        derivedFromMnemonic: true,
                        createdAt: now,
                        lastUsed: now
                    })
                } catch {
                    continue
                }
            }
            if (privateKeyEntries.length > 0) {
                await this.store.saveKeys(network, identityId, privateKeyEntries)
                return true
            }
            return false
        } catch (err) {
            console.error(`[SeedDiscovery] Failed to save keys:`, err)
            return false
        }
    }
}
