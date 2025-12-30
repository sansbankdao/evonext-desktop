// src/services/identity/keyDerivation.service.ts
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKeyWASM } from 'pshenmic-dpp'
// @ts-ignore - We installed these
import { hash160 } from '@evonext/crypto'
// @ts-ignore - We installed these
import { binToHex, hexToBin } from '@evonext/utils'
import type { DerivedKey, KeyDerivationResult } from './types'

export type KeyType = 'WIF' | 'HEX_PRIVATE' | 'COMPRESSED_PUBKEY' | 'UNCOMPRESSED_PUBKEY' | 'UNKNOWN'

export interface DerivationResult {
    hashes: string[]
    keyType: KeyType
    debug?: {
        error?: string
        input?: string
        reason?: string
    }
}

export class KeyDerivationService {
    private static sdkInstances: Map<string, DashPlatformSDK> = new Map()

    private static async getSDK(network: 'mainnet' | 'testnet' = 'testnet'): Promise<DashPlatformSDK> {
        const key = network
        if (!this.sdkInstances.has(key)) {
            try {
                const sdk = new DashPlatformSDK({ network })
                this.sdkInstances.set(key, sdk)
                console.log(`[KeyDerivation] SDK initialized for ${network}`)
            } catch (error) {
                console.error(`[KeyDerivation] Failed to initialize SDK for ${network}:`, error)
                throw new Error(`Failed to initialize SDK: ${error}`)
            }
        }
        return this.sdkInstances.get(key)!
    }

    /**
     * Detect the key format
     */
    static detectKeyFormat(keyInput: string): { format: KeyType; description: string } {
        const cleanKey = keyInput.trim()

        if (/^[cKL][0-9A-Za-z]{51,}$/.test(cleanKey)) {
            return {
                format: 'WIF',
                description: 'Private key in Wallet Import Format (WIF). Typically starts with "c" (testnet) or "K"/"L" (mainnet).'
            }
        }

        if (/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
            return {
                format: 'HEX_PRIVATE',
                description: '64-character hexadecimal private key.'
            }
        }

        if (/^0[23][0-9a-fA-F]{64}$/.test(cleanKey)) {
            return {
                format: 'COMPRESSED_PUBKEY',
                description: '66-character compressed public key (starts with 02 or 03).'
            }
        }

        if (/^04[0-9a-fA-F]{128}$/.test(cleanKey)) {
            return {
                format: 'UNCOMPRESSED_PUBKEY',
                description: '130-character uncompressed public key (starts with 04).'
            }
        }

        const words = cleanKey.split(/\s+/)
        if (words.length === 12 || words.length === 24) {
            return {
                format: 'UNKNOWN',
                description: 'Seed phrase detected. Please use seed discovery method instead.'
            }
        }

        return {
            format: 'UNKNOWN',
            description: 'Unknown or unsupported key format.'
        }
    }

    /**
     * Derive all possible public key hashes for a given input key
     */
    static async deriveAllPossibleHashes(
        keyInput: string,
        network: 'mainnet' | 'testnet' = 'testnet'
    ): Promise<DerivationResult> {
        console.log(`[KeyDerivation] Deriving hashes for input on ${network}`)
        console.log(`[KeyDerivation] Input (first 20 chars): ${keyInput.substring(0, 20)}...`)

        try {
            const cleanKey = keyInput.trim()
            const keyFormat = this.detectKeyFormat(cleanKey)
            console.log(`[KeyDerivation] Detected format: ${keyFormat.format}`)

            // Handle seed phrase detection
            if (keyFormat.format === 'UNKNOWN' && keyFormat.description.includes('Seed phrase')) {
                return {
                    hashes: [],
                    keyType: 'UNKNOWN',
                    debug: {
                        reason: 'Seed phrase detected',
                        input: cleanKey.substring(0, 20) + '...'
                    }
                }
            }

            switch (keyFormat.format) {
                case 'WIF':
                    return await this.deriveFromWIF(cleanKey)

                case 'HEX_PRIVATE':
                    return await this.deriveFromHexPrivateKey(cleanKey, network)

                case 'COMPRESSED_PUBKEY':
                    return this.hashPublicKey(cleanKey, network, 'COMPRESSED_PUBKEY')

                case 'UNCOMPRESSED_PUBKEY':
                    return this.hashPublicKey(cleanKey, network, 'UNCOMPRESSED_PUBKEY')

                default:
                    return {
                        hashes: [],
                        keyType: 'UNKNOWN',
                        debug: {
                            error: 'Unsupported key format',
                            input: cleanKey.substring(0, 20) + '...',
                            // description: keyFormat.description
                        }
                    }
            }

        } catch (error: any) {
            console.error('[KeyDerivation] Derivation failed:', error)
            return {
                hashes: [],
                keyType: 'UNKNOWN',
                debug: {
                    error: error.message,
                    // stack: error.stack
                }
            }
        }
    }

