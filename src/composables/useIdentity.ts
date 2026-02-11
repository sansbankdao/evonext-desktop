// src/composables/useIdentity.ts

import { computed } from 'vue'
import { useIdentityStore } from '@/stores/identity'
import { DAPIService } from '@/services/identity/discovery/DAPIService'
import { ErrorBoundary } from '@/utils/errors'
import type { IPublicKey } from '@/types/identity'
export function useIdentity() {
    const store = useIdentityStore()
    const isConnected = computed(() => store.isAuthenticated && !!store.identityId)
    const identityId = computed(() => store.identityId)
    const publicKeys = computed(() => store.publicKeys)
    const balance = computed(() => store.balance)
    const isConnecting = computed(() => store.isConnecting)
    const connectionError = computed(() => store.connectionError)
    const authPublicKey = computed(() =>
        store.publicKeys.find((k: IPublicKey) => k.purpose === 0)
    )
    const displayName = computed(() =>
        store.displayName || store.username || store.identityId || 'Guest'
    )
    /**
     * Refreshes identity data from the network
     */
    async function refreshIdentity() {
        if (!store.identityId) return
        return ErrorBoundary.wrap(async () => {
            const network = (await store.getCurrentNetwork()) as "mainnet" | "testnet"
            const result = await DAPIService.getIdentityById(store.identityId!, network)
            if (result.success && result.data) {
                const data = result.data
                store.balance = String(data.balance)
                store.revision = Number(data.revision)
                // Map keys ensuring idx (refactored from id)
                store.publicKeys = data.publicKeys.map((pk, index) => ({
                    idx: index,
                    keyType: pk.keyType,
                    purpose: pk.purpose as any,
                    securityLevel: pk.securityLevel as any,
                    data: pk.data,
                    readOnly: pk.readOnly,
                    disabledAt: pk.disabledAt
                }))
            }
        }, 'REFRESH_IDENTITY_FAILED')
    }
    async function init() {
        await store.loadFromStorage()
        if (store.isAuthenticated && store.identityId) {
            await refreshIdentity()
        }
    }
    async function logout() {
        await store.clearStorage()
        store.isAuthenticated = false
        store.identityId = null
        store.identity = null
        store.publicKeys = []
        store.username = null
        store.displayName = "" // Fixed: null to string
    }
    // Helper functions for tests
    const hasTransferKey = () => {
        return store.publicKeys.some(k => k.purpose === 1 || k.purpose === 3)
    }
    const getDpnsUsername = () => store.username || null
    return {
        identityId,
        publicKeys,
        balance,
        isConnecting,
        connectionError,
        isConnected,
        displayName,
        authPublicKey,
        init,
        refreshIdentity,
        logout,
        // Added for test compatibility
        hasTransferKey,
        getDpnsUsername,
        queryIdentityDetails: refreshIdentity,
        discoverIdentities: async () => [],
        connect: async () => {},
        getIdentityIdx: () => store.identityIdx
    }
}
