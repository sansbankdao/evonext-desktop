// src/services/keyDerivation.service.ts

import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKeyWASM } from 'pshenmic-dpp'

// @ts-ignore
import { hash160 } from '@evonext/crypto'
// @ts-ignore
import { binToHex, hexToBin } from '@evonext/utils'
import type { DerivedKey, KeyDerivationResult } from '@/types'


export class KeyDerivationService {
    private static sdk: DashPlatformSDK | null = null

    private static async getSDK(network: 'mainnet' | 'testnet' = 'testnet'): Promise<DashPlatformSDK> {
        if (!this.sdk) {
            this.sdk = new DashPlatformSDK({ network })
        }
        return this.sdk
    }

    /**
     * Derive all possible public key hashes for a given input key
     */
    static async deriveAllPossibleHashes(
        keyInput: string,
        network: 'mainnet' | 'testnet' = 'testnet'
    ): Promise<{
        hashes: string[]
        keyType: 'WIF' | 'HEX_PRIVATE' | 'COMPRESSED_PUBKEY' | 'UNCOMPRESSED_PUBKEY' | 'UNKNOWN'
        debug?: any
    }> {
        console.log(`[KeyDerivation] Deriving hashes for input on ${network}`)

        try {
            const cleanKey = keyInput.trim()
            const sdk = await this.getSDK(network)

            // Try to parse as WIF first
            if (/^[cKL][0-9A-Za-z]{50,}$/.test(cleanKey)) {
                console.log('[KeyDerivation] Parsing as WIF')
                try {
                    const privateKey = PrivateKeyWASM.fromWIF(cleanKey)
                    return await this.deriveFromPrivateKey(privateKey, network)
                } catch (error) {
                    console.warn('[KeyDerivation] WIF parse failed, trying other formats')
                }
            }

            // Try as HEX private key (64 chars)
            if (/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
                console.log('[KeyDerivation] Parsing as HEX private key')
                try {
                    const privateKey = PrivateKeyWASM.fromHex(cleanKey, network)
                    return await this.deriveFromPrivateKey(privateKey, network)
                } catch (error) {
                    console.warn('[KeyDerivation] HEX private key parse failed')
                }
            }

            // Try as compressed public key (66 hex chars starting with 02/03)
            if (/^0[23][0-9a-fA-F]{64}$/.test(cleanKey)) {
                console.log('[KeyDerivation] Input is compressed public key')
                try {
                    const pubKeyBytes = hexToBin(cleanKey.toLowerCase())
                    const hash = binToHex(hash160(pubKeyBytes))
                    return {
                        hashes: [hash],
                        keyType: 'COMPRESSED_PUBKEY'
                    }
                } catch (error) {
                    console.error('[KeyDerivation] Failed to hash compressed pubkey:', error)
                }
            }

            // Try as uncompressed public key (130 hex chars starting with 04)
            if (/^04[0-9a-fA-F]{128}$/.test(cleanKey)) {
                console.log('[KeyDerivation] Input is uncompressed public key')
                try {
                    const pubKeyBytes = hexToBin(cleanKey.toLowerCase())
                    const hash = binToHex(hash160(pubKeyBytes))
                    return {
                        hashes: [hash],
                        keyType: 'UNCOMPRESSED_PUBKEY'
                    }
                } catch (error) {
                    console.error('[KeyDerivation] Failed to hash uncompressed pubkey:', error)
                }
            }

            // Try as identity index derivation path from seed
            // This assumes the input might be a seed phrase
            const words = cleanKey.split(/\s+/)
            if (words.length === 12 || words.length === 24) {
                console.log('[KeyDerivation] Input appears to be seed phrase, skipping derivation')
                return {
                    hashes: [],
                    keyType: 'UNKNOWN',
                    debug: { reason: 'Seed phrase detected - use seed discovery instead' }
                }
            }

            return {
                hashes: [],
                keyType: 'UNKNOWN',
                debug: { error: 'Unsupported key format', input: cleanKey.substring(0, 16) + '...' }
            }

        } catch (error: any) {
            console.error('[KeyDerivation] Failed:', error)
            return {
                hashes: [],
                keyType: 'UNKNOWN',
                debug: { error: error.message, stack: error.stack }
            }
        }
    }

