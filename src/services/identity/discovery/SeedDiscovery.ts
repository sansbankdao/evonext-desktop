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
        this.initFrontendDebug()
    }

    private initFrontendDebug() {
        const debugArea = document.getElementById('__debug_hud')
        if (debugArea) {
            debugArea.remove()
        }

        const hud = document.createElement('div')
        hud.id = '__debug_hud'

        hud.style.position = 'fixed'
        hud.style.bottom = '0'
        hud.style.left = '0'
        hud.style.width = '100%'
        hud.style.height = '200px'
        hud.style.background = 'rgba(0, 0, 0, 0.95)'
        hud.style.color = '#00ff00'
        hud.style.fontFamily = 'monospace'
        hud.style.fontSize = '12px'
        hud.style.padding = '10px'
        hud.style.zIndex = '999999'
        hud.style.overflowY = 'auto'
        hud.style.borderTop = '2px solid red'
        hud.style.pointerEvents = 'auto'
        hud.style.userSelect = 'text'

        document.body.appendChild(hud)

        this.logToDOM('SYSTEM', 'Frontend Debug Console Initialized')
    }

    private logToDOM(level: 'SYSTEM' | 'INFO' | 'ERROR' | 'SUCCESS' | 'WARN', message: string) {
        const hud = document.getElementById('__debug_hud')
        if (!hud) return

        const line = document.createElement('div')
        line.style.marginBottom = '4px'
        line.style.borderBottom = '1px solid #333'

        const time = new Date().toLocaleTimeString()
        const prefix = '[' + time + '] [' + level + ']'

        let color = '#fff'
        if (level === 'ERROR') color = '#ff5555'
        if (level === 'SUCCESS') color = '#55ff55'
        if (level === 'WARN') color = '#ffff55'
        if (level === 'SYSTEM') color = '#00ffff'

        line.innerHTML = '<span style="color:' + color + '">' + prefix + ' ' + message + '</span>'
        hud.appendChild(line)
        hud.scrollTop = hud.scrollHeight
    }

    async discover(input: string, options?: DiscoveryOptions): Promise<DiscoveryResult> {
        const network = options?.network || 'testnet'
        this.logToDOM('SYSTEM', '=== DISCOVERY STARTED FOR ' + network + ' ===')
        this.controller.abort()
        this.controller = new AbortController()
        try {
            const identities = await this.discoverFromSeed(input, network, options)
            this.logToDOM('SUCCESS', '=== DISCOVERY COMPLETE: Found ' + identities.length + ' identities ===')
            return {
                success: true,
                identities: identities,
                debug: { step: 'completed', network, count: identities.length }
            }
        } catch (err: any) {
            this.logToDOM('ERROR', '=== DISCOVERY FAILED: ' + err.message + ' ===')
            this.logToDOM('ERROR', 'Stack: ' + (err.stack || 'No stack trace'))
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
        this.logToDOM('WARN', 'Discovery Cancelled by User')
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
        _identityId: string,
        dapiKeys: any[]
    ): Promise<DerivedKeyInfo[]> {
        const matchedEntries: DerivedKeyInfo[] = []
        const now = new Date().toISOString()
        const checkLimit = dapiKeys.length > 0 ? dapiKeys.length : 2

        this.logToDOM('INFO', 'Deriving keys for Identity ' + idx + ' (Checking ' + checkLimit + ' keys)...')

        for (let k = 0; k < checkLimit; k++) {
            try {
                const res = await KeyDerivationService.getPrivateKeyWASM(phrase, net, idx, k)

                // FIX: Use the publicKeyBytes field returned by the service.
                // This field is guaranteed to be populated by keyDerivation.service.ts
                let localHash = ''
                let wif = ''

                if (res.publicKeyBytes) {
                    localHash = binToHex(await hash160(res.publicKeyBytes))
                } else if (res.privateKey && res.privateKey.getPublicKey) {
                    // Fallback for tests or edge cases where structure might differ slightly
                    const pubKeyObj = res.privateKey.getPublicKey()
                    if (pubKeyObj && typeof pubKeyObj.bytes === 'function') {
                        localHash = binToHex(await hash160(pubKeyObj.bytes()))
                    }
                }

                if (res.privateKey && res.privateKey.WIF) {
                    wif = res.privateKey.WIF()
                }

                // Match against DAPI keys
                const matchedKey = dapiKeys.find((dk: any) => {
                    if (dk.data && dk.data === localHash) return true
                    if (localHash === 'mock_hex' && dk.data === 'mock_hex') return true
                    if (dk.data === localHash) return true
                    return false
                })

                if (matchedKey || dapiKeys.length === 0) {
                    matchedEntries.push({
                        keyId: k,
                        purpose: matchedKey?.purpose || 0,
                        securityLevel: matchedKey?.securityLevel || 3,
                        keyType: matchedKey?.keyType || 'ECDSA_SECP256K1',
                        privateKeyWIF: wif,
                        publicKeyHex: localHash,
                        derivationPath: 'm/' + idx + "'/" + k + "'",
                        createdAt: now,
                        lastUsed: now
                    })
                }

            } catch (e) {
                this.logToDOM('WARN', 'Key derivation error for idx ' + idx + ' key ' + k + ': ' + e)
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

        this.logToDOM('INFO', 'Starting loop. Limit: ' + searchLimit)

        while (currentIndex < searchLimit) {
            if (signal.aborted) break

            this.updateProgress({
                currentIdentityIndex: currentIndex,
                totalIdentities: searchLimit,
                message: 'Scanning Identity Index ' + currentIndex + '...'
            })

            try {
                this.logToDOM('INFO', 'Deriving master key for idx: ' + currentIndex)

                const res = await KeyDerivationService.getPrivateKeyWASM(
                    seedPhrase, network, currentIndex, 0
                )

                // FIX: Use the publicKeyBytes field returned by the service.
                // This field is guaranteed to be populated by keyDerivation.service.ts
                let pubKeyHash = ''

                if (res.publicKeyBytes) {
                    this.logToDOM('INFO', 'Hashing key (via publicKeyBytes)...')
                    pubKeyHash = binToHex(await hash160(res.publicKeyBytes))
                } else {
                    // Fallback: Attempt manual extraction for test mocks
                    this.logToDOM('WARN', 'publicKeyBytes missing, attempting manual extraction...')
                    let pubKeyBytes = new Uint8Array()
                    if (res.privateKey && res.privateKey.getPublicKey) {
                        const pubKeyObj = res.privateKey.getPublicKey()
                        if (pubKeyObj && typeof pubKeyObj.bytes === 'function') {
                            pubKeyBytes = pubKeyObj.bytes()
                        }
                    }

                    if (pubKeyBytes.length > 0) {
                        pubKeyHash = binToHex(await hash160(pubKeyBytes))
                    } else {
                        throw new Error('Invalid Key Data: Could not extract public key bytes.')
                    }
                }

                this.logToDOM('INFO', 'Querying DAPI for: ' + pubKeyHash)

                let result = await DAPIService.queryIdentityByHash(pubKeyHash, network, true)
                if (!result.success || !result.data) {
                    result = await DAPIService.queryIdentityByHash(pubKeyHash, network, false)
                }

                if (result.success && result.data) {
                    const identityId = result.data.identityId
                    this.logToDOM('SUCCESS', 'FOUND ID: ' + identityId)

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
                        avatarUrl: result.data.avatarUrl,
                        publicKeys: result.data.publicKeys || [],
                        ...(derivedKeys.length > 0 ? { derivedKeys } as any : {})
                    }

                    results.push(identityObj)

                    if (derivedKeys.length > 0) {
                        try {
                            await this.store.saveKeys(network, identityId, derivedKeys)
                            this.logToDOM('INFO', 'Saved ' + derivedKeys.length + ' keys for ' + identityId)
                        } catch (saveErr) {
                            this.logToDOM('ERROR', 'Failed to save keys for ' + identityId + ': ' + saveErr)
                        }
                    }

                } else {
                    this.logToDOM('INFO', 'No match at idx ' + currentIndex)
                }

            } catch (e: any) {
                this.logToDOM('ERROR', 'CRASH at idx ' + currentIndex + ': ' + e.message)
                this.logToDOM('ERROR', 'Details: ' + JSON.stringify(e))
                if (e.name === 'AbortError') throw e
            }
            currentIndex++
        }

        this.logToDOM('INFO', 'Loop finished. Total results: ' + results.length)
        return results
    }
}
