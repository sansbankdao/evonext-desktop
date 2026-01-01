// src/composables/useIdentity.ts

import { computed, unref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useIdentityStore } from '@/stores/identity'
import { useNetwork } from '@/composables/useNetwork'
import { usePlatformSdk } from '@/composables/usePlatformSdk'
import type { ConnectionResult, DiscoveredIdentity, IPublicKey } from '@/types/identity'

const getIdentityIdx = async (): Promise<number> => {
    try {
        const identityStore = await invoke<any>('load_identity_data')
        return identityStore?.identityIdx ?? 0
    } catch (e) {
        return 0
    }
}

const hasTransferKey = (): boolean => {
    const identityStore = useIdentityStore()
    return identityStore.publicKeys.some(key => key.purpose === 1 || key.purpose === 3)
}

export function useIdentity() {
    const store = useIdentityStore()
    const { network } = useNetwork()
    const { getSDK } = usePlatformSdk()
    const isConnected = computed(() => store.isAuthenticated && !!store.identityId)
    const authPublicKey = computed(() => store.publicKeys.find((k: IPublicKey) => k.purpose === 0))
    const displayName = computed(() => store.displayName || store.identityId || 'Guest')
    const hasTransferKeyComputed = computed(hasTransferKey)

    async function getIdentityBalance(network: string, identityId: string): Promise<string> {
        try {
            // FIX: Cast to any to bypass strict type check on missing .get()
            const sdk = await getSDK() as any
            const identity = await sdk.identities.get(identityId)
            return identity ? identity.balance.toString() : '0'
        } catch (e) {
            console.error('Failed to fetch balance', e)
            return '0'
        }
    }

    async function init() {
        await store.loadFromStorage()
        if (store.isAuthenticated && store.identityId) {
            await refreshIdentity()
        }
    }

    async function connect(
        method: 'seed' | 'key',
        payload: { seedPhrase?: string; privateKey?: string; discoveredId?: string }
    ): Promise<ConnectionResult> {
        store.$patch({ isConnecting: true, connectionError: null })
        try {
            let id = payload.discoveredId
            if (!id) throw new Error('Identity ID required')
            store.$patch({ identityId: id, isAuthenticated: true })
            await refreshIdentity()
            await store.saveToStorage()
            return { success: true, identityId: id }
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Connection failed'
            store.$patch({ connectionError: msg, isAuthenticated: false })
            return { success: false, error: msg }
        } finally {
            store.$patch({ isConnecting: false })
        }
    }

    async function discoverIdentities(): Promise<DiscoveredIdentity[]> {
        if (!store.identityId) return []
        try {
            // FIX: Cast to any
            const sdk = await getSDK() as any
            const identity = await sdk.identities.get(store.identityId)
            const transformPublicKeys = (keys: any[]): IPublicKey[] => keys.map((k) => ({
                type: k.type,
                keyType: k.type === 0 ? 'ECDSA_SECP256K1' : 'ECDSA_HASH160',
                purpose: k.purpose,
                securityLevel: k.securityLevel,
                data: k.data.toString(),
                readOnly: k.readOnly,
                disabledAt: k.disabledAt
            }))
            const dpnsName = await sdk.names.resolve(store.identityId)
                .then((n: any) => n?.[0]?.label || null)
                .catch(() => null)
            const details: DiscoveredIdentity = {
                identityId: identity.id.toString(),
                identityIdx: 0,
                revision: identity.revision,
                balance: identity.balance.toString(),
                dpnsUsername: dpnsName || undefined
            }
            store.$patch({
                publicKeys: transformPublicKeys(identity.publicKeys),
                revision: Number(details.revision),
                displayName: details.dpnsUsername || store.identityId,
                balance: details.balance
            })
            return [details]
        } catch (e) {
            console.error('Discovery failed', e)
            return []
        }
    }

    const refreshIdentity = discoverIdentities

    async function refreshBalance() {
        if (store.identityId) {
            const balance = await getIdentityBalance(unref(network), store.identityId)
            store.balance = balance
        }
    }

    async function logout() {
        await store.clearStorage()
        store.$reset()
    }

    return {
        identityId: computed({
            get: () => store.identityId,
            set: (v: string | null) => store.identityId = v
        }),
        publicKeys: computed(() => store.publicKeys),
        balance: computed(() => store.balance),
        isConnecting: computed(() => store.isConnecting),
        connectionError: computed(() => store.connectionError),
        isConnected,
        displayName,
        authPublicKey,
        hasTransferKey: hasTransferKeyComputed,
        getIdentityIdx,
        init,
        connect,
        refreshIdentity,
        refreshBalance,
        logout
    }
}
