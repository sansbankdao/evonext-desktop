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
            document.body.appendChild(hud)
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
                        purpose: Number(matchedKey?.purpose ?? 0),
                        securityLevel: Number(matchedKey?.securityLevel ?? 3),
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
        for (let i = 0; i < limit; i++) {
            if (signal.aborted) break
            this.updateProgress({ currentIdentityIndex: i, totalIdentities: limit })
            this.logToHUD('INFO', `Checking Index ${i}...`)
            try {
                const res = await KeyDerivationService.getPrivateKeyWASM(seedPhrase, network, i, 0)
                const bytes = res.publicKeyBytes || res.privateKey?.getPublicKey?.()?.bytes?.()
                if (!bytes) continue
                const pubKeyHash = binToHex(await hash160(bytes))
                let result = await DAPIService.queryIdentityByHash(pubKeyHash, network, true)
                if (!result.success || !result.data) {
                    result = await DAPIService.queryIdentityByHash(pubKeyHash, network, false)
                }
                if (result.success && result.data && result.data.identityId) {
                    const id = result.data.identityId
                    const keys = await this._derivePrivateKeys(
                        seedPhrase, network, i, id, result.data.publicKeys || []
                    )
                    if (keys.length > 0) {
                        await this.store.saveKeys(network, id, keys)
                    }
                    found.push({
                        identityId: id,
                        balance: result.data.balance || '0',
                        identityIdx: i,
                        dpnsUsername: await DAPIService.getDPNSUsername(id, network),
                        keyType: 'seed',
                        discoveredAt: new Date().toISOString()
                    })
                }
            } catch (e: any) {
                this.logToHUD('ERROR', `Index ${i} error: ${e.message || e}`)
            }
        }
        return found
    }
}
