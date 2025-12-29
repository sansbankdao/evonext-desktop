// src/services/identityDiscovery.service.ts

import { invoke } from '@tauri-apps/api/core'
import { log } from '@/utils/env'

export interface DiscoveredIdentity {
    identityId: string
    balance: string
    revision: string
    publicKeys?: Array<{
        purpose: string;
        securityLevel: string;
        keyType: string;
        data: string;
        dataB64: string;
        readOnly: boolean;
    }>
    dpnsUsername?: string
}

export interface IdentityLookupResult {
    success: boolean
    identity?: DiscoveredIdentity
    error?: string
}

/**
 * Service for discovering Dash Platform identities from private keys or public key hashes.
 * This service queries the DAPI to find identities associated with provided keys.
 */
export class IdentityDiscoveryService {
    /**
     * Get identity by public key hash (unique lookup)
     * This method is used when we know the public key hash and want to find the identity
     */
    static async getIdentityByPublicKeyHash(
        publicKeyHash: string,
        network: 'mainnet' | 'testnet'
    ): Promise<IdentityLookupResult> {
        try {
            log('info', `Looking up identity for public key hash: ${publicKeyHash} on ${network}`)
            const result = await invoke<any>('get_identity_by_public_key_hash', {
                params: [publicKeyHash],
                network
            })

            if (result?.success && result?.result?.identityId) {
                log('info', `Found identity via unique lookup: ${result.result.identityId}`)
                return {
                    success: true,
                    identity: {
                        identityId: result.result.identityId,
                        balance: result.result.balance || '0',
                        revision: result.result.revision || '0',
                        publicKeys: result.result.publicKeys || [],
                        dpnsUsername: result.result.dpnsUsername
                    }
                }
            }

            return {
                success: false,
                error: 'No identity found for this public key hash'
            }
        } catch (error: any) {
            log('error', 'Failed to get identity by public key hash:', error)
            return {
                success: false,
                error: `Lookup failed: ${error.message || 'Unknown error'}`
            }
        }
    }

    /**
     * Get identity by non-unique public key hash
     * This method is used when there might be multiple identities associated with the same key
     */
    static async getIdentityByNonUniquePublicKeyHash(
        publicKeyHash: string,
        network: 'mainnet' | 'testnet'
    ): Promise<IdentityLookupResult> {
        try {
            log('info', `Looking up identity for non-unique public key hash: ${publicKeyHash} on ${network}`)
            const result = await invoke<any>('get_identity_by_non_unique_public_key_hash', {
                params: [publicKeyHash],
                network
            })

            if (result?.success && result?.result?.identityId) {
                log('info', `Found identity via non-unique lookup: ${result.result.identityId}`)
                return {
                    success: true,
                    identity: {
                        identityId: result.result.identityId,
                        balance: result.result.balance || '0',
                        revision: result.result.revision || '0',
                        publicKeys: result.result.publicKeys || [],
                        dpnsUsername: result.result.dpnsUsername
                    }
                }
            }

            return {
                success: false,
                error: 'No identity found for this public key hash'
            }
        } catch (error: any) {
            log('error', 'Failed to get identity by non-unique public key hash:', error)
            return {
                success: false,
                error: `Lookup failed: ${error.message || 'Unknown error'}`
            }
        }
    }

    /**
     * Discover identity from private keys
     * Steps:
     * 1. Convert private keys to public keys
     * 2. Hash the public keys
     * 3. Try to find identity using multiple lookup methods
     */
    static async discoverIdentityFromKeys(
        authKey: string,
        transferKey: string,
        encryptionKey: string,
        network: 'mainnet' | 'testnet'
    ): Promise<IdentityLookupResult> {
        try {
            // Try auth key first
            if (authKey.trim()) {
                const publicKeyHash = await this.derivePublicKeyHashFromPrivateKey(authKey)

                if (publicKeyHash) {
                    log('info', `Trying to find identity for auth key hash: ${publicKeyHash}`)
                    // Try unique lookup first
                    const uniqueResult = await this.getIdentityByPublicKeyHash(publicKeyHash, network)

                    if (uniqueResult.success && uniqueResult.identity) {
                        return uniqueResult
                    }

                    // Try non-unique lookup as fallback
                    const nonUniqueResult = await this.getIdentityByNonUniquePublicKeyHash(publicKeyHash, network)

                    if (nonUniqueResult.success && nonUniqueResult.identity) {
                        return nonUniqueResult
                    }
                }
            }

            // Try transfer key next
            if (transferKey.trim()) {
                const publicKeyHash = await this.derivePublicKeyHashFromPrivateKey(transferKey)

                if (publicKeyHash) {
                    log('info', `Trying to find identity for transfer key hash: ${publicKeyHash}`)
                    const uniqueResult = await this.getIdentityByPublicKeyHash(publicKeyHash, network)

                    if (uniqueResult.success && uniqueResult.identity) {
                        return uniqueResult
                    }

                    const nonUniqueResult = await this.getIdentityByNonUniquePublicKeyHash(publicKeyHash, network)

                    if (nonUniqueResult.success && nonUniqueResult.identity) {
                        return nonUniqueResult
                    }
                }
            }

            // Try encryption key last
            if (encryptionKey.trim()) {
                const publicKeyHash = await this.derivePublicKeyHashFromPrivateKey(encryptionKey)

                if (publicKeyHash) {
                    log('info', `Trying to find identity for encryption key hash: ${publicKeyHash}`)
                    const uniqueResult = await this.getIdentityByPublicKeyHash(publicKeyHash, network)

                    if (uniqueResult.success && uniqueResult.identity) {
                        return uniqueResult
                    }

                    const nonUniqueResult = await this.getIdentityByNonUniquePublicKeyHash(publicKeyHash, network)

                    if (nonUniqueResult.success && nonUniqueResult.identity) {
                        return nonUniqueResult
                    }
                }
            }

            return {
                success: false,
                error: 'No identity found for any of the provided keys'
            }
        } catch (error: any) {
            log('error', 'Failed to discover identity from keys:', error)
            return {
                success: false,
                error: `Discovery failed: ${error.message || 'Unknown error'}`
            }
        }
    }

