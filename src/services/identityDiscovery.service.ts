// src/services/identityDiscovery.service.ts
import { invoke } from '@tauri-apps/api/core'
import { log } from '@/utils/env'
import type { DiscoveredIdentity, IdentityLookupResult } from '@/types'
import type { IdentityLookupResponse, TauriCommandResponse } from '@/types'
export class IdentityDiscoveryService {
    /**
     * Get identity by public key hash (unique lookup)
     */
    private static async getIdentityByPublicKeyHash(
        publicKeyHash: string,
        network: 'mainnet' | 'testnet'
    ): Promise<IdentityLookupResult> {
        try {
            log('info', `[Discovery] Looking up identity for hash: ${publicKeyHash} on ${network}`)
            const result = await invoke<TauriCommandResponse<{ identityId: string; publicKeys: any[]; balance?: string; revision?: string; dpnsUsername?: string }>>(
                'get_identity_by_public_key_hash',
                { publicKeyHash, network }
            )
            if (result?.success && result?.result?.identityId) {
                log('info', `[Discovery] Found identity: ${result.result.identityId}`)
                return {
                    success: true,
                    identity: {
                        identityId: result.result.identityId,
                        balance: result.result.balance || '0',
                        revision: result.result.revision || '0',
                        publicKeys: result.result.publicKeys || [],
                        dpnsUsername: result.result.dpnsUsername
                    },
                    debug: {
                        step: 'get_identity_by_public_key_hash',
                        inputHash: publicKeyHash,
                        rawResult: result
                    }
                }
            }
            return {
                success: false,
                error: 'No identity found for this public key hash',
                debug: { step: 'get_identity_by_public_key_hash', inputHash: publicKeyHash }
            }
        } catch (error: any) {
            log('error', '[Discovery] Lookup failed:', error)
            return {
                success: false,
                error: `Lookup failed: ${error.message || 'Unknown error'}`,
                debug: { step: 'get_identity_by_public_key_hash', error: error?.message }
            }
        }
    }
    /**
     * Get identity by non-unique public key hash
     */
    private static async getIdentityByNonUniquePublicKeyHash(
        publicKeyHash: string,
        network: 'mainnet' | 'testnet'
    ): Promise<IdentityLookupResult> {
        try {
            log('info', `[Discovery] Looking up non-unique hash: ${publicKeyHash} on ${network}`)
            const result = await invoke<TauriCommandResponse<{ identityId: string; publicKeys: any[]; balance?: string; revision?: string; dpnsUsername?: string }>>(
                'get_identity_by_non_unique_public_key_hash',
                { publicKeyHash, network }
            )
            if (result?.success && result?.result?.identityId) {
                log('info', `[Discovery] Found identity (non-unique): ${result.result.identityId}`)
                return {
                    success: true,
                    identity: {
                        identityId: result.result.identityId,
                        balance: result.result.balance || '0',
                        revision: result.result.revision || '0',
                        publicKeys: result.result.publicKeys || [],
                        dpnsUsername: result.result.dpnsUsername
                    },
                    debug: {
                        step: 'get_identity_by_non_unique_public_key_hash',
                        inputHash: publicKeyHash,
                        rawResult: result
                    }
                }
            }
            return {
                success: false,
                error: 'No identity found for this public key hash',
                debug: { step: 'get_identity_by_non_unique_public_key_hash', inputHash: publicKeyHash }
            }
        } catch (error: any) {
            log('error', '[Discovery] Non-unique lookup failed:', error)
            return {
                success: false,
                error: `Lookup failed: ${error.message || 'Unknown error'}`,
                debug: { step: 'get_identity_by_non_unique_public_key_hash', error: error?.message }
            }
        }
    }
    /**
     * Get all identities for a seed phrase by trying sequential derivation
     */
    static async discoverIdentitiesFromSeed(
        seedPhrase: string,
        network: 'mainnet' | 'testnet'
    ): Promise<{
        success: boolean
        identities?: DiscoveredIdentity[]
        error?: string
        debug?: any
    }> {
        try {
            log('info', `[SeedDiscovery] Attempting to discover identities from seed on ${network}`)
            const result = await invoke<TauriCommandResponse<Array<{
                identityId: string
                publicKeys: any[]
                balance?: string
                revision?: string
                dpnsUsername?: string
            }>>>('get_identities_from_seed', { seedPhrase, network })
            if (result?.success && Array.isArray(result.result)) {
                const identities = result.result.map(item => ({
                    identityId: item.identityId,
                    balance: item.balance || '0',
                    revision: item.revision || '0',
                    publicKeys: item.publicKeys || [],
                    dpnsUsername: item.dpnsUsername
                }))
                log('info', `[SeedDiscovery] Found ${identities.length} identities from seed`)
                return {
                    success: true,
                    identities,
                    debug: {
                        step: 'get_identities_from_seed',
                        identitiesFound: identities.length
                    }
                }
            }
            return {
                success: false,
                error: result?.error || 'No identities found for the seed phrase',
                debug: { step: 'get_identities_from_seed', rawResult: result }
            }
        } catch (error: any) {
            log('error', '[SeedDiscovery] Failed:', error)
            return {
                success: false,
                error: `Failed to discover identities: ${error.message || 'Unknown error'}`,
                debug: { step: 'exception', error: error?.message }
            }
        }
    }
    /**
     * Discover identity from any key (WIF, HEX, or public key format)
     */
    static async discoverIdentityFromAnyKey(
        keyInput: string,
        network: 'mainnet' | 'testnet'
    ): Promise<{
        success: boolean
        identity?: DiscoveredIdentity
        detectedKeyType?: string
        associatedKeys?: Array<{ purpose: string; securityLevel: string; keyType: string; derivedFromInput: boolean }>
        error?: string
        debug?: any
    }> {
        try {
            if (!keyInput.trim()) {
                return {
                    success: false,
                    error: 'No key provided',
                    debug: { step: 'input_validation', reason: 'empty_key' }
                }
            }
            log('info', `[KeyDiscovery] Starting discovery for input: ${keyInput.substring(0, 8)}...`)
            // 1. Detect Format
            const keyInfo = this.detectKeyFormat(keyInput)
            log('info', `[KeyDiscovery] Detected format: ${keyInfo.format}`)
            // 2. Try direct backend lookup first (most efficient)
            log('info', `[KeyDiscovery] Attempting direct backend lookup`)
            const directResult = await invoke<TauriCommandResponse<{
                identityId: string
                publicKeys: any[]
                balance?: string
                revision?: string
                dpnsUsername?: string
            }>>('get_identity_by_private_key', { keyInput, network })
            if (directResult?.success && directResult?.result?.identityId) {
                log('info', `[KeyDiscovery] Direct lookup successful: ${directResult.result.identityId}`)
                // Get DPNS name
                const dpnsUsername = await this.getDPNSUsername(directResult.result.identityId, network)
                return {
                    success: true,
                    identity: {
                        identityId: directResult.result.identityId,
                        balance: directResult.result.balance || '0',
                        revision: directResult.result.revision || '0',
                        publicKeys: directResult.result.publicKeys || [],
                        dpnsUsername
                    },
                    detectedKeyType: keyInfo.format,
                    associatedKeys: this.extractAssociatedKeys(directResult.result.publicKeys || []),
                    debug: {
                        step: 'direct_backend_lookup',
                        input: keyInput.substring(0, 8) + '...',
                        rawResult: directResult
                    }
                }
            }
            // 3. Fallback to hash-based lookup
            log('info', `[KeyDiscovery] Direct lookup failed, attempting hash-based discovery`)
            const publicKeyHash = await this.derivePublicKeyHashFromPrivateKey(keyInput)
            if (!publicKeyHash) {
                return {
                    success: false,
                    detectedKeyType: keyInfo.format,
                    error: 'Failed to derive public key hash from key. Please check key format.',
                    debug: {
                        step: 'hash_derivation',
                        input: keyInput.substring(0, 8) + '...',
                        format: keyInfo.format,
                        directResult
                    }
                }
            }
            log('info', `[KeyDiscovery] Derived hash: ${publicKeyHash}`)
            // 4. Unique Lookup
            const uniqueResult = await this.getIdentityByPublicKeyHash(publicKeyHash, network)
            if (uniqueResult.success && uniqueResult.identity) {
                // Get DPNS
                const dpnsUsername = await this.getDPNSUsername(uniqueResult.identity.identityId, network)
                if (dpnsUsername) {
                    uniqueResult.identity.dpnsUsername = dpnsUsername
                }
                return {
                    success: true,
                    identity: uniqueResult.identity,
                    detectedKeyType: keyInfo.format,
                    associatedKeys: this.extractAssociatedKeys(uniqueResult.identity.publicKeys || []),
                    debug: uniqueResult.debug
                }
            }
            // 5. Fallback Non-Unique Lookup
            const nonUniqueResult = await this.getIdentityByNonUniquePublicKeyHash(publicKeyHash, network)
            if (nonUniqueResult.success && nonUniqueResult.identity) {
                const dpnsUsername = await this.getDPNSUsername(nonUniqueResult.identity.identityId, network)
                if (dpnsUsername) {
                    nonUniqueResult.identity.dpnsUsername = dpnsUsername
                }
                return {
                    success: true,
                    identity: nonUniqueResult.identity,
                    detectedKeyType: keyInfo.format,
                    associatedKeys: this.extractAssociatedKeys(nonUniqueResult.identity.publicKeys || []),
                    debug: nonUniqueResult.debug
                }
            }
            return {
                success: false,
                detectedKeyType: keyInfo.format,
                error: directResult?.error || 'No identity found for this key. The key may not be registered or network is incorrect.',
                debug: {
                    step: 'final_check',
                    hash: publicKeyHash,
                    directResult,
                    uniqueResult: uniqueResult.debug,
                    nonUniqueResult: nonUniqueResult.debug
                }
            }
        } catch (error: any) {
            log('error', '[KeyDiscovery] Failed:', error)
            return {
                success: false,
                error: `Discovery failed: ${error.message || 'Unknown error'}`,
                debug: { step: 'exception', error: error?.stack }
            }
        }
    }
    /**
     * Detect key format
     */
    private static detectKeyFormat(keyInput: string): {
        format: string
        description: string
        icon: string
    } {
        const cleanKey = keyInput.trim()
        if (/^[cKL][0-9A-Za-z]{50,}$/.test(cleanKey)) {
            return {
                format: 'WIF (Wallet Import Format)',
                description: 'Private key in WIF format. Typically starts with "c" (testnet) or "K"/"L" (mainnet).',
                icon: 'LockClosedIcon'
            }
        }
        if (/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
            return {
                format: 'HEX Private Key',
                description: '64-character hexadecimal private key.',
                icon: 'KeyIcon'
            }
        }
        if (/^0[23][0-9a-fA-F]{64}$/.test(cleanKey)) {
            return {
                format: 'Compressed Public Key',
                description: '66-character compressed public key (starts with 02 or 03).',
                icon: 'IdentificationIcon'
            }
        }
        if (/^04[0-9a-fA-F]{128}$/.test(cleanKey)) {
            return {
                format: 'Uncompressed Public Key',
                description: '130-character uncompressed public key (starts with 04).',
                icon: 'IdentificationIcon'
            }
        }
        return {
            format: 'Unknown Format',
            description: 'Cannot determine key format. Please check input.',
            icon: 'QuestionMarkCircleIcon'
        }
    }
    /**
     * Derive public key hash (Placeholder - should be implemented in backend)
     */
    private static async derivePublicKeyHashFromPrivateKey(privateKey: string): Promise<string | null> {
        try {
            const cleanKey = privateKey.trim()
            // This is a placeholder - actual derivation should happen in backend
            // For debugging, return a mock hash
            const mockHash = Buffer.from(cleanKey).toString('hex').substring(0, 40).padEnd(40, '0')
            log('warn', `[KeyDiscovery] Using mock hash: ${mockHash}`)
            return mockHash
        } catch (error) {
            log('error', 'Failed to derive public key hash from key:', error)
            return null
        }
    }
    /**
     * Extract associated keys information
     */
    private static extractAssociatedKeys(publicKeys: any[]): Array<{
        purpose: string;
        securityLevel: string;
        keyType: string;
        derivedFromInput: boolean
    }> {
        return publicKeys.map(key => ({
            purpose: this.getKeyPurposeDisplay(key.purpose),
            securityLevel: this.getSecurityLevelDisplay(key.securityLevel),
            keyType: key.keyType || 'UNKNOWN',
            derivedFromInput: false // This would require actual comparison with input key
        }))
    }
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
    private static getSecurityLevelDisplay(securityLevel: string): string {
        const levelMap: Record<string, string> = {
            'CRITICAL': 'Critical',
            'HIGH': 'High',
            'MEDIUM': 'Medium',
            'LOW': 'Low',
            'MASTER': 'Master'
        }
        return levelMap[securityLevel] || securityLevel
    }
    /**
     * Get DPNS username
     */
    private static async getDPNSUsername(
        identityId: string,
        network: 'mainnet' | 'testnet'
    ): Promise<string | null> {
        try {
            // Try direct DAPI call first
            const result = await invoke<TauriCommandResponse<string>>('get_dpns_username', { identityId, network })
            if (result?.success && result.result) {
                return result.result
            }
            // Fallback to HTTP API
            const response = await fetch('https://dapi.falcon.dash.org/v0/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    method: 'get_dpns_username',
                    params: [identityId],
                    network,
                }),
            })
            if (response.ok) {
                const data = await response.json()
                return data.result || data.data || data.username || null
            }
            return null
        } catch (error) {
            log('warn', `Failed to get DPNS username for ${identityId}:`, error)
            return null
        }
    }
    public static getKeyDescription(keyType: string): string {
        return this.detectKeyFormat(keyType).description
    }
    public static getKeyIcon(keyType: string): string {
        return this.detectKeyFormat(keyType).icon
    }
    static extractKeyTypes(identity: DiscoveredIdentity): {
        authenticationKeys: number
        transferKeys: number
        encryptionKeys: number
    } {
        const publicKeys = identity.publicKeys || []
        return {
            authenticationKeys: publicKeys.filter((k: any) => k.purpose === 'AUTHENTICATION').length,
            transferKeys: publicKeys.filter((k: any) => k.purpose === 'TRANSFER').length,
            encryptionKeys: publicKeys.filter((k: any) => k.purpose === 'ENCRYPTION').length
        }
    }
}
