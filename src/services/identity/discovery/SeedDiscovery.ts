// src/services/identity/discovery/SeedDiscovery.ts

import { BaseDiscovery } from './BaseDiscovery'
import { DAPIService } from './DAPIService'
import { KeyDerivationService } from '../keyDerivation.service'
import { invoke } from '@tauri-apps/api/core'
import type { DiscoveredIdentity } from '@/types'
// @ts-ignore
import { hash160 } from '@evonext/crypto'
// @ts-ignore
import { binToHex } from '@evonext/utils'

// FIXED: Re-added exported types needed by IdentityManager
export type ProgressCallback = (details: any) => void

export interface SeedDiscoveryOptions {
    network?: 'mainnet' | 'testnet'
    minIndexSearch?: number
    gapLimit?: number
}

export class SeedDiscovery extends BaseDiscovery {
    private isCancelled = false
    private GAP_LIMIT = 5
    // FIXED: Re-added callback support
    private progressCallback: ProgressCallback | null = null

    cancel(): void {
        this.isCancelled = true
    }

    // FIXED: Added method expected by IdentityManager
    setProgressCallback(callback: ProgressCallback): void {
        this.progressCallback = callback
    }

    async discover(input: string, options?: any): Promise<any> {
        const network = options?.network || 'mainnet'
        return this.discoverFromSeed(input, network, options)
    }

    protected updateProgress(details: any) {
        // Hybrid approach: Call legacy callback AND dispatch event
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
        const minSearch = options?.minIndexSearch || 5

        // Use gap limit from options if provided
        const activeGapLimit = options?.gapLimit || this.GAP_LIMIT

        while ((gapCount < activeGapLimit) || (currentIndex < minSearch)) {
            if (this.isCancelled) break

            try {
                this.updateProgress({
                    currentIdentityIndex: currentIndex,
                    totalIdentities: currentIndex + activeGapLimit,
                    currentKeyIndex: 0,
                    totalKeysPerIdentity: 1,
                    scannedCount: currentIndex,
                    foundCount: results.length,
                    message: `Scanning Identity #${currentIndex} (Gap: ${gapCount}/${activeGapLimit})`
                })

                const { privateKey } = await KeyDerivationService.getPrivateKeyWASM(
                    seedPhrase,
                    network,
                    currentIndex,
                    0
                )

                const pubKey = privateKey.getPublicKey()
                const pubKeyBytes = pubKey.bytes()
                const pubKeyHash = binToHex(hash160(pubKeyBytes))

                const result = await DAPIService.queryIdentityByHash(pubKeyHash, network, true)

                if (result.success && result.data) {
                    const identityId = result.data.id
                    const dpnsName = await DAPIService.getDPNSUsername(identityId, network)

                    const discovered: DiscoveredIdentity = {
                        identityId: identityId,
                        identityIdx: currentIndex,
                        publicKeys: result.data.publicKeys || [],
                        balance: result.data.balance,
                        username: identityId,
                        dpnsUsername: dpnsName,
                        displayName: dpnsName || `Identity ${currentIndex}`,
                        revision: result.data.revision
                    }

                    results.push(discovered)
                    gapCount = 0

                    await this.saveDerivedKeysToStorage(
                        seedPhrase,
                        network,
                        currentIndex,
                        identityId,
                        result.data.publicKeys || []
                    )
                } else {
                    gapCount++
                }
            } catch (error) {
                console.error(`Error scanning index ${currentIndex}:`, error)
                gapCount++
            }
            currentIndex++
        }

        this.updateProgress({
            currentIdentityIndex: currentIndex,
            totalIdentities: currentIndex,
            scannedCount: currentIndex,
            foundCount: results.length,
            message: `Scan complete. Found ${results.length} identities.`
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
                if (keyIndex > 100) continue

                try {
                    const derivationResult = await KeyDerivationService.getPrivateKeyWASM(
                        seedPhrase,
                        network,
                        identityIdx,
                        keyIndex
                    )
                    const derivedPub = derivationResult.privateKey.getPublicKey()
                    const derivedPubHex = binToHex(derivedPub.bytes())

                    const keyEntry = {
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
                    }
                    privateKeyEntries.push(keyEntry)
                } catch (deriveErr) { continue }
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
}
