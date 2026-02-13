// src/services/identity/discovery/SeedDiscovery.ts

import { BaseDiscovery } from './BaseDiscovery'
import { DAPIService } from './DAPIService'
import { KeyDerivationService } from '../keyDerivation.service'
import type {
    IIdentityActions,
    DiscoveryOptions,
    DiscoveryResult,
} from '@/types'
import { type IPrivateKeyEntry, type IDiscoveredIdentity } from '@/bindings'
// @ts-ignore
import { binToHex } from '@evonext/utils'
import { hash160 } from '@/services/crypto'
export type ProgressCallback = (details: any) => void
// Mapping for DAPI string enums to numeric codes used internally
const PURPOSE_MAP: Record<string, number> = {
    'AUTHENTICATION': 0,
    'ENCRYPTION': 1,
    'DECRYPTION': 2,
    'TRANSFER': 3,
}
const SECURITY_LEVEL_MAP: Record<string, number> = {
    'MASTER': 0,
    'CRITICAL': 1,
    'HIGH': 2,
    'MEDIUM': 3,
}
export class SeedDiscovery extends BaseDiscovery {
    private controller: AbortController
    private store: IIdentityActions
    private progressCallback: ProgressCallback | null = null
    constructor(store: IIdentityActions) {
        super()
        this.store = store
        this.controller = new AbortController()
        this.ensureHUD()
    }
    private ensureHUD() {
        if (typeof document === 'undefined') return
        let hud = document.getElementById('__discovery_debug_hud')
        if (!hud) {
            hud = document.createElement('div')
            hud.id = '__discovery_debug_hud'
            hud.style.cssText = `
                position: fixed; bottom: 0; left: 0; width: 100%; height: 260px;
                background: rgba(0,0,0,0.95); color: #00ff00; font-family: monospace;
                font-size: 11px; z-index: 999999; overflow-y: auto; padding: 12px;
                border-top: 2px solid #e11d48; pointer-events: auto; line-height: 1.5;
            `

            // Add copy button
            const copyBtn = document.createElement('button')
            copyBtn.textContent = '📋 Copy Logs'
            copyBtn.style.cssText = `
                position: absolute; top: 8px; right: 8px;
                background: rgba(255,255,255,0.1); color: #00ff00;
                border: 1px solid #00ff00; border-radius: 4px;
                padding: 4px 8px; font-family: monospace; font-size: 10px;
                cursor: pointer; z-index: 1000000;
            `
            copyBtn.onclick = () => {
                const logs = Array.from(hud!.children)
                    .map(el => el.textContent)
                    .filter(Boolean)
                    .join('\n')
                navigator.clipboard.writeText(logs)
                    .then(() => {
                        const originalText = copyBtn.textContent
                        copyBtn.textContent = '✓ Copied!'
                        setTimeout(() => copyBtn.textContent = originalText, 2000)
                    })
                    .catch(err => console.error('Failed to copy logs:', err))
            }

            // Add clear button
            const clearBtn = document.createElement('button')
            clearBtn.textContent = '🗑️ Clear'
            clearBtn.style.cssText = `
                position: absolute; top: 8px; right: 80px;
                background: rgba(255,255,255,0.1); color: #00ff00;
                border: 1px solid #00ff00; border-radius: 4px;
                padding: 4px 8px; font-family: monospace; font-size: 10px;
                cursor: pointer; z-index: 1000000;
            `
            clearBtn.onclick = () => {
                while (hud!.firstChild) {
                    hud!.removeChild(hud!.firstChild)
                }
                this.logToHUD('SYSTEM', '=== LOGS CLEARED ===')
            }

            hud.appendChild(copyBtn)
            hud.appendChild(clearBtn)
            // document.body.appendChild(hud)
            // this.logToHUD('SYSTEM', '=== IDENTITY DISCOVERY ENGINE ONLINE ===')
        }
    }
    private logToHUD(level: string, message: any) {
        if (typeof document === 'undefined') return
        const hud = document.getElementById('__discovery_debug_hud')
        if (!hud) return
        const entry = document.createElement('div')
        const color = level === 'ERROR' ? '#fb7185' : level === 'SUCCESS' ? '#4ade80' : level === 'SYSTEM' ? '#22d3ee' : '#94a3b8'
        const time = new Date().toLocaleTimeString()
        const msgString = typeof message === 'string' ? message : JSON.stringify(message)
        entry.innerHTML = `<span style="color: grey;">[${time}]</span> <span style="color: ${color}; font-weight: bold;">[${level}]</span> ${msgString}`
        hud.appendChild(entry)
        hud.scrollTop = hud.scrollHeight
    }
    async discover(input: string, options?: DiscoveryOptions): Promise<DiscoveryResult> {
        const network = options?.network || 'testnet'
        this.logToHUD('SYSTEM', `DISCOVERY START: Network=${network.toUpperCase()}`)
        this.controller.abort()
        this.controller = new AbortController()
        try {
            const identities = await this.discoverFromSeed(input, network as 'mainnet' | 'testnet', options)
            this.logToHUD('SUCCESS', `DISCOVERY END: Found ${identities.length} identities.`)
            return {
                success: true,
                identities: identities as any,
                debug: { step: 'completed', network, count: identities.length }
            }
        } catch (err: any) {
            this.logToHUD('ERROR', `ENGINE CRASH: ${err.message || err}`)
            return { success: false, error: err.message || 'Discovery failed', identities: [] }
        }
    }
    cancel(): void {
        this.controller.abort()
        this.logToHUD('WARN', 'User sent cancellation signal.')
    }
    setProgressCallback(callback: ProgressCallback): void {
        this.progressCallback = callback
    }
    protected updateProgress(details: any) {
        if (this.progressCallback) this.progressCallback(details)
        window.dispatchEvent(new CustomEvent('discovery:progress', { detail: details }))
    }
    /**
     * Converts DAPI string-based purpose/securityLevel to numeric codes.
     * Handles both string enums and numeric values for backwards compatibility.
     */
    private parsePurpose(value: any): number {
        if (typeof value === 'number') return value
        if (typeof value === 'string') return PURPOSE_MAP[value.toUpperCase()] ?? 0
        return 0
    }
    private parseSecurityLevel(value: any): number {
        if (typeof value === 'number') return value
        if (typeof value === 'string') return SECURITY_LEVEL_MAP[value.toUpperCase()] ?? 3
        return 3
    }
    private async _derivePrivateKeys(
        phrase: string,
        net: 'mainnet' | 'testnet',
        idx: number,
        identityId: string,
        dapiKeys: any[]
    ): Promise<IPrivateKeyEntry[]> {
        const entries: IPrivateKeyEntry[] = []
        const now = new Date().toISOString()
        const checkLimit = dapiKeys.length > 0 ? dapiKeys.length : 1
        for (let k = 0; k < checkLimit; k++) {
            try {
                const res = await KeyDerivationService.getPrivateKeyWASM(phrase, net, idx, k)
                const bytes = res.publicKeyBytes || res.privateKey?.getPublicKey?.()?.bytes?.()
                if (!bytes) continue
                const localHash = binToHex(await hash160(bytes))
                const matchedKey = dapiKeys.find((dk: any) => dk.data === localHash)
                if (matchedKey || dapiKeys.length === 0) {
                    entries.push({
                        identityId: identityId,
                        keyId: k,
                        purpose: this.parsePurpose(matchedKey?.purpose),
                        securityLevel: this.parseSecurityLevel(matchedKey?.securityLevel),
                        keyType: String(matchedKey?.keyType || 'ECDSA_HASH160'),
                        privateKey: res.privateKey?.WIF?.() || '',
                        publicKey: localHash,
                        createdAt: now,
                        lastUsed: now
                    })
                }
            } catch (e) { /* skip derivation error */ }
        }
        return entries
    }
    async discoverFromSeed(
        seedPhrase: string,
        network: 'mainnet' | 'testnet',
        options?: DiscoveryOptions
    ): Promise<IDiscoveredIdentity[]> {
        const found: IDiscoveredIdentity[] = []
        const limit = options?.maxIdentityIndex ?? 5
        const signal = this.controller.signal

        // DEBUG: Log seed phrase info
        this.logToHUD('DEBUG', `Seed phrase: ${seedPhrase.split(' ').length} words`)
        this.logToHUD('DEBUG', `Network: ${network}, Max identities to check: ${limit}`)

        for (let i = 0; i < limit; i++) {
            if (signal.aborted) break
            this.updateProgress({ currentIdentityIndex: i, totalIdentities: limit })
            this.logToHUD('INFO', `Checking Index ${i}...`)
            try {
                // DEBUG: Log derivation attempt
                this.logToHUD('DEBUG', `Deriving key for identity index ${i}, key index 0...`)

                const res = await KeyDerivationService.getPrivateKeyWASM(seedPhrase, network, i, 0)
                const bytes = res.publicKeyBytes || res.privateKey?.getPublicKey?.()?.bytes?.()
                if (!bytes) {
                    this.logToHUD('WARN', `No public key bytes for identity ${i}`)
                    continue
                }

                const pubKeyHash = binToHex(await hash160(bytes))
                this.logToHUD('DEBUG', `Identity ${i} public key hash: ${pubKeyHash}`)

                // Try to find identity by hash
                let result = await DAPIService.queryIdentityByHash(pubKeyHash, network, true)
                if (!result.success || !result.data) {
                    this.logToHUD('DEBUG', `Primary query failed for identity ${i}, trying fallback...`)
                    result = await DAPIService.queryIdentityByHash(pubKeyHash, network, false)
                }

                // DEBUG: Log the full result
                this.logToHUD('DEBUG', `Query result for ${pubKeyHash.substring(0, 16)}...: success=${result.success}, hasData=${!!result.data}, searchType=${result.searchType}`)

                // Extract identity ID from result.data - handle different possible field names
                let identityId: string | undefined = undefined
                if (result.data) {
                    // Try common field names for identity ID
                    identityId = result.data.identityId
                    if (identityId) {
                        this.logToHUD('DEBUG', `Found identityId: ${identityId}`)
                    } else {
                        this.logToHUD('DEBUG', `No identityId found in data. Available keys: ${Object.keys(result.data).join(', ')}`)
                        // Log the actual data structure for debugging
                        this.logToHUD('DEBUG', `Data structure: ${JSON.stringify(result.data).substring(0, 200)}...`)
                    }
                }

                if (result.success && result.data && identityId) {
                    this.logToHUD('SUCCESS', `FOUND Identity ${i}: ${identityId}`)

                    const keys = await this._derivePrivateKeys(
                        seedPhrase, network, i, identityId, result.data.publicKeys || []
                    )

                    if (keys.length > 0) {
                        this.logToHUD('DEBUG', `Saving ${keys.length} keys for identity ${i}`)
                        await this.store.saveKeys(network, identityId, keys)
                    }

                    found.push({
                        identityId: identityId,
                        balance: result.data.balance || '0',
                        identityIdx: i,
                        dpnsUsername: await DAPIService.getDPNSUsername(identityId, network),
                        keyType: 'seed',
                        discoveredAt: new Date().toISOString()
                    })
                } else {
                    this.logToHUD('DEBUG', `No identity found for hash: ${pubKeyHash}`)
                    if (result.error) {
                        this.logToHUD('DEBUG', `Error: ${result.error}`)
                    }
                }
            } catch (e: any) {
                this.logToHUD('ERROR', `Index ${i} error: ${e.message || e}`)
                this.logToHUD('DEBUG', `Stack: ${e.stack || 'No stack trace'}`)
            }
        }

        this.logToHUD('INFO', `Discovery complete. Found ${found.length} identities.`)
        return found
    }
}
