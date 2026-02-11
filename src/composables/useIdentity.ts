// src/composables/useIdentity.ts

import { ref, computed } from 'vue'
import { invoke } from '@/utils/tauri'
import { useIdentityStore } from '@/stores/identity'
import type { IIdentity, IPublicKey } from '@/types/identity'

export function useIdentity() {
    const store = useIdentityStore()
    const activeIdentity = ref<IIdentity | null>(null)

    const init = async () => {
        await store.loadFromStorage()
    }

    const refreshIdentity = async () => {
        await store.refreshIdentity()
    }

    const logout = async () => {
        await store.clearStorage()
    }

    const getDpnsUsername = async (identityId: string) => {
        try {
            const name = await invoke<string>('get_dpns_name', { identityId })
            return { success: true, data: name }
        } catch (e) {
            return { success: false, error: String(e) }
        }
    }

    return {
        // State
        activeIdentity,
        identityId: computed(() => store.identityId),
        isConnected: computed(() => store.isConnected),
        displayName: computed(() => store.displayName || 'Unnamed'),
        balance: computed(() => store.balance),
        publicKeys: computed(() => store.publicKeys),

        // Methods
        init,
        refreshIdentity,
        logout,
        getDpnsUsername,

        // Passthroughs to Store Actions
        searchUserIdentities: () => store.searchUserIdentities(),
        queryIdentityDetails: (id: string, idx: number) => store.refreshIdentity(),
        connect: (key: string, opts: any) => store.connectWithPrivateKey(key, opts.discoveredId, 'testnet'),

        hasTransferKey: computed(() => {
            return store.publicKeys.some(k => k.purpose === 1 || k.purpose === 3)
        })
    }
}