    /**
     * Derive from WIF private key
     */
    private static async deriveFromWIF(wif: string): Promise<DerivationResult> {
        try {
            console.log('[KeyDerivation] Parsing WIF:', wif.substring(0, 16) + '...')

            // Create private key instance
            const privateKey = PrivateKeyWASM.fromWIF(wif)

            // Get public key
            const publicKey = privateKey.getPublicKey()
            const publicKeyBytes = publicKey.bytes()

            // Hash the public key
            const publicKeyHash = binToHex(hash160(publicKeyBytes))

            console.log(`[KeyDerivation] Derived from WIF: ${publicKeyHash}`)

            return {
                hashes: [publicKeyHash],
                keyType: 'WIF',
                debug: {
                    input: wif.substring(0, 16) + '...',
                    // hash: publicKeyHash
                }
            }

        } catch (error: any) {
            console.error('[KeyDerivation] WIF parsing failed:', error)
            return {
                hashes: [],
                keyType: 'WIF',
                debug: {
                    error: `Invalid WIF format: ${error.message}`,
                    input: wif.substring(0, 16) + '...'
                }
            }
        }
    }

    /**
     * Derive from HEX private key
     */
    private static async deriveFromHexPrivateKey(
        hexKey: string,
        network: 'mainnet' | 'testnet'
    ): Promise<DerivationResult> {
        try {
            console.log('[KeyDerivation] Parsing HEX private key:', hexKey.substring(0, 16) + '...')

            // Normalize hex (ensure lowercase)
            const normalizedHex = hexKey.toLowerCase()
            if (!/^[0-9a-f]{64}$/.test(normalizedHex)) {
                throw new Error('Invalid HEX format: must be 64 hex characters')
            }

            // Create private key instance
            const privateKey = PrivateKeyWASM.fromHex(normalizedHex, network)

            // Get public key
            const publicKey = privateKey.getPublicKey()
            const publicKeyBytes = publicKey.bytes()

            // Hash the public key
            const publicKeyHash = binToHex(hash160(publicKeyBytes))

            console.log(`[KeyDerivation] Derived from HEX: ${publicKeyHash}`)

            return {
                hashes: [publicKeyHash],
                keyType: 'HEX_PRIVATE',
                debug: {
                    input: '0x' + normalizedHex.substring(0, 16) + '...',
                    // hash: publicKeyHash
                }
            }

        } catch (error: any) {
            console.error('[KeyDerivation] HEX parsing failed:', error)
            return {
                hashes: [],
                keyType: 'HEX_PRIVATE',
                debug: {
                    error: `Invalid HEX private key: ${error.message}`,
                    input: hexKey.substring(0, 16) + '...'
                }
            }
        }
    }

    /**
     * Hash a public key directly
     */
    private static hashPublicKey(
        publicKey: string,
        network: 'mainnet' | 'testnet',
        keyType: 'COMPRESSED_PUBKEY' | 'UNCOMPRESSED_PUBKEY'
    ): DerivationResult {
        try {
            console.log('[KeyDerivation] Hashing public key:', publicKey.substring(0, 16) + '...')

            // Normalize to lowercase hex
            const normalizedKey = publicKey.toLowerCase()

            // Validate format
            if (keyType === 'COMPRESSED_PUBKEY' && !/^0[23][0-9a-f]{64}$/.test(normalizedKey)) {
                throw new Error('Invalid compressed public key format')
            }

            if (keyType === 'UNCOMPRESSED_PUBKEY' && !/^04[0-9a-f]{128}$/.test(normalizedKey)) {
                throw new Error('Invalid uncompressed public key format')
            }

            // Convert hex to binary
            const pubKeyBytes = hexToBin(normalizedKey)

            // Hash the public key
            const publicKeyHash = binToHex(hash160(pubKeyBytes))

            console.log(`[KeyDerivation] Hashed ${keyType}: ${publicKeyHash}`)

            return {
                hashes: [publicKeyHash],
                keyType,
                debug: {
                    input: normalizedKey.substring(0, 16) + '...',
                    // hash: publicKeyHash
                }
            }

        } catch (error: any) {
            console.error('[KeyDerivation] Public key hashing failed:', error)
            return {
                hashes: [],
                keyType,
                debug: {
                    error: `Invalid public key: ${error.message}`,
                    input: publicKey.substring(0, 16) + '...'
                }
            }
        }
    }

