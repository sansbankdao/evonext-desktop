// src/services/identity/keyDerivation.service.ts
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKeyWASM } from 'pshenmic-dpp'
// @ts-ignore
import { hash160 } from '@evonext/crypto'
// @ts-ignore
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

    static async deriveAllKeysFromSeed(
        seedPhrase: string,
        network: 'mainnet' | 'testnet' = 'testnet',
        maxIdentityIndex: number = 3, // Reduced to 3
        maxKeyIndex: number = 5
    ): Promise<KeyDerivationResult[]> {
        console.log(`[KeyDerivation] Deriving keys from seed for ${maxIdentityIndex} identities`)

        const words = seedPhrase.trim().split(/\s+/)
        if (words.length !== 12 && words.length !== 24) throw new Error('Invalid seed phrase length')

        try {
            const sdk = await this.getSDK(network)
            const seed = await sdk.keyPair.mnemonicToSeed(seedPhrase, undefined)
            // Get the Master HD Key
            const walletHDKey = sdk.keyPair.seedToHdKey(seed)

            const results: KeyDerivationResult[] = []

            const keyPurposes = [
                { index: 0, purpose: 'AUTHENTICATION', securityLevel: 'MASTER' },
                { index: 1, purpose: 'AUTHENTICATION', securityLevel: 'CRITICAL' },
                { index: 2, purpose: 'AUTHENTICATION', securityLevel: 'HIGH' },
                { index: 3, purpose: 'TRANSFER', securityLevel: 'CRITICAL' },
                { index: 4, purpose: 'ENCRYPTION', securityLevel: 'MEDIUM' },
            ]

            // Coin type: 5' for Mainnet, 1' for Testnet
            const coinType = network === 'mainnet' ? "5'" : "1'"

            for (let identityIdx = 0; identityIdx < maxIdentityIndex; identityIdx++) {
                const keys: DerivedKey[] = []

                for (const keyInfo of keyPurposes) {
                    if (keyInfo.index >= maxKeyIndex) break

                    try {
                        // MANUAL DERIVATION PATH
                        // Structure: m/9'/<coin_type>'/5'/0'/0'/<identity_index>'/<key_index>'
                        // NOTE: All indices are hardened as requested.
                        const path = `m/9'/${coinType}/5'/0'/0'/${identityIdx}'/${keyInfo.index}'`

                        // Derive the specific child key
                        const childKey = walletHDKey.derive(path)

                        // Extract private key buffer (Bitcore HDPrivateKey.privateKey -> PrivateKey -> .toBuffer())
                        const privateKeyBuffer = childKey.privateKey.toBuffer()

                        const privateKey = PrivateKeyWASM.fromHex(binToHex(privateKeyBuffer), network)
                        const pubKeyBytes = privateKey.getPublicKey().bytes()
                        const publicKeyHash = binToHex(hash160(pubKeyBytes))

                        keys.push({
                            keyIndex: keyInfo.index,
                            purpose: keyInfo.purpose,
                            securityLevel: keyInfo.securityLevel,
                            privateKey,
                            publicKey: binToHex(pubKeyBytes),
                            publicKeyHash,
                            path
                        })

                    } catch (error) {
                        console.warn(`[KeyDerivation] Failed key ${keyInfo.index} idx ${identityIdx}:`, error)
                    }
                }

                results.push({
                    identityIndex: identityIdx,
                    keys,
                    success: keys.length > 0
                })
            }

            return results

        } catch (error: any) {
            throw new Error(`Failed to derive keys: ${error.message}`)
        }
    }

    static cleanup() {
        this.sdkInstances.clear()
    }
}

export const detectKeyFormat = KeyDerivationService.detectKeyFormat
export const deriveAllPossibleHashes = KeyDerivationService.deriveAllPossibleHashes
export const deriveAllKeysFromSeed = KeyDerivationService.deriveAllKeysFromSeed
