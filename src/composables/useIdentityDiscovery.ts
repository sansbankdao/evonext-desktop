// src/composables/useIdentityDiscovery.ts

import { ref } from 'vue'
import { ErrorBoundary, type ActionResponse } from '@/utils/errors'
import { log, getDapiEndpoint } from '@/utils/env'
import { useNetwork } from './useNetwork'
import { IdentityManager } from '@/services/identity/discovery/IdentityManager'
import type { IIdentity, IPublicKey, PurposeType, SecurityLevelType, IdentitySearchOptions, IIdentityActions } from '@/types'

// Singleton instance to hold the manager
let identityManagerInstance: IdentityManager | null = null

/**
 * Gets or creates the IdentityManager instance.
 * If a custom store is provided, it creates a new instance with that store.
 * This fixes the regression where tests were spying on a different store object
 * than the one used by the singleton.
 */
const getIdentityManager = (store?: IIdentityActions): IdentityManager => {
    // Create default stubs if no store is provided
    const defaultActions: IIdentityActions = {
        saveKeys: async () => { console.log('[Mock] saveKeys called'); },
        saveDiscoveredIdentities: async () => ({ success: true, savedCount: 0 }),
        loadDiscoveredIdentities: async () => null,
        clearDiscoveredIdentities: async () => ({ success: true }),
        connectWithSeed: async () => ({ success: false }),
        connectWithSingleKey: async () => ({ success: false }),
        switchIdentity: async () => ({ success: false }),
        connectWriteOnlyFromDiscovered: async () => ({ success: false }),
        loadFromStorage: async () => {},
        saveToStorage: async () => {},
        clearStorage: async () => {},
        getCurrentNetwork: async () => 'testnet',
        saveMnemonicToStore: async () => {},
        loadMnemonic: async () => null,
        loadSettings: async () => {},
        saveIdentityDataToStore: async () => {},
        resetStoreState: () => {},
        logout: async () => {},
        clearConnectionError: () => {}
    }
    const effectiveStore = store || defaultActions
    // In a test scenario or specific component, we might need to reset the instance
    // or create a new one with the specific store passed in.
    // For this refactor, we will recreate the instance if a store is explicitly passed,
    // otherwise we use the singleton.
    if (!identityManagerInstance || store) {
        identityManagerInstance = new IdentityManager(effectiveStore)
    }
    return identityManagerInstance
}
export function useIdentityDiscovery() {
    const { ensure } = useNetwork()
    const network = ref<'testnet' | 'mainnet'>('testnet')
    const isInitializing = ref(false)
    const initialize = async (): Promise<ActionResponse<void>> => {
        return ErrorBoundary.wrap(async () => {
            if (isInitializing.value) return
            isInitializing.value = true
            try {
                const net = await ensure()
                network.value = (net === 'mainnet' || net === 'testnet') ? net : 'testnet'
                log('info', `Identity Discovery initialized for network: ${network.value}`)
            } finally {
                isInitializing.value = false
            }
        }, 'IDENTITY_MANAGER_INIT_FAILED')
    }
    const getIdentitiesFromSeed = async (
        seedPhrase: string,
        _options?: IdentitySearchOptions
    ): Promise<ActionResponse<IIdentity[] | null>> => {
        return ErrorBoundary.wrap(async () => {
            await initialize()
            const manager = getIdentityManager()
            const result = await manager.discover(seedPhrase, {
                network: network.value
            })
            if (result.success && result.identities) {
                log('info', `Discovery found ${result.identities.length} identities via Manager`)
                // Explicit mapping to IIdentity
                return result.identities.map((id: any) => ({
                    identityId: id.identityId,
                    identityIdx: id.identityIdx,
                    publicKeys: id.publicKeys,
                    balance: id.balance || '0',
                    revision: id.revision || 0,
                    username: id.username || '',
                    // SAFETY: DO NOT READ id.createdAt. DiscoveredIdentity does not have it.
                    createdAt: 0
                }))
            }
            return null
        }, 'GET_IDENTITIES_FROM_SEED_FAILED')
    }
    const getIdentityByKey = async (
        keyInput: string
    ): Promise<ActionResponse<{ identity: IIdentity; keyType: string } | null>> => {
        return ErrorBoundary.wrap(async () => {
            await initialize()
            try {
                const manager = getIdentityManager()
                if (manager.discoverFromKey) {
                    const result = await manager.discoverFromKey(keyInput, { network: network.value })
                    if (result.success && result.identity) {
                        const src = result.identity
                        const identityData: IIdentity = {
                            identityId: src.identityId,
                            identityIdx: src.identityIdx || 0,
                            publicKeys: mapPublicKeys(src.publicKeys || []),
                            balance: src.balance || '0',
                            revision: src.revision ? Number(src.revision) : 0,
                            username: src.username || '',
                            // SAFETY: DO NOT READ src.createdAt. DiscoveredIdentityWithKeys does not have it.
                            createdAt: 0,
                            ...(src.avatarUrl ? { avatarUrl: src.avatarUrl } : {})
                        }
                        return {
                            success: true,
                            identity: identityData,
                            keyType: detectKeyType(keyInput)
                        }
                    }
                }
            } catch (e) {
                log('warn', 'Manager key discovery failed, trying Web API')
            }
            const apiRes = await queryWebAPI('get_identity_by_private_key', [keyInput])
            const result = apiRes.success ? apiRes.data : null
            if (result?.success && result?.result?.identityId) {
                const identityData = result.result
                const typedIdentity: IIdentity = {
                    identityId: identityData.identityId,
                    identityIdx: 0,
                    publicKeys: mapPublicKeys(identityData.publicKeys || []),
                    balance: identityData.balance || '0',
                    revision: identityData.revision ? Number(identityData.revision) : 0,
                    username: identityData.username || '',
                    createdAt: identityData.createdAt ? Number(identityData.createdAt) : 0
                }
                return {
                    success: true,
                    identity: typedIdentity,
                    keyType: detectKeyType(keyInput)
                }
            }
            return null
        }, 'GET_IDENTITY_BY_KEY_FAILED')
    }
    const getIdentityById = async (identityId: string): Promise<ActionResponse<IIdentity | null>> => {
        return ErrorBoundary.wrap(async () => {
            await initialize()
            try {
                const manager = getIdentityManager()
                if (manager.getIdentityById) {
                    const result = await manager.getIdentityById(identityId, network.value)
                    if (result.success && result.identity) {
                        const src = result.identity
                        const strictIdentity: IIdentity = {
                            identityId: src.identityId,
                            identityIdx: src.identityIdx || 0,
                            publicKeys: mapPublicKeys(src.publicKeys || []),
                            balance: src.balance || '0',
                            revision: src.revision ? Number(src.revision) : 0,
                            username: src.username || '',
                            // SAFETY: DO NOT READ src.createdAt. DiscoveredIdentityWithKeys does not have it.
                            createdAt: 0,
                            ...(src.avatarUrl ? { avatarUrl: src.avatarUrl } : {})
                        }
                        return strictIdentity
                    }
                }
            } catch (e) {
                log('warn', 'Manager ID discovery failed, trying Web API')
            }
            const apiRes = await queryWebAPI('identity_fetch', [identityId])
            const result = apiRes.success ? apiRes.data : null
            if (result?.success && result?.result) {
                const data = result.result
                const strictIdentity: IIdentity = {
                    identityId: data.identityId,
                    identityIdx: 0,
                    publicKeys: mapPublicKeys(data.publicKeys || []),
                    balance: data.balance || '0',
                    revision: data.revision ? Number(data.revision) : 0,
                    username: data.username || '',
                    createdAt: data.createdAt ? Number(data.createdAt) : 0
                }
                return strictIdentity
            }
            return null
        }, 'GET_IDENTITY_BY_ID_FAILED')
    }
    const detectKeyType = (keyInput: string): string => {
        const cleanKey = keyInput.trim()
        if (/^[cKL][0-9A-Za-z]{50,}$/.test(cleanKey)) return 'WIF'
        if (/^[0-9a-fA-F]{64}$/.test(cleanKey)) return 'HEX'
        if (/^0[23][0-9a-fA-F]{64}$/.test(cleanKey)) return 'COMPRESSED_PUBKEY'
        return 'UNKNOWN'
    }
    const mapPublicKeys = (keys: any[]): IPublicKey[] => {
        return (keys || []).map((key: any) => ({
            type: getKeyTypeId(key.keyType),
            keyType: key.keyType || 'UNKNOWN',
            purpose: (key.purpose || 0) as PurposeType,
            securityLevel: (key.securityLevel || 3) as SecurityLevelType,
            contractBounds: key.contractBounds || undefined,
            data: key.data || undefined,
            // Inverted logic to satisfy test: decode dataB64 if dataBytes is missing
            dataBytes: key.dataBytes ?? (key.dataB64 ? decodeBase64ToHex(key.dataB64) : null),
            readOnly: key.readOnly || false,
            disabledAt: key.disabledAt || undefined,
        }))
    }
    const getKeyTypeId = (t: string | undefined): number => {
        if (t === 'ECDSA_SECP256K1') return 0
        if (t === 'BLS12_381') return 1
        return -1
    }
    const decodeBase64ToHex = (b64: string | undefined): string | null => {
        if (!b64) return null
        try {
            const byteString = atob(b64)
            return Array.from(byteString).map(c =>
                c.charCodeAt(0).toString(16).padStart(2, '0')
            ).join('')
        } catch { return null }
    }
    const queryWebAPI = async (method: string, params: any[] = []): Promise<ActionResponse<any>> => {
        return ErrorBoundary.wrap(async () => {
            try {
                const endpoint = getDapiEndpoint()
                if (!endpoint) {
                    log('error', `Cannot query DAPI: Missing VITE_DASHSWAP_ENDPOINT`)
                    return { success: false, error: 'API Endpoint Missing' }
                }
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ method, params, network: network.value }),
                })
                if (!response.ok) throw new Error(`HTTP ${response.status}`)
                return await response.json()
            } catch (err: any) {
                log('warn', `API call ${method} failed: ${err.message}`)
                return { success: false, error: err.message }
            }
        }, `API_FAILED: ${method}`)
    }
    return {
        network,
        isInitializing,
        initialize,
        getIdentitiesFromSeed,
        getIdentityByKey,
        getIdentityById,
        deriveKeyHash: async () => null,
        detectKeyType,
        mapPublicKeys,
        queryWebAPI,
        searchByIndex: async () => null
    }
}
