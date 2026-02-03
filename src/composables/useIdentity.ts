// src/composables/useIdentity.ts
import { computed, unref } from 'vue'
import { invoke } from '@/utils/tauri'
import { useIdentityStore } from '@/stores/identity'
import { useNetwork } from '@/composables/useNetwork'
import { usePlatformSdk } from '@/composables/usePlatformSdk'
import { ErrorBoundary, type ActionResponse } from '@/utils/errors'
import { log, getDapiEndpoint } from '@/utils/env'
import { hexHash160ToBase64 } from '@/stores/identity/utils'
import type { ConnectionResult, DiscoveredIdentity, IPublicKey, SDKIdentityDetails } from '@/types/identity'
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
    async function init() {
        await store.loadFromStorage()
        if (store.isAuthenticated && store.identityId) {
            await refreshIdentity()
        }
    }
    async function connect(
        _method: 'seed' | 'key',
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
    async function searchUserIdentities(): Promise<ActionResponse<SDKIdentityDetails | null>> {
        return ErrorBoundary.wrap(async () => {
            log('info', 'Searching for user identities via composable...')
            const identityId = store.identityId
            if (!identityId) {
                 log('warn', 'No identity ID found in store to search for.')
                 return null
            }
            const primaryIdentity: any = {
                identityIdx: 0
            }
            const sdk = await getSDK()
            if (primaryIdentity?.id) {
                try {
                    // Note: getDpnsUsername now returns ActionResponse
                    const dpnsRes = await getDpnsUsername(primaryIdentity.id)
                    const dpnsUsername = dpnsRes.success ? dpnsRes.data : null
                    if (dpnsUsername) {
                        store.username = dpnsUsername
                    } else {
                        store.username = primaryIdentity.id
                    }
                } catch (dpnsError: any) {
                    store.username = primaryIdentity.id
                }
            } else {
                store.username = null
            }
            store.identity = primaryIdentity || null
            store.isAuthenticated = true
            try {
                // queryIdentityDetails now returns ActionResponse
                const detailRes = await queryIdentityDetails(
                    primaryIdentity.id,
                    primaryIdentity.identityIdx || 0,
                    sdk
                )
                await store.fetchBalance()
                return detailRes.data || null
            } catch (error: any) {
                log('warn', 'Failed to query detailed identity information:', error?.message || error)
            }
            return null
        }, 'SEARCH_USER_IDENTITIES_FAILED')
    }
    async function getDpnsUsername(identityId: string): Promise<ActionResponse<string | null>> {
        return ErrorBoundary.wrap(async () => {
            const net = unref(network)
            const body = JSON.stringify({
                method: 'get_dpns_username',
                params: [identityId],
                network: net,
            })
            const response = await fetch(getDapiEndpoint(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
            })
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
            const result = await response.json()
            if (result) {
                if (typeof result === 'string') return result
                if (result.success && result.result) return result.result
                if (result.success && result.data) return result.data
                if (result.result && typeof result.result === 'string') return result.result
            }
            return null
        }, 'GET_DPNS_USERNAME_FAILED')
    }
    async function queryIdentityDetails(
        identityId: string,
        identityIdx: number,
        sdk?: any
    ): Promise<ActionResponse<SDKIdentityDetails>> {
        return ErrorBoundary.wrap(async () => {
            let sdkInstance = sdk || await getSDK()
            const identity = await sdkInstance.identities.getIdentityByIdentifier(identityId)
            const publicKeys = identity.getPublicKeys()
            const revision = identity.revision || BigInt(0)
            const formattedKeys = publicKeys.map((key: any) => ({
                type: key.keyType || 'ECDSA_SECP256K1',
                purpose: key.purposeNumber || 0,
                securityLevel: key.securityLevelNumber || 3,
                data: key.data || '',
                dataB64: key.data ? hexHash160ToBase64(key.data) : '',
                readOnly: key.readOnly || false,
                disabledAt: key.disabledAt || null,
            }))
            updateIdentityWithSdkData(identityId, identityIdx, formattedKeys, revision)
            return {
                identity,
                identityIdx,
                publicKeys: formattedKeys,
                revision: Number(revision)
            }
        }, 'QUERY_IDENTITY_DETAILS_FAILED')
    }
    function updateIdentityWithSdkData(
        identityId: string,
        _identityIdx: number,
        publicKeys: any[],
        revision: bigint
    ): void {
        if (publicKeys && publicKeys.length > 0) {
            store.publicKeys = publicKeys.map(key => ({
                type: key.type || 'ECDSA_SECP256K1',
                keyType: key.type || 'ECDSA_SECP256K1',
                purpose: key.purpose || 0,
                securityLevel: key.securityLevel || 3,
                data: key.data || '',
                dataB64: key.dataB64 || (key.data ? hexHash160ToBase64(key.data) : ''),
                readOnly: key.readOnly || false,
                disabledAt: key.disabledAt || null,
            }))
        }
        store.revision = Number(revision)
        store.identityId = identityId
        store.displayName = store.username || identityId
    }
    async function discoverIdentities(): Promise<DiscoveredIdentity[]> {
        const res = await searchUserIdentities()
        if (res.success && res.data) {
            return [{
                identityId: store.identityId!,
                identityIdx: res.data.identityIdx,
                publicKeys: res.data.publicKeys,
                revision: res.data.revision,
                balance: store.balance || '',
                dpnsUsername: store.username || ''
            }]
        }
        return []
    }
    async function refreshIdentity() {
        if (!store.identityId) return
        try {
            const sdk = await getSDK()
            await queryIdentityDetails(store.identityId, store.identityIdx || 0, sdk)
            await store.fetchBalance()
            const currentNetwork = unref(network) as any
            await store.syncIdentityToBackend(currentNetwork)
        } catch (error) {
            log('error', 'Failed to refresh identity', error)
        }
    }
    const refreshBalance = discoverIdentities
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
        searchUserIdentities,
        getDpnsUsername,
        queryIdentityDetails,
        refreshIdentity,
        refreshBalance,
        logout
    }
}
