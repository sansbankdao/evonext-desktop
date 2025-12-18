// src/libs/keys/KeychainManager.ts
import { ErrorBoundary } from '@/utils/errors'
import { log } from '@/utils/env'
import { useIdentityStore } from '@/stores/identity'
import type { IIdentity, IPublicKey } from '@/types'
interface KeychainEntry {
    identityId: string
    identityIdx: number
    keys: {
        [purpose: number]: {
            keyIdx: number
            keyType: string
            securityLevel: number
            registered: boolean
            registeredAt?: string
        }
    }
    createdAt: string
    updatedAt: string
}
export class KeychainManager {
    private static readonly STORAGE_KEY = 'evonext_keychain'
    private static readonly DEFAULT_KEYCHAIN = {
        0: { // AUTHENTICATION
            0: { keyIdx: 0, keyType: 'ECDSA_HASH160', securityLevel: 0 }, // MASTER
            1: { keyIdx: 1, keyType: 'ECDSA_HASH160', securityLevel: 1 }, // CRITICAL
            2: { keyIdx: 2, keyType: 'ECDSA_HASH160', securityLevel: 2 }, // HIGH
        },
        1: { // TRANSFER
            1: { keyIdx: 3, keyType: 'ECDSA_HASH160', securityLevel: 1 }, // CRITICAL
        },
        2: { // ENCRYPTION
            3: { keyIdx: 4, keyType: 'ECDSA_SECP256K1', securityLevel: 3 }, // MEDIUM
        }
    }
    static async loadKeychain(identityId: string, identityIdx: number): Promise<KeychainEntry | null> {
        return ErrorBoundary.wrap(async () => {
            try {
                const stored = localStorage.getItem(this.STORAGE_KEY)
                if (!stored) return null
                const keychains: Record<string, KeychainEntry> = JSON.parse(stored)
                return keychains[identityId] || null
            } catch (error) {
                log('error', 'Failed to load keychain:', error)
                return null
            }
        }, 'LOAD_KEYCHAIN_FAILED')
    }
    static async saveKeychain(identityId: string, identityIdx: number, publicKeys: IPublicKey[]): Promise<void> {
        return ErrorBoundary.wrap(async () => {
            try {
                // Load existing
                const stored = localStorage.getItem(this.STORAGE_KEY)
                const keychains: Record<string, KeychainEntry> = stored ? JSON.parse(stored) : {}
                // Create new entry
                const entry: KeychainEntry = {
                    identityId,
                    identityIdx,
                    keys: {},
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
                // Map registered keys
                publicKeys.forEach(key => {
                    if (!entry.keys[key.purpose]) {
                        entry.keys[key.purpose] = {}
                    }
                    // Find which key index this corresponds to in our default keychain
                    const purposeMap = this.DEFAULT_KEYCHAIN[key.purpose as keyof typeof this.DEFAULT_KEYCHAIN]
                    let keyIdx = -1
                    if (purposeMap) {
                        // Find matching security level
                        for (const [securityLevelStr, keyInfo] of Object.entries(purposeMap)) {
                            const securityLevel = parseInt(securityLevelStr)
                            if (securityLevel === key.securityLevel) {
                                keyIdx = (keyInfo as any).keyIdx
                                break
                            }
                        }
                    }
                    entry.keys[key.purpose][key.securityLevel] = {
                        keyIdx: keyIdx !== -1 ? keyIdx : this.findBestMatch(key),
                        keyType: key.keyType,
                        securityLevel: key.securityLevel,
                        registered: true,
                        registeredAt: new Date().toISOString()
                    }
                })
                // Add missing keys from default keychain
                for (const [purposeStr, purposeMap] of Object.entries(this.DEFAULT_KEYCHAIN)) {
                    const purpose = parseInt(purposeStr)
                    if (!entry.keys[purpose]) {
                        entry.keys[purpose] = {}
                    }
                    for (const [securityLevelStr, keyInfo] of Object.entries(purposeMap)) {
                        const securityLevel = parseInt(securityLevelStr)
                        if (!entry.keys[purpose][securityLevel]) {
                            entry.keys[purpose][securityLevel] = {
                                ...(keyInfo as any),
                                registered: false
                            }
                        }
                    }
                }
                // Save
                keychains[identityId] = entry
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(keychains))
                log('info', `Keychain saved for identity: ${identityId}`)
            } catch (error) {
                log('error', 'Failed to save keychain:', error)
            }
        }, 'SAVE_KEYCHAIN_FAILED')
    }
    static getDefaultKeychain(): typeof this.DEFAULT_KEYCHAIN {
        return this.DEFAULT_KEYCHAIN
    }
    static async getMissingKeys(identityId: string): Promise<Array<{purpose: number, securityLevel: number, keyType: string}>> {
        return ErrorBoundary.wrap(async () => {
            const entry = await this.loadKeychain(identityId, 0) // identityIdx unknown
            if (!entry) return []
            const missing: Array<{purpose: number, securityLevel: number, keyType: string}> = []
            for (const [purposeStr, purposeKeys] of Object.entries(entry.keys)) {
                const purpose = parseInt(purposeStr)
                for (const [securityLevelStr, keyInfo] of Object.entries(purposeKeys)) {
                    const securityLevel = parseInt(securityLevelStr)
                    const info = keyInfo as any
                    if (!info.registered) {
                        missing.push({
                            purpose,
                            securityLevel,
                            keyType: info.keyType
                        })
                    }
                }
            }
            return missing
        }, 'GET_MISSING_KEYS_FAILED')
    }
    private static findBestMatch(key: IPublicKey): number {
        // Fallback logic if no exact match
        if (key.purpose === 0) { // AUTHENTICATION
            if (key.securityLevel === 0) return 0 // MASTER
            if (key.securityLevel === 1) return 1 // CRITICAL
            if (key.securityLevel === 2) return 2 // HIGH
        } else if (key.purpose === 1) { // TRANSFER
            return 3 // CRITICAL TRANSFER
        } else if (key.purpose === 2) { // ENCRYPTION
            return 4 // MEDIUM ENCRYPTION
        }
        return -1
    }
}