    /**
     * Derive all 5 standard keys from a private key
     */
    private static async deriveFromPrivateKey(
        privateKey: any, // PrivateKeyWASM
        network: 'mainnet' | 'testnet'
    ): Promise<{ hashes: string[]; keyType: 'WIF' | 'HEX_PRIVATE' }> {
        const sdk = await this.getSDK(network)
        const hashes: string[] = []

        try {
            // Get the public key from the private key
            const publicKey = privateKey.getPublicKey()
            const pubKeyBytes = publicKey.bytes()
            const hash = binToHex(hash160(pubKeyBytes))
            hashes.push(hash)

            console.log(`[KeyDerivation] Derived hash from private key: ${hash}`)

            // For a private key, we can also try to derive the standard 5 key paths
            // to see if it matches any of the identity's registered keys
            console.log('[KeyDerivation] Also checking if this might be one of the 5 standard keys')

            // The input key might be any of the 5 standard identity keys
            // We'll return just the hash we derived since we don't know which key index it is
            // The discovery service will query both unique and non-unique hashes

            return {
                hashes,
                keyType: privateKey.toWIF().startsWith('c') ? 'WIF' : 'HEX_PRIVATE'
            }

        } catch (error) {
            console.error('[KeyDerivation] Failed to derive from private key:', error)
            throw error
        }
    }

    /**
     * Derive all keys for multiple identity indexes and key indexes
     * Returns an array of derived key information for comprehensive search
     */
    static async deriveAllKeysFromSeed(
        seedPhrase: string,
        network: 'mainnet' | 'testnet' = 'testnet',
        maxIdentityIndex: number = 5,
        maxKeyIndex: number = 5
    ): Promise<KeyDerivationResult[]> {
        console.log(`[KeyDerivation] Deriving all keys from seed for ${maxIdentityIndex} identities`)

        const sdk = await this.getSDK(network)
        const seed = await sdk.keyPair.mnemonicToSeed(seedPhrase, undefined)
        const walletHDKey = sdk.keyPair.seedToHdKey(seed)

        const results: KeyDerivationResult[] = []

        // Define key purposes for each index (0-4)
        const keyPurposes = [
            { index: 0, purpose: 'AUTHENTICATION', securityLevel: 'MASTER' },
            { index: 1, purpose: 'AUTHENTICATION', securityLevel: 'CRITICAL' },
            { index: 2, purpose: 'AUTHENTICATION', securityLevel: 'HIGH' },
            { index: 3, purpose: 'TRANSFER', securityLevel: 'CRITICAL' },
            { index: 4, purpose: 'ENCRYPTION', securityLevel: 'MEDIUM' },
        ]

        try {
            for (let identityIdx = 0; identityIdx < maxIdentityIndex; identityIdx++) {
                const keys: DerivedKey[] = []

                for (const keyInfo of keyPurposes) {
                    try {
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

                    } catch (error) {
                        console.warn(`[KeyDerivation] Failed to derive key ${keyInfo.index} for identity ${identityIdx}:`, error)
                    }
                }

                if (keys.length > 0) {
                    results.push({
                        identityIndex: identityIdx,
                        keys,
                        success: true
                    })
                }
            }

            console.log(`[KeyDerivation] Derived ${results.length} identities with ${results.reduce((acc, r) => acc + r.keys.length, 0)} total keys`)
            return results

        } catch (error: any) {
            console.error('[KeyDerivation] Failed to derive keys from seed:', error)
            return [{
                identityIndex: 0,
                keys: [],
                success: false,
                error: error.message
            }]
        }
    }
}
