// src/services/identityDiscovery.service.ts

import { invoke } from '@tauri-apps/api/core'
import { log } from '@/utils/env'
import type { DiscoveredIdentity, IdentityLookupResult } from '@/types/identity'
import type { IdentityLookupResponse } from '@/types/lib.types'

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

            // FIXED: Pass network as top-level parameter, not inside params
            const result = await invoke<IdentityLookupResponse>('get_identity_by_public_key_hash', {
                publicKeyHash,
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

            // FIXED: Pass network as top-level parameter
            const result = await invoke<IdentityLookupResponse>('get_identity_by_non_unique_public_key_hash', {
                publicKeyHash,
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
     * Discover identity from any key (WIF, HEX, or public key format)
     * Automatically determines key type and returns the identity with all associated keys
     */
    static async discoverIdentityFromAnyKey(
        keyInput: string,
        network: 'mainnet' | 'testnet'
    ): Promise<{
        success: boolean
        identity?: DiscoveredIdentity
        detectedKeyType?: string
        associatedKeys?: Array<{
            purpose: string
            securityLevel: string
            keyType: string
            derivedFromInput: boolean
        }>
        error?: string
    }> {
        try {
            if (!keyInput.trim()) {
                return {
                    success: false,
                    detectedKeyType: 'unknown',
                    error: 'No key provided'
                }
            }

            log('info', `Discovering identity from key input on ${network}`)

            // Detect key format
            const keyInfo = this.detectKeyFormat(keyInput)
            log('info', `Detected key format: ${keyInfo.format}`)

            // Derive public key hash
            const publicKeyHash = await this.derivePublicKeyHashFromPrivateKey(keyInput)
            if (!publicKeyHash) {
                return {
                    success: false,
                    detectedKeyType: keyInfo.format,
                    error: 'Failed to derive public key from key. Please check key format.'
                }
            }

            log('info', `Derived public key hash: ${publicKeyHash}`)

            // Try unique lookup first (exact match)
            const uniqueResult = await this.getIdentityByPublicKeyHash(publicKeyHash, network)
            if (uniqueResult.success && uniqueResult.identity) {
                // Get DPNS username
                const dpnsUsername = await this.getDPNSUsername(uniqueResult.identity.identityId, network)
                if (dpnsUsername) {
                    uniqueResult.identity.dpnsUsername = dpnsUsername
                }

                // Extract key details
                const keyInfo = this.extractKeyInformation(uniqueResult.identity, publicKeyHash)

                return {
                    success: true,
                    identity: uniqueResult.identity,
                    detectedKeyType: keyInfo.type,
                    associatedKeys: keyInfo.associatedKeys
                }
            }

            // Try non-unique lookup as fallback
            const nonUniqueResult = await this.getIdentityByNonUniquePublicKeyHash(publicKeyHash, network)
            if (nonUniqueResult.success && nonUniqueResult.identity) {
                // Get DPNS username
                const dpnsUsername = await this.getDPNSUsername(nonUniqueResult.identity.identityId, network)
                if (dpnsUsername) {
                    nonUniqueResult.identity.dpnsUsername = dpnsUsername
                }

                // Extract key details
                const keyInfo = this.extractKeyInformation(nonUniqueResult.identity, publicKeyHash)

                return {
                    success: true,
                    identity: nonUniqueResult.identity,
                    detectedKeyType: keyInfo.type,
                    associatedKeys: keyInfo.associatedKeys
                }
            }

            return {
                success: false,
                detectedKeyType: keyInfo.format,
                error: 'No identity found for this key. The key may not be registered or the network may be incorrect.'
            }
        } catch (error: any) {
            log('error', 'Failed to discover identity from key:', error)
            return {
                success: false,
                detectedKeyType: 'unknown',
                error: `Discovery failed: ${error.message || 'Unknown error'}`
            }
        }
    }

    /**
     * Detect key format and provide user-friendly description
     */
    private static detectKeyFormat(keyInput: string): {
        format: string
        description: string
        icon: string
    } {
        const cleanKey = keyInput.trim()

        // Check WIF format (starts with 'c', 'K', or 'L')
        if (/^[cKL][0-9A-Za-z]{50,}$/.test(cleanKey)) {
            return {
                format: 'WIF (Wallet Import Format)',
                description: 'Private key in WIF format. Typically starts with "c" (testnet) or "K"/"L" (mainnet).',
                icon: 'LockClosedIcon'
            }
        }

        // Check HEX format (64 characters for private key)
        if (/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
            return {
                format: 'HEX Private Key',
                description: '64-character hexadecimal private key.',
                icon: 'KeyIcon'
            }
        }

        // Check compressed public key (66 hex chars)
        if (/^0[23][0-9a-fA-F]{64}$/.test(cleanKey)) {
            return {
                format: 'Compressed Public Key',
                description: '66-character compressed public key (starts with 02 or 03).',
                icon: 'IdentificationIcon'
            }
        }

        // Check uncompressed public key (130 hex chars)
        if (/^04[0-9a-fA-F]{128}$/.test(cleanKey)) {
            return {
                format: 'Uncompressed Public Key',
                description: '130-character uncompressed public key (starts with 04).',
                icon: 'IdentificationIcon'
            }
        }

        // Check for potential extended key (xpub/xprv)
        if (/^[tx][pbr]ub[a-km-zA-HJ-NP-Z1-9]{100,}$/.test(cleanKey)) {
            return {
                format: 'Extended Public/Private Key',
                description: 'Extended key format (xpub, xprv, tpub, tprv).',
                icon: 'DatabaseIcon'
            }
        }

        return {
            format: 'Unknown Format',
            description: 'Cannot determine key format. Please check input.',
            icon: 'QuestionMarkCircleIcon'
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
     * Extract detailed information about the found keys
     */
    private static extractKeyInformation(
        identity: DiscoveredIdentity,
        inputKeyHash: string
    ): {
        type: string
        associatedKeys: Array<{
            purpose: string
            securityLevel: string
            keyType: string
            derivedFromInput: boolean
        }>
    } {
        const publicKeys = identity.publicKeys || []
        let detectedKeyType = 'Unknown Key'
        const associatedKeys = []

        for (const key of publicKeys) {
            // Check if this key matches our input (by purpose or other heuristic)
            // TODO: Actually compare key hashes once we have proper crypto
            const matchesInput = false // Placeholder

            associatedKeys.push({
                purpose: this.getKeyPurposeDisplay(key.purpose),
                securityLevel: this.getSecurityLevelDisplay(key.securityLevel),
                keyType: key.keyType,
                derivedFromInput: matchesInput
            })

            // Determine key type based on purpose
            if (key.purpose === 'AUTHENTICATION') {
                detectedKeyType = 'Authentication Key'
            } else if (key.purpose === 'TRANSFER') {
                detectedKeyType = 'Transfer Key'
            } else if (key.purpose === 'ENCRYPTION') {
                detectedKeyType = 'Encryption Key'
            }
        }

        return {
            type: detectedKeyType,
            associatedKeys
        }
    }

    /**
     * Get user-friendly display for key purpose
     */
    private static getKeyPurposeDisplay(purpose: string): string {
        const purposeMap: Record<string, string> = {
            'AUTHENTICATION': 'Authentication',
            'TRANSFER': 'Transfer',
            'ENCRYPTION': 'Encryption',
            'KEY_MANAGEMENT': 'Key Management',
            'SIGNING': 'Signing',
            'MASTER': 'Master'
        }
        return purposeMap[purpose] || purpose
    }

    /**
     * Get user-friendly display for security level
     */
    private static getSecurityLevelDisplay(securityLevel: string): string {
        const levelMap: Record<string, string> = {
            'CRITICAL': 'Critical',
            'HIGH': 'High',
            'MEDIUM': 'Medium',
            'LOW': 'Low'
        }
        return levelMap[securityLevel] || securityLevel
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
     * @deprecated Use discoverIdentityFromAnyKey instead
     */
    static async discoverIdentityFromSingleKey(
        privateKey: string,
        network: 'mainnet' | 'testnet'
    ): Promise<IdentityLookupResult> {
        const result = await this.discoverIdentityFromAnyKey(privateKey, network)
        return {
            success: result.success,
            identity: result.identity,
            error: result.error
        }
    }

    /**
     * Wrapper for legacy compatibility
     * @deprecated Use discoverIdentityFromAnyKey instead
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
            const result = await this.discoverIdentityFromAnyKey(key, network)
            if (result.success) {
                return {
                    success: true,
                    identity: result.identity,
                    error: undefined
                }
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
