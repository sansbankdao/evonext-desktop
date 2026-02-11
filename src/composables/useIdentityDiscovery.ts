// src/composables/useIdentityDiscovery.ts

import { ref } from 'vue'
import { ErrorBoundary, type ActionResponse } from '@/utils/errors'
import { getDapiEndpoint } from '@/utils/env'
import { useNetwork } from './useNetwork'
import { getIdentityManager } from '@/services/identity/discovery/IdentityManager'
import { useIdentityStore } from '@/stores/identity'
import type {
    IIdentity,
    IPublicKey,
    PurposeType,
    SecurityLevelType
} from '@/types'

export function useIdentityDiscovery() {
    const { ensure } = useNetwork()
    const store = useIdentityStore()
    const network = ref<'testnet' | 'mainnet'>('testnet')
    const isInitializing = ref(false)
    const initialize = async (): Promise<ActionResponse<void>> => {
        return ErrorBoundary.wrap(async () => {
            if (isInitializing.value) return
            isInitializing.value = true
            try {
                const net = await ensure()
                network.value = (net === 'mainnet' || net === 'testnet') ? net : 'testnet'
            } finally {
                isInitializing.value = false
            }
        }, 'IDENTITY_INIT_FAILED')
    }
    const getIdentitiesFromSeed = async (seedPhrase: string, options?: any): Promise<ActionResponse<IIdentity[] | null>> => {
        return ErrorBoundary.wrap(async () => {
            await initialize()
            const manager = getIdentityManager(store as any)
            const result = await manager.discover(seedPhrase, {
                network: network.value,
                maxIdentityIndex: options?.maxIdentityIndex || 5
            })
            if (result.success && result.identities) {
                return result.identities.map((id: any) => ({
                    identityId: id.identityId,
                    identityIdx: id.identityIdx || 0,
                    publicKeys: id.publicKeys || [],
                    balance: id.balance || '0',
                    revision: id.revision || 0,
                    username: id.username || id.dpnsUsername || '',
                    createdAt: 0
                }))
            }
            return null
        }, 'GET_IDENTITIES_FROM_SEED_FAILED')
    }
    const getIdentityById = async (identityId: string): Promise<ActionResponse<IIdentity | null>> => {
        return ErrorBoundary.wrap(async () => {
            await initialize()
            const manager = getIdentityManager(store as any)
            const result = await manager.getIdentityById(identityId, network.value)
            if (result.success && result.identity) {
                const src = result.identity
                return {
                    identityId: src.identityId,
                    identityIdx: src.identityIdx || 0,
                    balance: src.balance || '0',
                    revision: src.revision || 0,
                    username: src.dpnsUsername || '',
                    publicKeys: src.publicKeys || []
                } as IIdentity
            }
            return null
        }, 'GET_IDENTITY_BY_ID_FAILED')
    }
    const detectKeyType = (keyInput: string): string => {
        const clean = keyInput.trim()
        if (/^[cKL][0-9A-Za-z]{50,}$/.test(clean)) return 'WIF'
        if (/^[0-9a-fA-F]{64}$/.test(clean)) return 'HEX'
        return 'UNKNOWN'
    }
    const mapPublicKeys = (keys: any[]): IPublicKey[] => {
        return (keys || []).map(key => ({
            type: key.type ?? -1,
            keyType: key.keyType || 'UNKNOWN',
            purpose: (key.purpose || 0) as PurposeType,
            securityLevel: (key.securityLevel || 3) as SecurityLevelType,
            data: key.data
        }))
    }
    const queryWebAPI = async (method: string, params: any[] = []): Promise<ActionResponse<any>> => {
        return ErrorBoundary.wrap(async () => {
            const endpoint = getDapiEndpoint()
            if (!endpoint) throw new Error('DAPI Endpoint Missing')
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ method, params, network: network.value }),
            })
            return await response.json()
        }, 'API_QUERY_FAILED')
    }
    return {
        network,
        isInitializing,
        initialize,
        getIdentitiesFromSeed,
        getIdentityById,
        detectKeyType,
        mapPublicKeys,
        queryWebAPI
    }
}