    /**
     * Derive public key hash from a private key (WIF or HEX format)
     * TODO: Implement actual crypto derivation using @evonext/crypto or similar
     */
    static async derivePublicKeyHashFromPrivateKey(privateKey: string): Promise<string | null> {
        try {
            // Remove whitespace
            const cleanKey = privateKey.trim()

            // Check if it's WIF format (starts with 'c', 'K', or 'L')
            if (/^[cKL][0-9A-Za-z]{50,}$/.test(cleanKey)) {
                // WIF format - decode to get private key bytes
                return await this.deriveFromWIF(cleanKey)
            }

            // Check if it's HEX format (64 characters for private key)
            if (/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
                // HEX format - derive public key from private key
                return await this.deriveFromHex(cleanKey)
            }
            log('warn', 'Unsupported private key format. Must be WIF or 64-char HEX.')

            return null
        } catch (error) {
            log('error', 'Failed to derive public key hash from private key:', error)
            return null
        }
    }

    /**
     * Derive public key hash from WIF format
     */
    private static async deriveFromWIF(wif: string): Promise<string | null> {
        try {
            // TODO: Implement actual WIF decoding and public key derivation
            // For now, using a placeholder that would be implemented with real crypto
            log('info', `Deriving from WIF: ${wif.substring(0, 8)}...`)
            // This is where you would:
            // 1. Decode WIF to get private key bytes
            // 2. Derive public key from private key using secp256k1
            // 3. Hash the public key using RIPEMD160(SHA256(publicKey))
            // 4. Return the hash as hex string
            // Placeholder: Return null until crypto is implemented
            return null
        } catch (error) {
            log('error', 'Failed to derive from WIF:', error)
            return null
        }
    }

    /**
     * Derive public key hash from HEX format
     */
    private static async deriveFromHex(hexKey: string): Promise<string | null> {
        try {
            // TODO: Implement actual crypto derivation
            log('info', `Deriving from HEX: ${hexKey.substring(0, 8)}...`)
            // This is where you would:
            // 1. Convert hex string to bytes
            // 2. Derive public key from private key bytes using secp256k1
            // 3. Hash the public key using RIPEMD160(SHA256(publicKey))
            // 4. Return the hash as hex string
            // Placeholder: Return null until crypto is implemented
            return null
        } catch (error) {
            log('error', 'Failed to derive from HEX:', error)
            return null
        }
    }

    /**
     * Get DPNS username for an identity ID
     */
    static async getDPNSUsername(
        identityId: string,
        network: 'mainnet' | 'testnet'
    ): Promise<string | null> {
        try {
            const response = await fetch('https://dapi.falcon.dash.org/v0/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    method: 'get_dpns_username',
                    params: [identityId],
                    network,
                }),
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const result = await response.json()

            if (result.success && (result.result || result.data || result.username)) {
                return result.result || result.data || result.username
            }
            return null
        } catch (error) {
            log('error', 'Failed to get DPNS username:', error)
            return null
        }
    }

    /**
     * Attempt to discover an identity from all available keys
     * and include DPNS username if available
     */
    static async discoverIdentityWithDPNS(
        authKey: string,
        transferKey: string,
        encryptionKey: string,
        network: 'mainnet' | 'testnet'
    ): Promise<IdentityLookupResult> {
        const result = await this.discoverIdentityFromKeys(authKey, transferKey, encryptionKey, network)

        if (result.success && result.identity) {
            // Try to get DPNS username
            const dpnsUsername = await this.getDPNSUsername(result.identity.identityId, network)
            if (dpnsUsername) {
                result.identity.dpnsUsername = dpnsUsername
            }
        }

        return result
    }
}
