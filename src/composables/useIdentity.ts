// src/composables/useIdentity.ts
import { computed, unref } from 'vue'
import { invoke } from '@/utils/tauri'
import { useIdentityStore } from '@/stores/identity'
import { useNetwork } from '@/composables/useNetwork'
import { usePlatformSdk } from '@/composables/usePlatformSdk'
import { ErrorBoundary } from '@/utils/errors'
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
    // async function getIdentityBalance(_network: string, identityId: string): Promise<string> {
    //     try {
    //         const sdk = await getSDK() as any
    //         const identity = await sdk.identities.get(identityId)
    //         return identity ? identity.balance.toString() : '0'
    //     } catch (e) {
    //         console.error('Failed to fetch balance', e)
    //         return '0'
    //     }
    // }
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
    // REFACTORED: Move logic from libs/getIdentities and store actions into here
    async function searchUserIdentities(): Promise<SDKIdentityDetails | null> {
        return ErrorBoundary.wrap(async () => {
            log('info', 'Searching for user identities via composable...')
            const identityId = store.identityId
            if (!identityId) {
                 log('warn', 'No identity ID found in store to search for.')
                 return null
            }
            // FIX: Ensure the object has an 'id' property to match expected type
            const primaryIdentity: any = {
                identityIdx: 0
            }
            log('info', 'Identity found:', primaryIdentity)
            const sdk = await getSDK()
            // DPNS Lookup
            if (primaryIdentity?.id) {
                log('debug', 'Getting DPNS username from DAPI for:', primaryIdentity.id)
                try {
                    const dpnsUsername = await getDpnsUsername(primaryIdentity.id)
                    if (dpnsUsername) {
                        store.username = dpnsUsername
                        log('debug', 'Set username from DPNS:', store.username)
                    } else {
                        store.username = primaryIdentity.id
                        log('debug', 'No DPNS name found, using identity ID')
                    }
                } catch (dpnsError: any) {
                    log('error', 'DPNS lookup failed:', dpnsError)
                    store.username = primaryIdentity.id
                    log('debug', 'Using identity ID due to DPNS error')
                }
            } else {
                store.username = primaryIdentity?.id || null
                log('debug', 'No identity ID available')
            }
            store.identity = primaryIdentity || null
            store.isAuthenticated = true
            // Query details
            log('debug', 'Calling queryIdentityDetails...')
            try {
                const details = await queryIdentityDetails(
                    primaryIdentity.id,
                    primaryIdentity.identityIdx || 0,
                    sdk
                )
                await store.fetchBalance()
                // NOTE: The save step is removed here to be handled by the caller or explicit save actions
                return details
            } catch (error: any) {
                log('warn', 'Failed to query detailed identity information:', error?.message || error)
            }
            return null
        }, 'SEARCH_USER_IDENTITIES_FAILED')
    }
    async function getDpnsUsername(identityId: string): Promise<string | null> {
        return ErrorBoundary.wrap(async () => {
            try {
                const net = unref(network)
                const body = JSON.stringify({
                    method: 'get_dpns_username',
                    params: [identityId],
                    network: net,
                })
                log('info', 'Fetching username for identity:', identityId)
                const response = await fetch(getDapiEndpoint(), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body,
                })
                log('debug', 'Response status:', response.status)
                if (!response.ok) {
                    const errorText = await response.text()
                    log('error', 'Error response:', errorText)
                    throw new Error(`HTTP error! status: ${response.status}`)
                }
                const result = await response.json()
                log('debug', 'Full response:', result)
                if (result) {
                    if (typeof result === 'string') return result
                    if (result.success && result.result) return result.result
                    if (result.success && result.data) return result.data
                    if (result.success && result.username) return result.username
                    if (result.result && typeof result.result === 'string') return result.result
                    if (typeof result === 'object' && result[0]) return result[0]
                }
                log('info', 'No username found in response')
                return null
            } catch (error) {
                log('error', 'Failed to get username:', error)
                return null
            }
        }, 'GET_DPNS_USERNAME_FAILED')
    }
    async function queryIdentityDetails(
        identityId: string,
        identityIdx: number,
        sdk?: any
    ): Promise<SDKIdentityDetails> {
        return ErrorBoundary.wrap(async () => {
            log('debug', 'Starting queryIdentityDetails with identityId:', identityId)
            try {
                let sdkInstance = sdk
                if (!sdkInstance) {
                    sdkInstance = await getSDK()
                } else {
                    log('debug', 'Using provided SDK instance')
                }
                // Get identity details
                log('debug', 'Calling getIdentityByIdentifier...')
                const identity = await sdkInstance.identities.getIdentityByIdentifier(identityId)
                log('debug', 'Identity retrieved successfully')
                const publicKeys = identity.getPublicKeys()
                log('debug', `Got ${publicKeys.length} public keys`)
                const revision = identity.revision || BigInt(0)
                const formattedKeys = publicKeys.map((key: any, _index: number) => ({
                    type: key.keyType || 'ECDSA_SECP256K1',
                    purpose: key.purposeNumber || 0,
                    securityLevel: key.securityLevelNumber || 3,
                    data: key.data || '',
                    dataB64: key.data ? hexHash160ToBase64(key.data) : '',
                    readOnly: key.readOnly || false,
                    disabledAt: key.disabledAt || null,
                }))
                // Update Store
                updateIdentityWithSdkData(identityId, identityIdx, formattedKeys, revision)
                return {
                    identity,
                    identityIdx,
                    publicKeys: formattedKeys,
                    revision: Number(revision)
                }
            } catch (error: any) {
                log('error', 'Error in queryIdentityDetails:', error)
                if (error?.message && error.message.includes('ByteArrayAllocate')) {
                    log('error', 'WebAssembly memory allocation error!')
                }
                return {
                    identity: null,
                    identityIdx,
                    publicKeys: [],
                    revision: 0
                }
            }
        }, 'QUERY_IDENTITY_DETAILS_FAILED')
    }
    function updateIdentityWithSdkData(
        identityId: string,
        identityIdx: number,
        publicKeys: any[],
        revision: bigint
    ): void {
        log('debug', 'Updating identity with SDK data:', {
            identityId,
            identityIdx,
            publicKeysCount: publicKeys.length,
            revision: revision.toString()
        })
        if (publicKeys && publicKeys.length > 0) {
            store.publicKeys = publicKeys.map(key => ({
                type: key.type || key.type_ || 'ECDSA_SECP256K1',
                keyType: key.type || key.type_ || 'ECDSA_SECP256K1',
                purpose: key.purpose || 0,
                securityLevel: key.securityLevel || key.security_level || 3,
                data: key.data || '',
                dataB64: key.dataB64 || (key.data ? hexHash160ToBase64(key.data) : ''),
                readOnly: key.readOnly || key.read_only || false,
                disabledAt: key.disabledAt || key.disabled_at || null,
            }))
            log('debug', `Updated ${store.publicKeys.length} public keys`)
        }
        if (revision) {
            store.revision = Number(revision)
            log('debug', 'Updated revision:', store.revision)
        }
        store.identityId = identityId // Ensure ID is set
        store.displayName = store.username || identityId
        log('debug', 'Update complete')
    }
    // Legacy wrapper for compatibility
    async function discoverIdentities(): Promise<DiscoveredIdentity[]> {
        const res = await searchUserIdentities()
        if (res) {
            return [{
                identityId: store.identityId!,
                identityIdx: res.identityIdx,
                publicKeys: res.publicKeys,
                revision: res.revision,
                balance: store.balance || '',
                dpnsUsername: store.username || ''
            }]
        }
        return []
    }
    /**
     * Main refresh function called by the Wallet polling.
     * 1. Fetches Keys/Revision from network -> Updates Store.
     * 2. Fetches Balance from network -> Updates Store.
     * 3. Triggers syncIdentityToBackend -> Updates Rust Backend File.
     */
    async function refreshIdentity() {
        if (!store.identityId) return
        try {
            const sdk = await getSDK()
            // 1. Update Keys & Revision in Store Memory
            // This updates publicKeys and revision in the Pinia store
            await queryIdentityDetails(store.identityId, store.identityIdx || 0, sdk)
            // 2. Update Balance in Store Memory
            // This updates the balance in the Pinia store
            await store.fetchBalance()
            // 3. SYNC TO RUST BACKEND
            // This takes the *current* state (new keys, new revision, new balance)
            // and writes it to .identity-testnet.json via the Tauri command.
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
