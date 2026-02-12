// src/services/identity/discovery/BaseDiscovery.ts

import type {
    DiscoveredIdentity,
    DiscoveryOptions,
    DiscoveryResult
} from '@/types/identity'

export abstract class BaseDiscovery {
    protected network: 'mainnet' | 'testnet' = 'testnet'

    setNetwork(network: 'mainnet' | 'testnet'): this {
        this.network = network
        return this
    }

    abstract discover(input: string, options?: DiscoveryOptions): Promise<DiscoveryResult>

    protected formatBalance(balance: any): string {
        if (balance === undefined || balance === null) return '0'
        return String(balance)
    }

    protected validateNetwork(network?: 'mainnet' | 'testnet'): 'mainnet' | 'testnet' {
        return network || this.network
    }

    protected isSeedPhrase(input: string): boolean {
        return typeof input === 'string' && input.trim().split(/\s+/).length >= 12
    }

    protected isPrivateKey(input: string): boolean {
        return typeof input === 'string' && (input.length === 64 || input.length === 51 || input.length === 52)
    }

    protected isPublicKey(input: string): boolean {
        return typeof input === 'string' && (input.length === 66 || input.length === 130)
    }

    /**
     * Maps raw key purposes and security levels to display labels.
     * Casing must match test expectations (e.g., 'Authentication').
     */
    protected extractAssociatedKeys(keys: any[]): any[] {
        const purposeMap: Record<number, string> = {
            0: 'Authentication',
            1: 'Encryption',
            2: 'Decryption',
            3: 'Transfer'
        }
        const levelMap: Record<number, string> = {
            0: 'Master',
            1: 'Critical',
            2: 'High',
            3: 'Medium'
        }
        return (Array.isArray(keys) ? keys : []).map(k => ({
            ...k,
            purpose: purposeMap[k.purpose] || k.purpose,
            securityLevel: levelMap[k.securityLevel] || k.securityLevel
        }))
    }

    protected handleError(error: any, context: string): DiscoveryResult {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`[Discovery][${context}]`, message)
        return {
            success: false,
            error: `${context}: ${message}`,
            debug: this.createDebugInfo(context, { error: message }),
            identities: []
        }
    }

    protected parseIdentityData(identityData: any): DiscoveredIdentity {
        return {
            identityId: identityData.identityId || identityData.id || '',
            identityIdx: identityData.identityIdx || 0,
            balance: this.formatBalance(identityData.balance),
            revision: identityData.revision,
            publicKeys: (identityData.publicKeys || []).map((pk: any, idx: number) => ({
                ...pk,
                idx: pk.idx ?? idx
            })),
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
            identities: []
        }
    }

    protected createSuccessResult(
        identities?: DiscoveredIdentity[] | null,
        debug?: any
    ): DiscoveryResult {
        return {
            success: true,
            identities: identities || [],
            debug: debug || this.createDebugInfo('success')
        }
    }
}
