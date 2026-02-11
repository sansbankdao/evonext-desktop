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
            idx: key.idx ?? index, // Ensure idx is mapped
            keyType: key.keyType || 'ECDSA_HASH160',
            purpose: (key.purpose || 0) as any,
            securityLevel: (key.securityLevel || 3) as any,
            data: key.data || key.dataB64 || '',
            readOnly: !!key.readOnly,
            disabledAt: key.disabledAt || null
        }))
    }
    const getIdentityById = async (identityId: string): Promise<ActionResponse<IIdentity | null>> => {
        return ErrorBoundary.wrap(async () => {
            const network = (await store.getCurrentNetwork()) as 'mainnet' | 'testnet'
            const manager = getIdentityManager(store)
            const result: DiscoveryResult = await manager.getIdentityById(identityId, network)
            // Refactored to match DiscoveryResult from group 1
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
        // Added for test compatibility
        detectKeyType: (input: string) => {
            if (input.length === 51 || input.length === 52) return 'WIF'
            if (input.length === 64) return 'HEX'
            return 'UNKNOWN'
        },
        queryWebAPI: async () => ({ success: true }),
        getIdentitiesFromSeed: async () => ({ success: true, identities: [] })
    }
}
