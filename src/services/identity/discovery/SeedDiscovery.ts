// src/services/identity/discovery/SeedDiscovery.ts

import { BaseDiscovery } from './BaseDiscovery'
import { DAPIService } from './DAPIService'
import { KeyDerivationService } from '../keyDerivation.service'
import type {
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
    private progressCallback: ProgressCallback | null = null
    private isHudVisible: boolean = false
    // Store derived metadata separately since it's not part of the Rust type
    private derivedMetadata: Map<string, any> = new Map()
    constructor() {
        super()
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
                position: fixed;
                bottom: 0;
                left: 0;
                width: 100%;
                height: 260px;
                background: rgba(0,0,0,0.95);
                color: #00ff00;
                font-family: monospace;
                font-size: 11px;
                z-index: 999999;
                overflow-y: auto;
                padding: 12px;
                border-top: 2px solid #e11d48;
                pointer-events: auto;
                line-height: 1.5;
                transform: translateY(100%);
                transition: transform 0.3s ease;
            `
            // Add copy button
            const copyBtn = document.createElement('button')
            copyBtn.textContent = '📋 Copy Logs'
            copyBtn.style.cssText = `
                position: absolute;
                top: 8px;
                right: 8px;
                background: rgba(255,255,255,0.1);
                color: #00ff00;
                border: 1px solid #00ff00;
                border-radius: 4px;
                padding: 4px 8px;
                font-family: monospace;
                font-size: 10px;
                cursor: pointer;
                z-index: 1000000;
            `
            copyBtn.onclick = () => {
                const logs = Array.from(hud!.children)
                    .filter(el => !el.classList.contains('hud-controls'))
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
                position: absolute;
                top: 8px;
                right: 109px;
                background: rgba(255,255,255,0.1);
                color: #00ff00;
                border: 1px solid #00ff00;
                border-radius: 4px;
                padding: 4px 8px;
                font-family: monospace;
                font-size: 10px;
                cursor: pointer;
                z-index: 1000000;
            `
            clearBtn.onclick = () => {
                while (hud!.firstChild) {
                    hud!.removeChild(hud!.firstChild)
                }
                this.logToHUD('SYSTEM', '=== LOGS CLEARED ===')
                // Re-add control buttons
                const controlsDiv = document.createElement('div')
                controlsDiv.className = 'hud-controls'
                controlsDiv.appendChild(copyBtn.cloneNode(true))
                controlsDiv.appendChild(clearBtn.cloneNode(true))
                hud!.appendChild(controlsDiv)
            }
            // Add toggle button
            const toggleBtn = document.createElement('button')
            toggleBtn.textContent = '👁️ Show HUD'
            toggleBtn.style.cssText = `
                position: fixed;
                bottom: 8px;
                left: 8px;
                background: rgba(0,0,0,0.8);
                color: #00ff00;
                border: 1px solid #00ff00;
                border-radius: 4px;
                padding: 4px 8px;
                font-family: monospace;
                font-size: 10px;
                cursor: pointer;
                z-index: 999998;
            `
            toggleBtn.onclick = () => {
                this.isHudVisible = !this.isHudVisible
                if (hud) {
                    hud.style.transform = this.isHudVisible ? 'translateY(0)' : 'translateY(100%)'
                    toggleBtn.textContent = this.isHudVisible ? '👁️ Hide HUD' : '👁️ Show HUD'
                }
            }
            // Create controls container
            const controlsDiv = document.createElement('div')
            controlsDiv.className = 'hud-controls'
            controlsDiv.appendChild(copyBtn)
            controlsDiv.appendChild(clearBtn)
            hud.appendChild(controlsDiv)
            document.body.appendChild(hud)
            document.body.appendChild(toggleBtn)
            this.logToHUD('SYSTEM', '=== IDENTITY DISCOVERY ENGINE ONLINE ===')
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
                    this.logToHUD('DEBUG', `Skipping index ${i}: No valid bytes from derivation`)
                    continue
                }
                // Calculate HASH160 for comparison
                const publicKeyHash = binToHex(await hash160(bytes))
                this.logToHUD('DEBUG', `Generated PKH for index ${i}: ${publicKeyHash}`)
                // DEBUG: Attempt to find identity by hash - try unique search first
                this.logToHUD('DEBUG', `Searching DAPI for PKH ${publicKeyHash.substring(0, 16)}...`)
                let dapiResult = await DAPIService.queryIdentityByHash(publicKeyHash, network, true)
                if (!dapiResult.success) {
                    this.logToHUD('DEBUG', `Unique search failed for identity ${i}, trying non-unique...`)
                    dapiResult = await DAPIService.queryIdentityByHash(publicKeyHash, network, false)
                }
                this.logToHUD('DEBUG', `DAPI lookup result: ${dapiResult.success ? 'SUCCESS' : 'FAILED'}, found: ${dapiResult.success ? 'yes' : 'no'}, searchType: ${dapiResult.searchType}`)
                if (dapiResult.success && dapiResult.data && dapiResult.data.identityId) {
                    // DEBUG: Found identity on chain
                    this.logToHUD('SUCCESS', `FOUND identity at index ${i}! ID: ${dapiResult.data.identityId}`)
                    const identityId = dapiResult.data.identityId
                    // Fetch full identity to get public keys
                    this.logToHUD('DEBUG', `Fetching full identity details...`)
                    const fetchResult = await DAPIService.getIdentityById(identityId, network)
                    const rawKeys = fetchResult.success && fetchResult.data && fetchResult.data.publicKeys
                        ? fetchResult.data.publicKeys
                        : []
                    // Derive private keys that match the identity's public keys
                    this.logToHUD('DEBUG', `Deriving private keys for ${rawKeys.length} public keys...`)
                    const derivedKeys = await this._derivePrivateKeys(seedPhrase, network, i, identityId, rawKeys)
                    // Get DPNS username
                    let dpnsUsername: string | null = null
                    try {
                        const dpnsResult = await DAPIService.getDPNSUsername(identityId, network)
                        if (dpnsResult && dpnsResult.success && dpnsResult.data) {
                            dpnsUsername = dpnsResult.data  // Extract the string from data property
                        }
                    } catch (dpnsErr: any) {
                        this.logToHUD('DEBUG', `Failed to fetch DPNS username: ${dpnsErr.message || dpnsErr}`)
                    }
                    // Calculate matched keys count
                    const matchedKeys = derivedKeys.length
                    const totalKeys = rawKeys.length
                    const identity: IDiscoveredIdentity = {
                        identityId: identityId,
                        balance: dapiResult.data.balance || '0',
                        identityIdx: i,
                        dpnsUsername: dpnsUsername ?? null,
                        keyType: 'ECDSA_HASH160', // Default, could be derived from keys
                        discoveredAt: new Date().toISOString()
                    }
                    found.push(identity)

                    // Store derived metadata separately (not part of IDiscoveredIdentity type)
                    this.derivedMetadata.set(identityId, {
                        username: dpnsUsername || `Identity #${i}`,
                        revision: typeof fetchResult.data?.revision === 'number' // FIXME THIS IS AN UGLY HACK!!
                            ? fetchResult.data.revision
                            : parseInt(String(fetchResult.data?.revision || '0'), 10) || 0,
                        publicKeys: rawKeys || [],
                        canSign: matchedKeys > 0,
                        matchedKeys: matchedKeys,
                        totalKeys: totalKeys,
                        lastSync: new Date().toISOString(),
                        isLoaded: false
                    })

                    // Save to store if autosave is enabled (check if option exists)
                    if (options && 'autosave' in options && options.autosave && derivedKeys.length > 0) {
                        this.logToHUD('INFO', `Autosaving identity ${identityId}...`)
                        try {
                            // Note: saveIdentityWithKeys doesn't exist on IIdentityActions
                            // We'll use saveIdentity and saveKeys separately if needed
                            // For now, just log that we would save
                            this.logToHUD('DEBUG', `Would autosave identity ${identityId} with ${derivedKeys.length} keys`)
                        } catch (saveErr: any) {
                            this.logToHUD('ERROR', `Failed to autosave: ${saveErr.message || saveErr}`)
                        }
                    }
                    // Check for stopAtFirstMatch if the option exists
                    if (options && 'stopAtFirstMatch' in options && options.stopAtFirstMatch) {
                        this.logToHUD('INFO', `StopAtFirstMatch enabled - stopping discovery.`)
                        break
                    }
                } else {
                    this.logToHUD('DEBUG', `No identity found at index ${i}.`)
                }
            } catch (err: any) {
                this.logToHUD('ERROR', `Error checking index ${i}: ${err.message || err}`)
            }
        }
        // DEBUG: Summary of findings
        if (found.length > 0) {
            this.logToHUD('SUCCESS', `Discovered ${found.length} identity/identities:`)
            found.forEach(id => {
                const metadata = this.derivedMetadata.get(id.identityId) || {}
                const username = metadata.username || id.dpnsUsername || id.identityId.substring(0, 8) + '...'
                const matchedKeys = metadata.matchedKeys || 0
                const totalKeys = metadata.totalKeys || 0
                this.logToHUD('INFO', `  • ${id.identityId} (${username}) - ${matchedKeys}/${totalKeys} keys`)
            })
        } else {
            this.logToHUD('WARN', 'No identities discovered from this seed phrase.')
        }
        return found
    }
    /**
     * Get derived metadata for an identity (UI-only properties not in Rust type)
     */
    getDerivedMetadata(identityId: string): any {
        return this.derivedMetadata.get(identityId) || null
    }
}
