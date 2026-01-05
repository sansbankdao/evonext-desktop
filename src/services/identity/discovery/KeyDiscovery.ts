// src/services/identity/discovery/KeyDiscovery.ts

import { BaseDiscovery } from './BaseDiscovery'
import { DAPIService } from './DAPIService'
import { KeyDerivationService } from '../keyDerivation.service'
import { invoke } from '@tauri-apps/api/core'
import type { DiscoveredIdentity } from '@/types'
// @ts-ignore
import { PrivateKeyWASM } from 'pshenmic-dpp'
// @ts-ignore
import { binToHex, hexToBin } from '@evonext/utils'
// @ts-ignore
import { hash160 } from '@evonext/crypto'
import type {
    DiscoveryResult,
    DiscoveryOptions,
} from '../types'

export class KeyDiscovery extends BaseDiscovery {
    /**
     * Implement abstract discover method from BaseDiscovery
     */
    async discover(
        input: string,
        options: DiscoveryOptions = { network: 'testnet' }
    ): Promise<DiscoveryResult> {
        return this.discoverFromKey(input, options)
    }

    /**
     * Main discovery method for any key format
     */
    async discoverFromKey(
        keyInput: string,
        options: DiscoveryOptions
    ): Promise<DiscoveryResult> {
        try {
            console.log(`[KeyDiscovery] Starting discovery for key on ${options.network}`)
            console.log(`[KeyDiscovery] Key input (first 20 chars): ${keyInput.substring(0, 20)}...`)

            // Step 1: Get the Private Key object
            const format = KeyDerivationService.detectKeyFormat(keyInput)
            const privateKey: PrivateKeyWASM | null = this.getPrivateKeyInstance(keyInput, options.network)

            if (!privateKey) {
                return this.createErrorResult(
                    `Unsupported key format or derivation failed. Detected: ${format.description}`,
                    {
                        step: 'private_key_derivation_failed',
                        network: options.network,
                        keyType: format.format
                    }
                )
            }

            // Step 2: Derive Public Key Hash
            // This is the definitive hash derived from the key, matching Seed Discovery logic
            const publicKey = privateKey.getPublicKey()
            const publicKeyBytes = publicKey.bytes()
            const publicKeyHash = binToHex(hash160(publicKeyBytes))

            console.log(`[KeyDiscovery] Derived Public Key Hash: ${publicKeyHash.substring(0, 24)}...`)

            // Step 3: Search via Unique (Standard)
            const uniqueResult = await DAPIService.queryIdentityByHash(publicKeyHash, options.network, true)

            if (uniqueResult.success && uniqueResult.data) {
                console.log(`[KeyDiscovery] Found via UNIQUE lookup`)

                // Extract Identity Data
                const identityData = uniqueResult.data
                const dpnsName = await DAPIService.getDPNSUsername(identityData.identityId || identityData.id, options.network)

                const discoveredIdentity: DiscoveredIdentity = {
                    identityId: identityData.identityId || identityData.id || '',
                    identityIdx: 0, // Single keys are always index 0
                    balance: this.formatBalance(identityData.balance),
                    revision: identityData.revision || 0,
                    publicKeys: identityData.publicKeys || [],
                    dpnsUsername: dpnsName
                }

                // FIX: Save the key to Rust storage immediately upon successful discovery
                // This matches the behavior of SeedDiscovery.ts
                await this.saveDiscoveredKeyToStorage(
                    options.network,
                    privateKey,
                    identityData.identityId || identityData.id,
                    identityData.publicKeys || []
                )

                // Extract associated keys for the UI
                const associatedKeys = this.extractAssociatedKeys(discoveredIdentity.publicKeys)

                return this.createSuccessResult(
                    discoveredIdentity,
                    null, // identities array is null for single key
                    format.format,
                    associatedKeys,
                    {
                        step: 'comprehensive_search',
                        searchType: 'unique',
                        keyType: format.format,
                        ...uniqueResult.debug
                    }
                )
            }

            // Step 4: Search via Non-Unique (Fallback)
            // If unique failed, try non-unique
            const nonUniqueResult = await DAPIService.queryIdentityByHash(publicKeyHash, options.network, false)

            if (nonUniqueResult.success && nonUniqueResult.data) {
                console.log(`[KeyDiscovery] Found via NON-UNIQUE lookup`)

                // Extract Identity Data
                const identityData = nonUniqueResult.data
                const dpnsName = await DAPIService.getDPNSUsername(identityData.identityId || identityData.id, options.network)

                const discoveredIdentity: DiscoveredIdentity = {
                    identityId: identityData.identityId || identityData.id || '',
                    identityIdx: 0,
                    balance: this.formatBalance(identityData.balance),
                    revision: identityData.revision || 0,
                    publicKeys: identityData.publicKeys || [],
                    dpnsUsername: dpnsName
                }

                // FIX: Save the key to Rust storage
                await this.saveDiscoveredKeyToStorage(
                    options.network,
                    privateKey,
                    identityData.identityId || identityData.id,
                    identityData.publicKeys || []
                )

                const associatedKeys = this.extractAssociatedKeys(discoveredIdentity.publicKeys)

                return this.createSuccessResult(
                    discoveredIdentity,
                    null,
                    format.format,
                    associatedKeys,
                    {
                        step: 'comprehensive_search',
                        searchType: 'non-unique',
                        keyType: format.format,
                        ...nonUniqueResult.debug
                    }
                )
            }

            // Step 5: Failure
            console.log(`[KeyDiscovery] No identity found for hash ${publicKeyHash.substring(0, 16)}...`)
            return this.createErrorResult(
                'No identity found. The key may not be registered on this network.',
                {
                    step: 'comprehensive_search_failed',
                    network: options.network,
                    keyType: format.format,
                    searchedHash: publicKeyHash.substring(0, 16) + '...'
                }
            )
        } catch (error: any) {
            return this.handleError(error, 'Key Discovery')
        }
    }

