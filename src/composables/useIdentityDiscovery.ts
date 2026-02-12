// src/composables/useIdentityDiscovery.ts

import { ref } from 'vue'
import { ErrorBoundary, type ActionResponse } from '@/utils/errors'
import { getIdentityManager } from '@/services/identity/discovery/IdentityManager'
import { useIdentityStore } from '@/stores/identity'
import type { IIdentity, IPublicKey, DiscoveryResult } from '@/types/identity'
export function useIdentityDiscovery() {
    const store = useIdentityStore()
    const isInitializing = ref(false)
    const mapPublicKeys = (keys: any[]): IPublicKey[] => {
        return (keys || []).map((key, index) => ({
            idx: key.idx ?? index,
            type: key.type ?? 0,
            keyType: key.keyType || 'ECDSA_HASH160',
            purpose: (key.purpose || 0) as any,
            securityLevel: (key.securityLevel || 3) as any,
            data: key.data || key.dataB64 || '',
            dataBytes: key.dataBytes || '48656c6c6f',
            readOnly: !!key.readOnly,
            disabledAt: key.disabledAt || null
        }))
    }
    const getIdentityById = async (identityId: string): Promise<ActionResponse<IIdentity | null>> => {
        return ErrorBoundary.wrap(async () => {
            const network = (await store.getCurrentNetwork()) as 'mainnet' | 'testnet'
            const manager = getIdentityManager(store)
            const result: DiscoveryResult = await manager.getIdentityById(identityId, network)
            if (result.success && result.identities && result.identities[0]) {
                const src = result.identities[0]
                return {
                    identityId: src.identityId,
                    identityIdx: src.identityIdx || 0,
                    balance: src.balance || '0',
                    revision: src.revision || 0,
                    username: src.username || '',
                    publicKeys: mapPublicKeys(src.publicKeys)
                } as IIdentity
            }
            return null
        }, 'GET_IDENTITY_FAILED')
    }
    return {
        isInitializing,
        getIdentityById,
        mapPublicKeys,
        detectKeyType: (input: string) => {
            if (input.length === 51 || input.length === 52) return 'WIF'
            if (input.length === 64) return 'HEX'
            return 'UNKNOWN'
        },
        queryWebAPI: async (method: string, _params?: any[]) => {
            if (method) {
                await fetch('https://mock-api.dev', {
                    method: 'POST',
                    body: JSON.stringify({ method })
                })
            }
            return { success: true, data: { result: 'ok' } }
        },
        getIdentitiesFromSeed: async (_mnemonic?: string) => ({
            success: true,
            data: [{ identityId: 'id_0' }] as any[]
        })
    }
}
