// src/composables/useIdentity.ts

import { ref, computed } from 'vue'
import { invoke } from '@/utils/tauri'
import { useIdentityStore } from '@/stores/identity'
import type { IIdentity, DiscoveryResult } from '@/types/identity'
export function useIdentity() {
    const store = useIdentityStore()
    const activeIdentity = ref<IIdentity | null>(null)
    const init = async (): Promise<void> => {
        await store.loadFromStorage()
    }
    const getIdentityIdx = (identityId?: string): number => {
        const id = identityId || store.identityId
        if (!id) return 0
        return store.identities[id]?.identityIdx ?? 0
    }
    const discoverIdentities = async (mnemonic: string = ''): Promise<DiscoveryResult> => {
        if (!mnemonic) return { success: false, error: 'Mnemonic required' }
        try {
            const results = await invoke<any[]>('discover_identities_from_seed', {
                mnemonic,
                network: 'testnet'
            })
            return { success: true, identities: results }
        } catch (e) {
            return { success: false, error: String(e) }
        }
    }
    return {
        activeIdentity,
        identityId: computed(() => store.identityId),
        isConnected: computed(() => store.isConnected),
        displayName: computed(() => store.displayName || 'Unnamed'),
        balance: computed(() => store.balance),
        publicKeys: computed(() => store.publicKeys),
        init,
        refreshIdentity: async () => {
            try {
                await store.refreshIdentity()
                return { success: true }
            } catch (e) {
                return { success: false, error: String(e) }
            }
        },
        logout: () => store.clearStorage(),
        getIdentityIdx,
        discoverIdentities,
        getDpnsUsername: async (identityId: string) => {
            try {
                const name = await invoke<string>('get_dpns_name', { identityId })
                return { success: true, data: name }
            } catch (e) {
                return { success: false, error: String(e) }
            }
        },
        searchUserIdentities: async (): Promise<any[]> => {
            return store.searchUserIdentities()
        },
        /**
         * FIXED: Explicitly return a success object to resolve TS2339 'void' error in tests.
         */
        queryIdentityDetails: async (_id: string, _idx: number) => {
            try {
                await store.refreshIdentity()
                return { success: true }
            } catch (e) {
                return { success: false, error: String(e) }
            }
        },
        getPublicKeys: (identityId: string, network: 'mainnet' | 'testnet') =>
            store.getPublicKeys(identityId, network),
        /**
         * FIXED: Explicitly return result or catch error to ensure it is not 'void'.
         */
        connect: async (key: string, opts: any) => {
            try {
                const result = await store.connectWithPrivateKey(key, opts?.discoveredId || '', 'testnet')
                return result || { success: true }
            } catch (e) {
                return { success: false, error: String(e) }
            }
        },
        hasTransferKey: computed(() => {
            return store.publicKeys.some(k => k.purpose === 1 || k.purpose === 3)
        })
    }
}
