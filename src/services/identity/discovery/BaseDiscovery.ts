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