    /**
     * Derive all keys for multiple identity indexes and key indexes from seed phrase
     */
    static async deriveAllKeysFromSeed(
        seedPhrase: string,
        network: 'mainnet' | 'testnet' = 'testnet',
        maxIdentityIndex: number = 5,
        maxKeyIndex: number = 5
    ): Promise<KeyDerivationResult[]> {
        console.log(`[KeyDerivation] Deriving keys from seed for ${maxIdentityIndex} identities`)

        if (!seedPhrase.trim()) {
            throw new Error('Seed phrase is empty')
        }

        const words = seedPhrase.trim().split(/\s+/)
        if (words.length !== 12 && words.length !== 24) {
            throw new Error(`Invalid seed phrase length: ${words.length} words. Expected 12 or 24.`)
        }

        try {
            const sdk = await this.getSDK(network)
            const seed = await sdk.keyPair.mnemonicToSeed(seedPhrase, undefined)
            const walletHDKey = sdk.keyPair.seedToHdKey(seed)

            const results: KeyDerivationResult[] = []

            // Define key purposes for each index
            const keyPurposes = [
                { index: 0, purpose: 'AUTHENTICATION', securityLevel: 'MASTER' },
                { index: 1, purpose: 'AUTHENTICATION', securityLevel: 'CRITICAL' },
                { index: 2, purpose: 'AUTHENTICATION', securityLevel: 'HIGH' },
                { index: 3, purpose: 'TRANSFER', securityLevel: 'CRITICAL' },
                { index: 4, purpose: 'ENCRYPTION', securityLevel: 'MEDIUM' },
            ]

            for (let identityIdx = 0; identityIdx < maxIdentityIndex; identityIdx++) {
                const keys: DerivedKey[] = []

                console.log(`[KeyDerivation] Deriving keys for identity index ${identityIdx}`)

                for (const keyInfo of keyPurposes) {
                    try {
                        if (keyInfo.index >= maxKeyIndex) break

                        const hdKey = sdk.keyPair.deriveIdentityPrivateKey(
                            walletHDKey, identityIdx, keyInfo.index, network
                        )

                        const privateKey = PrivateKeyWASM.fromHex(binToHex(hdKey.privateKey), network)
                        const publicKey = privateKey.getPublicKey()
                        const pubKeyBytes = publicKey.bytes()
                        const publicKeyHash = binToHex(hash160(pubKeyBytes))

                        keys.push({
                            keyIndex: keyInfo.index,
                            purpose: keyInfo.purpose,
                            securityLevel: keyInfo.securityLevel,
                            privateKey,
                            publicKey: binToHex(pubKeyBytes),
                            publicKeyHash
                        })

                        console.log(`[KeyDerivation] Derived key ${keyInfo.index} for identity ${identityIdx}: ${publicKeyHash.substring(0, 16)}...`)

                    } catch (error) {
                        console.warn(`[KeyDerivation] Failed to derive key ${keyInfo.index} for identity ${identityIdx}:`, error)
                        // Continue with other keys
                    }
                }

                if (keys.length > 0) {
                    results.push({
                        identityIndex: identityIdx,
                        keys,
                        success: true
                    })
                } else {
                    results.push({
                        identityIndex: identityIdx,
                        keys: [],
                        success: false,
                        error: `No keys derived for identity index ${identityIdx}`
                    })
                }
            }

            const totalKeys = results.reduce((acc, r) => acc + r.keys.length, 0)
            console.log(`[KeyDerivation] Derived ${results.length} identities with ${totalKeys} total keys`)

            return results

        } catch (error: any) {
            console.error('[KeyDerivation] Failed to derive keys from seed:', error)
            throw new Error(`Failed to derive keys from seed: ${error.message}`)
        }
    }

    /**
     * Clean up SDK instances
     */
    static cleanup() {
        this.sdkInstances.clear()
        console.log('[KeyDerivation] SDK instances cleaned up')
    }
}

// Export functions for convenience
export const detectKeyFormat = KeyDerivationService.detectKeyFormat
export const deriveAllPossibleHashes = KeyDerivationService.deriveAllPossibleHashes
export const deriveAllKeysFromSeed = KeyDerivationService.deriveAllKeysFromSeed