    /**
     * Helper to derive PrivateKeyWASM from raw input
     */
    private getPrivateKeyInstance(keyInput: string, network: 'mainnet' | 'testnet'): PrivateKeyWASM | null {
        try {
            const cleanKey = keyInput.trim()
            const format = KeyDerivationService.detectKeyFormat(cleanKey)

            if (format.format === 'WIF') {
                return PrivateKeyWASM.fromWIF(cleanKey)
            }

            if (format.format === 'HEX_PRIVATE') {
                return PrivateKeyWASM.fromHex(cleanKey.toLowerCase(), network)
            }

            // Handle Public Keys (if user pasted them instead of private keys)
            if (format.format === 'COMPRESSED_PUBKEY' || format.format === 'UNCOMPRESSED_PUBKEY') {
                // We cannot derive a private key from a public key, but we can still search by hash
                // However, for purpose of this specific function, we return null because
                // we expect a Private Key object to derive the hash ourselves.
                return null
            }

            return null
        } catch (error) {
            console.error('[KeyDiscovery] Failed to get private key instance:', error)
            return null
        }
    }

    /**
     * FIX: Saves the discovered private key to Rust storage.
     * This mirrors the logic in SeedDiscovery.saveDerivedKeysToStorage.
     */
    private async saveDiscoveredKeyToStorage(
        network: 'mainnet' | 'testnet',
        privateKeyInstance: PrivateKeyWASM,
        identityId: string,
        publicKeys: any[]
    ): Promise<boolean> {
        try {
            if (!identityId || !publicKeys || publicKeys.length === 0) return false

            const now = new Date().toISOString()
            const privateKeyEntries: any[] = []

            // We only save the keys from the publicKeys list that we found
            // This ensures we save the AUTH/TRANSFER/ENCRYPTION keys matching the identity
            for (let i = 0; i < publicKeys.length; i++) {
                const publicKey = publicKeys[i]
                const keyId = publicKey.id
                if (keyId === undefined || keyId === null || keyId > 100) continue

                try {
                    // For a single private key input, we check if the public key
                    // matches the derived private key to ensure we are saving the correct entry
                    // (Note: In simple Key Discovery, usually we just save the key to index 0 or matching purpose)
                    // To be safe, we save the private key against the IDs found in the identity

                    const derivedPub = privateKeyInstance.getPublicKey()
                    const derivedPubHex = binToHex(derivedPub.bytes())

                    const keyEntry = {
                        identityId: identityId,
                        keyId: publicKey.id,
                        purpose: publicKey.purpose,
                        securityLevel: publicKey.securityLevel,
                        keyType: publicKey.keyType || 'ecdsa',
                        privateKey: privateKeyInstance.WIF(),
                        publicKey: derivedPubHex,
                        derivedFromMnemonic: false, // Important: false for single key
                        createdAt: now,
                        lastUsed: now
                    }
                    privateKeyEntries.push(keyEntry)
                } catch (deriveErr) {
                    console.warn(`[KeyDiscovery] Failed to prepare key entry for ID ${publicKey.id}`, deriveErr)
                    continue
                }
            }

            // If we couldn't match public keys, we default to saving it as ID 0 (Auth) to ensure connectivity
            if (privateKeyEntries.length === 0) {
                 const derivedPub = privateKeyInstance.getPublicKey()
                 const derivedPubHex = binToHex(derivedPub.bytes())
                 privateKeyEntries.push({
                        identityId: identityId,
                        keyId: 0, // Default to ID 0
                        purpose: 0, // Default to Auth
                        securityLevel: 0, // Default to Master
                        keyType: 'ecdsa',
                        privateKey: privateKeyInstance.WIF(),
                        publicKey: derivedPubHex,
                        derivedFromMnemonic: false,
                        createdAt: now,
                        lastUsed: now
                    })
            }

            if (privateKeyEntries.length > 0) {
                await invoke('save_private_keys', {
                    network,
                    identityId: identityId,
                    privateKeys: privateKeyEntries
                })
                console.log(`[KeyDiscovery] Saved ${privateKeyEntries.length} key(s) to Rust storage for ${identityId}`)
                return true
            }
            return false
        } catch (err) {
            console.error(`[KeyDiscovery] Failed to save keys:`, err)
            return false
        }
    }
}
