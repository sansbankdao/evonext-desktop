// src/composables/useIdentity.ts

import { ref, computed } from 'vue'
import { invoke } from '@/utils/tauri'
import { useIdentityStore } from '@/stores/identity'
import type { IIdentity, DiscoveryResult } from '@/types/identity'
export function useIdentity() {
    const store = useIdentityStore()
    const activeIdentity = ref<IIdentity | null>(null)
    const init = async () => {
        await store.loadFromStorage()
    }
    const getIdentityIdx = (identityId: string): number => {
        return store.identities[identityId]?.identityIdx ?? 0
    }
    const discoverIdentities = async (mnemonic: string): Promise<DiscoveryResult> => {
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
        refreshIdentity: () => store.refreshIdentity(),
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
        searchUserIdentities: async () => store.searchUserIdentities(),
        queryIdentityDetails: (_id: string, _idx: number) => store.refreshIdentity(),
        getPublicKeys: (identityId: string, network: string) => store.getPublicKeys(identityId, network),
        connect: (key: string, opts: any) =>
            store.connectWithPrivateKey(key, opts?.discoveredId || '', 'testnet'),
        hasTransferKey: computed(() => {
            return store.publicKeys.some(k => k.purpose === 1 || k.purpose === 3)
        })
    }
}
