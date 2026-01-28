// src/services/identity/keyDerivation.service.ts

import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKeyWASM } from 'pshenmic-dpp'
// @ts-ignore
import { binToHex, hexToBin } from '@evonext/utils'

import { hash160 } from '@/services/crypto'

import type { DerivedKey, KeyDerivationResult } from '@/types'

export type KeyType = 'WIF' | 'HEX_PRIVATE' | 'COMPRESSED_PUBKEY' | 'UNCOMPRESSED_PUBKEY' | 'UNKNOWN';

export interface DerivationResult {
    hashes: string[];
    keyType: KeyType;
    debug?: {
        error?: string;
        input?: string;
        reason?: string;
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
            } catch (error) {
                throw new Error(`Failed to initialize SDK: ${error}`)
            }
        }
        return this.sdkInstances.get(key)!
    }

    static detectKeyFormat(keyInput: string): { format: KeyType; description: string } {
        const cleanKey = keyInput.trim()
        if (/^[cKL98yX7][0-9A-Za-z]{50,52}$/.test(cleanKey)) {
            return { format: 'WIF', description: 'Private key in Wallet Import Format (WIF).' }
        }
        if (/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
            return { format: 'HEX_PRIVATE', description: '64-character hexadecimal private key.' }
        }
        if (/^0[23][0-9a-fA-F]{64}$/.test(cleanKey)) {
            return { format: 'COMPRESSED_PUBKEY', description: '66-character compressed public key.' }
        }
        if (/^04[0-9a-fA-F]{128}$/.test(cleanKey)) {
            return { format: 'UNCOMPRESSED_PUBKEY', description: '130-character uncompressed public key.' }
        }
        const words = cleanKey.split(/\s+/)
        if (words.length === 12 || words.length === 24) {
            return { format: 'UNKNOWN', description: 'Seed phrase detected.' }
        }
        return { format: 'UNKNOWN', description: 'Unknown or unsupported key format.' }
    }

    static async deriveAllPossibleHashes(keyInput: string, network: 'mainnet' | 'testnet' = 'testnet'): Promise<DerivationResult> {
        try {
            const cleanKey = keyInput.trim()
            const keyFormat = this.detectKeyFormat(cleanKey)

            if (keyFormat.format === 'UNKNOWN') {
                return { hashes: [], keyType: 'UNKNOWN', debug: { reason: 'Unknown format', input: cleanKey.substring(0, 10) } }
            }

            let hashes: string[] = []

            if (keyFormat.format === 'WIF') {
                const pk = PrivateKeyWASM.fromWIF(cleanKey)
                hashes = [binToHex(hash160(pk.getPublicKey().bytes()))]
            } else if (keyFormat.format === 'HEX_PRIVATE') {
                const pk = PrivateKeyWASM.fromHex(cleanKey.toLowerCase(), network)
                hashes = [binToHex(hash160(pk.getPublicKey().bytes()))]
            } else if (keyFormat.format.includes('PUBKEY')) {
                const bytes = hexToBin(cleanKey.toLowerCase())
                hashes = [binToHex(hash160(bytes))]
            }

            return { hashes, keyType: keyFormat.format, debug: { input: 'REDACTED' } }
        } catch (error: any) {
            return { hashes: [], keyType: 'UNKNOWN', debug: { error: error.message } }
        }
    }

    static derivePrivateKeyFromWIF(wif: string): PrivateKeyWASM {
        try {
            const pk = PrivateKeyWASM.fromWIF(wif)
            // Verify the private key
            const pubKey = pk.getPublicKey()
            const pubKeyBytes = pubKey.bytes()
            const pubKeyHash = binToHex(hash160(pubKeyBytes))

            console.log(`[KeyDerivation] Generated PrivateKeyWASM from WIF`)
            console.log(`   Public key: ${binToHex(pubKeyBytes).substring(0, 16)}...`)
            console.log(`   Public key hash: ${pubKeyHash.substring(0, 16)}...`)

            return pk
        } catch (error: any) {
            throw new Error(`Failed to derive private key from WIF: ${error.message}`)
        }
    }

    static async deriveAllKeysFromSeed(
        seedPhrase: string,
        network: 'mainnet' | 'testnet' = 'testnet',
        maxIdentityIndex: number = 3,
        maxKeyIndex: number = 5
    ): Promise<KeyDerivationResult[]> {
        console.log(`[KeyDerivation] Deriving keys from seed for ${maxIdentityIndex} identities`)

        const words = seedPhrase.trim().split(/\s+/)
        if (words.length !== 12 && words.length !== 24) {
            throw new Error('Invalid seed phrase length')
        }

        try {
            const sdk = await this.getSDK(network)

            // Create seed from mnemonic
            const seed = await sdk.keyPair.mnemonicToSeed(seedPhrase, undefined)

            // Create wallet HD key from seed using the ACTUAL method
            const walletHDKey = sdk.keyPair.seedToHdKey(seed)

            const results: KeyDerivationResult[] = []

            const keyPurposes = [
                { index: 0, purpose: 'AUTHENTICATION', securityLevel: 'MASTER' },
                { index: 1, purpose: 'AUTHENTICATION', securityLevel: 'CRITICAL' },
                { index: 2, purpose: 'AUTHENTICATION', securityLevel: 'HIGH' },
                { index: 3, purpose: 'TRANSFER', securityLevel: 'CRITICAL' },
                { index: 4, purpose: 'ENCRYPTION', securityLevel: 'MEDIUM' },
            ]

            for (let identityIdx = 0; identityIdx < maxIdentityIndex; identityIdx++) {
                const keys: DerivedKey[] = []

                for (const keyInfo of keyPurposes) {
                    if (keyInfo.index >= maxKeyIndex) break

                    try {
                        // Using deriveIdentityPrivateKey - the ACTUAL method that exists
                        const hdKey = sdk.keyPair.deriveIdentityPrivateKey(
                            walletHDKey,
                            identityIdx,
                            keyInfo.index,
                            network
                        )

                        // Extract private and public keys as Uint8Arrays
                        const privateKeyBuffer = hdKey.privateKey
                        const publicKeyBuffer = hdKey.publicKey

                        // Create PrivateKeyWASM from the private key bytes
                        const privateKey = PrivateKeyWASM.fromHex(binToHex(privateKeyBuffer), network)

                        // Calculate public key hash
                        const publicKeyHash = binToHex(hash160(publicKeyBuffer as Uint8Array))

                        keys.push({
                            keyIndex: keyInfo.index,
                            purpose: keyInfo.purpose,
                            securityLevel: keyInfo.securityLevel,
                            privateKey,
                            publicKey: binToHex(publicKeyBuffer),
                            publicKeyHash,
                            path: `m/9'/${network === 'mainnet' ? "5'" : "1'"}/5'/0'/0'/${identityIdx}'/${keyInfo.index}'`
                        })

                        console.log(`[KeyDerivation] Derived key: identity=${identityIdx}, key=${keyInfo.index}, hash=${publicKeyHash.substring(0, 16)}...`)

                    } catch (error) {
                        console.warn(`[KeyDerivation] Failed key ${keyInfo.index} identity ${identityIdx}:`, error)
                    }
                }

                results.push({
                    identityIndex: identityIdx,
                    keys,
                    success: keys.length > 0
                })

                console.log(`[KeyDerivation] Completed identity ${identityIdx} with ${keys.length} keys`)
            }

            return results

        } catch (error: any) {
            throw new Error(`Failed to derive keys: ${error.message}`)
        }
    }

    static async getPrivateKeyWASM(
        source: string,
        network: 'mainnet' | 'testnet' = 'testnet',
        identityIndex: number = 0,
        keyIndex: number = 0
    ): Promise<{ privateKey: PrivateKeyWASM; sourceType: 'WIF' | 'MNEMONIC' | 'HEX_PRIVATE' }> {
        const format = this.detectKeyFormat(source)

        if (format.format === 'WIF') {
            // Direct WIF instantiation
            const privateKey = this.derivePrivateKeyFromWIF(source)
            return { privateKey, sourceType: 'WIF' }
        }
        else if (format.format === 'UNKNOWN' && (source.split(/\s+/).length === 12 || source.split(/\s+/).length === 24)) {
            // Mnemonic phrase - derive using deriveIdentityPrivateKey
            const sdk = await this.getSDK(network)

            // Create seed from mnemonic
            const seed = await sdk.keyPair.mnemonicToSeed(source, undefined)

            // Create wallet HD key from seed
            const walletHDKey = sdk.keyPair.seedToHdKey(seed)

            // Derive identity private key
            const hdKey = sdk.keyPair.deriveIdentityPrivateKey(
                walletHDKey,
                identityIndex,
                keyIndex,
                network
            )

            const privateKeyBuffer = hdKey.privateKey
            const privateKey = PrivateKeyWASM.fromHex(binToHex(privateKeyBuffer), network)
            return { privateKey, sourceType: 'MNEMONIC' }
        }
        else if (format.format === 'HEX_PRIVATE') {
            // Hex private key
            const privateKey = PrivateKeyWASM.fromHex(source.toLowerCase(), network)
            return { privateKey, sourceType: 'HEX_PRIVATE' }
        }
        else {
            throw new Error(`Unsupported key format: ${format.description}`)
        }
    }

    static cleanup() {
        this.sdkInstances.clear()
    }
}

export const detectKeyFormat = KeyDerivationService.detectKeyFormat
export const deriveAllPossibleHashes = KeyDerivationService.deriveAllPossibleHashes
export const deriveAllKeysFromSeed = KeyDerivationService.deriveAllKeysFromSeed
export const derivePrivateKeyFromWIF = KeyDerivationService.derivePrivateKeyFromWIF
export const getPrivateKeyWASM = KeyDerivationService.getPrivateKeyWASM
