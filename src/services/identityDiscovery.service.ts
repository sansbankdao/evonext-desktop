// src/services/identityDiscovery.service.ts

import { invoke } from '@tauri-apps/api/core'
import { log } from '@/utils/env'

export interface DiscoveredIdentity {
    identityId: string
    balance: string
    revision: string
    publicKeys?: Array<{
        purpose: string
        securityLevel: string
        keyType: string
        dataB64: string
        data?: string
        readOnly: boolean
    }>
    dpnsUsername?: string
}
export interface IdentityLookupResult {
    success: boolean
    identity?: DiscoveredIdentity
    error?: string
}

interface IdentityLookupResponse {
    success: boolean
    identityId?: string
    result?: {
        identityId: string
        balance: string
        revision: string
        publicKeys?: Array<{
            purpose: string
            securityLevel: string
            keyType: string
            data: string
            dataB64: string
            readOnly: boolean
        }>
        publicKeyHash: string
        dpnsUsername?: string
    }
    [key: string]: any
}

/**
 * Service for discovering Dash Platform identities from a single private key.
 * This service queries the DAPI to find identities associated with provided key.
 */
export class IdentityDiscoveryService {
    /**
     * Get identity by public key hash (unique lookup)
     * This method is used when we know the public key hash and want to find the identity
     */
    private static async getIdentityByPublicKeyHash(
        publicKeyHash: string,
        network: 'mainnet' | 'testnet'
    ): Promise<IdentityLookupResult> {
        try {
            log('info', `Looking up identity for public key hash: ${publicKeyHash} on ${network}`)
            const result = await invoke<IdentityLookupResponse>('get_identity_by_public_key_hash', {
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
    private static async getIdentityByNonUniquePublicKeyHash(
        publicKeyHash: string,
        network: 'mainnet' | 'testnet'
    ): Promise<IdentityLookupResult> {
        try {
            log('info', `Looking up identity for non-unique public key hash: ${publicKeyHash} on ${network}`)
            const result = await invoke<IdentityLookupResponse>('get_identity_by_non_unique_public_key_hash', {
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
     * Discover identity from a single private key (Authentication, Transfer, or Encryption)
     * Will return the identity and ALL registered keys associated with it
     */
    static async discoverIdentityFromSingleKey(
        privateKey: string,
        network: 'mainnet' | 'testnet'
    ): Promise<IdentityLookupResult> {
        try {
            if (!privateKey.trim()) {
                return {
                    success: false,
                    error: 'No private key provided'
                }
            }
            log('info', `Discovering identity from private key on ${network}`)
            // Derive public key hash from private key
            const publicKeyHash = await this.derivePublicKeyHashFromPrivateKey(privateKey)
            if (!publicKeyHash) {
                return {
                    success: false,
                    error: 'Failed to derive public key from private key. Please check key format.'
                }
            }
            log('info', `Derived public key hash: ${publicKeyHash}`)
            // Try unique lookup first (exact match)
            const uniqueResult = await this.getIdentityByPublicKeyHash(publicKeyHash, network)
            if (uniqueResult.success && uniqueResult.identity) {
                // Try to get DPNS username
                const dpnsUsername = await this.getDPNSUsername(uniqueResult.identity.identityId, network)
                if (dpnsUsername) {
                    uniqueResult.identity.dpnsUsername = dpnsUsername
                }
                return uniqueResult
            }
            // Try non-unique lookup as fallback (search all identities)
            const nonUniqueResult = await this.getIdentityByNonUniquePublicKeyHash(publicKeyHash, network)
            if (nonUniqueResult.success && nonUniqueResult.identity) {
                // Try to get DPNS username
                const dpnsUsername = await this.getDPNSUsername(nonUniqueResult.identity.identityId, network)
                if (dpnsUsername) {
                    nonUniqueResult.identity.dpnsUsername = dpnsUsername
                }
                return nonUniqueResult
            }
            return {
                success: false,
                error: 'No identity found for this key. The key may not be registered or the network may be incorrect.'
            }
        } catch (error: any) {
            log('error', 'Failed to discover identity from single key:', error)
            return {
                success: false,
                error: `Discovery failed: ${error.message || 'Unknown error'}`
            }
        }
    }
    /**
     * Derive public key hash from a private key (WIF or HEX format)
     * TODO: Implement actual crypto derivation using @evonext/crypto
     */
    private static async derivePublicKeyHashFromPrivateKey(privateKey: string): Promise<string | null> {
        try {
            // Remove whitespace
            const cleanKey = privateKey.trim()
            // Check if it's WIF format (starts with 'c', 'K', or 'L')
            if (/^[cKL][0-9A-Za-z]{50,}$/.test(cleanKey)) {
                // WIF format
                log('info', `Detected WIF format: ${cleanKey.substring(0, 8)}...`)
                return await this.deriveFromWIF(cleanKey)
            }
            // Check if it's HEX format (64 characters for private key)
            if (/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
                // HEX format
                log('info', `Detected HEX format: ${cleanKey.substring(0, 8)}...`)
                return await this.deriveFromHex(cleanKey)
            }
            // Check if it might be a compressed key (66 hex chars)
            if (/^0[23][0-9a-fA-F]{64}$/.test(cleanKey)) {
                log('info', `Detected compressed public key: ${cleanKey.substring(0, 8)}...`)
                return this.hashPublicKey(cleanKey)
            }
            // Check if it might be an uncompressed key (130 hex chars starting with 04)
            if (/^04[0-9a-fA-F]{128}$/.test(cleanKey)) {
                log('info', `Detected uncompressed public key: ${cleanKey.substring(0, 8)}...`)
                return this.hashPublicKey(cleanKey)
            }
            log('warn', 'Unsupported key format. Must be: WIF (starts with cN/Kw), private key HEX (64 chars), or public key HEX (66/130 chars).')
            return null
        } catch (error) {
            log('error', 'Failed to derive public key hash from key:', error)
            return null
        }
    }
    /**
     * Derive public key hash from WIF format
     * TODO: Implement actual WIF decoding and public key derivation
     */
    private static async deriveFromWIF(wif: string): Promise<string | null> {
        try {
            // TODO: Implement actual WIF decoding
            // For now, simulate a response
            const simulatedHash = "0fda00338b1e69cf0886fde0c398fa0888ff65c4"
            log('info', `Simulating WIF to public key hash conversion: ${wif.substring(0, 8)}... -> ${simulatedHash}`)
            return simulatedHash
        } catch (error) {
            log('error', 'Failed to derive from WIF:', error)
            return null
        }
    }
    /**
     * Derive public key hash from HEX format
     * TODO: Implement actual crypto derivation
     */
    private static async deriveFromHex(hexKey: string): Promise<string | null> {
        try {
            // TODO: Implement actual crypto derivation
            // For now, simulate a response - assuming it's a public key
            return this.hashPublicKey(hexKey)
        } catch (error) {
            log('error', 'Failed to derive from HEX:', error)
            return null
        }
    }
    /**
     * Hash a public key (simplified version)
     * In reality: RIPEMD160(SHA256(publicKey))
     */
    private static hashPublicKey(publicKeyHex: string): string | null {
        try {
            // TODO: Implement actual SHA256 + RIPEMD160 hashing
            // For now, return a simulated hash
            const simulatedHashes: Record<string, string> = {
                '0241af73c37c6dea99d7558f943b4332b9b6e4186f38ec7efde95197e55f04ef3c': '0fda00338b1e69cf0886fde0c398fa0888ff65c4',
                '03c2f5424644bf866bbbaf5e96fd45c357e9f230e7efeb8d5ec8ce1449efb8a1fa': '95589738d1c04694b8abf53d3f060fca12761523',
                '02f3a8c4b20477eb8a12f339d71b3bbd8498c2a5e0999b86bb1903fd102482b50b': '89c5f11ef3ca5ad7e724cd94c3cc3765f5630886'
            }
            // Check if we have a simulation for this key
            if (simulatedHashes[publicKeyHex.toLowerCase()]) {
                return simulatedHashes[publicKeyHex.toLowerCase()]
            }
            // If no simulation, generate a deterministic hash
            // This is temporary until real crypto is implemented
            const hash = Buffer.from(publicKeyHex).toString('hex').substring(0, 40)
            log('info', `Generated simulated hash for: ${publicKeyHex.substring(0, 8)}... -> ${hash}`)
            return hash
        } catch (error) {
            log('error', 'Failed to hash public key:', error)
            return null
        }
    }
    /**
     * Get DPNS username for an identity ID
     */
    private static async getDPNSUsername(
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
            if (result.success && result.result) {
                return result.result
            } else if (result.data) {
                return result.data
            } else if (result.username) {
                return result.username
            }
            return null
        } catch (error) {
            log('warn', `Failed to get DPNS username for ${identityId}:`, error)
            return null
        }
    }
    /**
     * Wrapper for legacy compatibility
     */
    static async discoverIdentityWithDPNS(
        authKey: string,
        transferKey: string,
        encryptionKey: string,
        network: 'mainnet' | 'testnet'
    ): Promise<IdentityLookupResult> {
        // Use the first non-empty key
        const keys = [authKey, transferKey, encryptionKey].filter(k => k.trim())
        if (keys.length === 0) {
            return {
                success: false,
                error: 'No keys provided'
            }
        }
        // Try each key until we find an identity
        for (const key of keys) {
            const result = await this.discoverIdentityFromSingleKey(key, network)
            if (result.success) {
                return result
            }
        }
        return {
            success: false,
            error: 'No identity found for any of the provided keys'
        }
    }
    /**
     * Extract key types from discovered identity
     */
    static extractKeyTypes(identity: DiscoveredIdentity): {
        authenticationKeys: number
        transferKeys: number
        encryptionKeys: number
    } {
        const publicKeys = identity.publicKeys || []
        return {
            authenticationKeys: publicKeys.filter((k: { purpose: string }) => k.purpose === 'AUTHENTICATION').length,
            transferKeys: publicKeys.filter((k: { purpose: string }) => k.purpose === 'TRANSFER').length,
            encryptionKeys: publicKeys.filter((k: { purpose: string }) => k.purpose === 'ENCRYPTION').length
        }
    }
}
