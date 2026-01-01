// src/services/identity/discovery/BaseDiscovery.ts

import type {
    AssociatedKey,
    DiscoveredIdentity,
    DiscoveryOptions,
    DiscoveryResult,
} from '../types'

export abstract class BaseDiscovery {
    protected network: 'mainnet' | 'testnet' = 'testnet'

    setNetwork(network: 'mainnet' | 'testnet'): this {
        this.network = network
        return this
    }

    abstract discover(input: string, options?: DiscoveryOptions): Promise<DiscoveryResult>

    protected formatBalance(balance: any): string {
        if (balance === undefined || balance === null) return '0'
        if (typeof balance === 'number') return balance.toString()
        if (typeof balance === 'string') return balance
        try {
            return balance.toString()
        } catch {
            return '0'
        }
    }

    protected formatRevision(revision: any): string {
        if (revision === undefined || revision === null) return '0'
        if (typeof revision === 'number') return revision.toString()
        if (typeof revision === 'string') return revision
        try {
            return revision.toString()
        } catch {
            return '0'
        }
    }

    protected extractAssociatedKeys(publicKeys: any[]): AssociatedKey[] {
        if (!Array.isArray(publicKeys) || publicKeys.length === 0) {
            return []
        }

        return publicKeys.map(key => ({
            purpose: this.getKeyPurposeDisplay(key.purpose),
            securityLevel: this.getSecurityLevelDisplay(key.securityLevel),
            keyType: key.keyType || 'UNKNOWN',
            data: key.data || key.dataB64 || '',
            derivedFromInput: false
        }))
    }

    protected getKeyPurposeDisplay(purpose: string): string {
        if (!purpose) return 'Unknown'

        const purposeMap: Record<string, string> = {
            'AUTHENTICATION': 'Authentication',
            'TRANSFER': 'Transfer',
            'ENCRYPTION': 'Encryption',
            'KEY_MANAGEMENT': 'Key Management',
            'SIGNING': 'Signing',
            'MASTER': 'Master'
        }
        return purposeMap[purpose.toUpperCase()] || purpose
    }

    protected getSecurityLevelDisplay(securityLevel: string): string {
        if (!securityLevel) return 'Unknown'

        const levelMap: Record<string, string> = {
            'CRITICAL': 'Critical',
            'HIGH': 'High',
            'MEDIUM': 'Medium',
            'LOW': 'Low',
            'MASTER': 'Master'
        }
        return levelMap[securityLevel.toUpperCase()] || securityLevel
    }

    protected validateNetwork(network?: 'mainnet' | 'testnet'): 'mainnet' | 'testnet' {
        return network || this.network
    }

    protected parseIdentityData(identityData: any): DiscoveredIdentity {
        return {
            identityId: identityData.identityId || identityData.id || '',
            balance: this.formatBalance(identityData.balance),
            revision: this.formatRevision(identityData.revision),
            publicKeys: identityData.publicKeys || [],
            dpnsUsername: identityData.dpnsUsername || identityData.username || null
        }
    }

    protected createDebugInfo(step: string, data?: any): any {
        return {
            step,
            timestamp: new Date().toISOString(),
            network: this.network,
            ...data
        }
    }

    protected createErrorResult(error: string, debug?: any): DiscoveryResult {
        return {
            success: false,
            error,
            debug: debug || this.createDebugInfo('error'),
            identities: null,
            identity: null,
            detectedKeyType: null,
            associatedKeys: null
        }
    }

    protected createSuccessResult(
        identity?: DiscoveredIdentity | null,
        identities?: DiscoveredIdentity[] | null,
        detectedKeyType?: string | null,
        associatedKeys?: AssociatedKey[] | null,
        debug?: any
    ): DiscoveryResult {
        return {
            success: true,
            identity: identity || null,
            identities: identities || null,
            detectedKeyType: detectedKeyType || null,
            associatedKeys: associatedKeys || null,
            debug: debug || this.createDebugInfo('success')
        }
    }

    protected handleError(error: any, context: string): DiscoveryResult {
        console.error(`[Discovery] ${context} error:`, error)

        let errorMessage = 'Unknown error'
        if (error instanceof Error) {
            errorMessage = error.message
        } else if (typeof error === 'string') {
            errorMessage = error
        }

        return this.createErrorResult(`${context}: ${errorMessage}`, {
            step: 'exception',
            network: this.network,
            error: errorMessage
        })
    }

    protected isSeedPhrase(input: string): boolean {
        const words = input.trim().split(/\s+/)
        return words.length === 12 || words.length === 24
    }

    protected isPrivateKey(input: string): boolean {
        const cleanInput = input.trim()
        // WIF format
        if (/^[cKL][0-9A-Za-z]{50,}$/.test(cleanInput)) {
            return true
        }
        // HEX format
        if (/^[0-9a-fA-F]{64}$/.test(cleanInput)) {
            return true
        }
        return false
    }

    protected isPublicKey(input: string): boolean {
        const cleanInput = input.trim()
        // Compressed public key
        if (/^0[23][0-9a-fA-F]{64}$/.test(cleanInput)) {
            return true
        }
        // Uncompressed public key
        if (/^04[0-9a-fA-F]{128}$/.test(cleanInput)) {
            return true
        }
        return false
    }

    protected sanitizeDebugOutput(debug: any): any {
        if (!debug) return debug

        // Create a sanitized copy
        const sanitized = { ...debug }

        // Remove sensitive data from keys
        if (sanitized.derivedHashes && Array.isArray(sanitized.derivedHashes)) {
            sanitized.derivedHashes = sanitized.derivedHashes.map((hash: string) =>
                `${hash.substring(0, 8)}...${hash.substring(hash.length - 4)}`
            )
        }

        // Sanitize found hash
        if (sanitized.foundHash && typeof sanitized.foundHash === 'string') {
            sanitized.foundHash = `${sanitized.foundHash.substring(0, 8)}...${sanitized.foundHash.substring(sanitized.foundHash.length - 4)}`
        }

        // Remove any private key data
        if (sanitized.input) {
            sanitized.input = `${sanitized.input.substring(0, 8)}...`
        }

        return sanitized
    }
}
