// src/composables/useIdentityDiscovery.ts
import { ref } from 'vue'
import { ErrorBoundary, type ActionResponse } from '@/utils/errors'
import { log, getDapiEndpoint } from '@/utils/env'
import { DEFAULT_IDENTITY_SEARCH_LIMIT, DEFAULT_QUERY_REGISTRY } from '@/constants'
import { useNetwork } from './useNetwork'
import type {
    IIdentity,
    IPublicKey,
    PurposeType,
    SecurityLevelType,
    IdentitySearchOptions
} from '@/types'
export function useIdentityDiscovery() {
    const { ensure } = useNetwork()
    const network = ref<'testnet' | 'mainnet'>('testnet')
    const isInitializing = ref(false)
    // Initialize network
    const initialize = async (): Promise<ActionResponse<void>> => {
        return ErrorBoundary.wrap(async () => {
            if (isInitializing.value) return
            isInitializing.value = true
            try {
                const net = await ensure()
                network.value = (net === 'mainnet' || net === 'testnet') ? net : 'testnet'
                log('info', `IdentityManager initialized for network: ${network.value}`)
            } finally {
                isInitializing.value = false
            }
        }, 'IDENTITY_MANAGER_INIT_FAILED')
    }
    // Search for identities using a seed phrase
    const getIdentitiesFromSeed = async (
        seedPhrase: string,
        options?: IdentitySearchOptions
    ): Promise<ActionResponse<IIdentity[] | null>> => {
        return ErrorBoundary.wrap(async () => {
            await initialize()
            const minIndexSearch = options?.minIndexSearch || DEFAULT_IDENTITY_SEARCH_LIMIT
            const queryRegistry = options?.queryRegistry || DEFAULT_QUERY_REGISTRY
            const identities: IIdentity[] = []
            // Try direct backend call first
            try {
                const apiRes = await queryWebAPI('get_identities_from_seed', [seedPhrase])
                const result = apiRes.success ? apiRes.data : null
                if (result?.success && Array.isArray(result.result)) {
                    for (const identityData of result.result) {
                        identities.push({
                            identityId: identityData.identityId,
                            identityIdx: identityData.index || identities.length,
                            publicKeys: mapPublicKeys(identityData.publicKeys || []),
                            balance: identityData.balance || '0',
                            revision: identityData.revision || 0
                        })
                    }
                }
            } catch (err) {
                log('warn', 'Direct seed discovery failed, falling back...', err)
            }
            // Fallback: Index-based search
            if (identities.length === 0) {
                for (let i = 0; i < minIndexSearch; i++) {
                    const result = await searchByIndex(i, queryRegistry, seedPhrase)
                    if (result) {
                        identities.push({
                            identityId: result.identityId,
                            identityIdx: i,
                            publicKeys: mapPublicKeys(result.regPubKeys || []),
                            balance: result.balance || '0',
                            revision: result.revision ? Number(result.revision) : 0
                        })
                        break
                    }
                }
            }
            return identities.length > 0 ? identities : null
        }, 'GET_IDENTITIES_FROM_SEED_FAILED')
    }
    // Search for identity by a single private key
    const getIdentityByKey = async (
        keyInput: string,
        _keyType?: 'WIF' | 'HEX' | 'PUBLIC_KEY'
    ): Promise<ActionResponse<{ identity: IIdentity; keyType: string } | null>> => {
        return ErrorBoundary.wrap(async () => {
            await initialize()
            const apiRes = await queryWebAPI('get_identity_by_private_key', [keyInput])
            const result = apiRes.success ? apiRes.data : null
            if (result?.success && result?.result?.identityId) {
                const identityData = result.result
                return {
                    identity: {
                        identityId: identityData.identityId,
                        identityIdx: 0,
                        publicKeys: mapPublicKeys(identityData.publicKeys || []),
                        balance: identityData.balance || '0',
                        revision: identityData.revision || 0
                    },
                    keyType: detectKeyType(keyInput)
                }
            }
            return null
        }, 'GET_IDENTITY_BY_KEY_FAILED')
    }
    const getIdentityById = async (identityId: string): Promise<ActionResponse<IIdentity | null>> => {
        return ErrorBoundary.wrap(async () => {
            await initialize()
            const apiRes = await queryWebAPI('identity_fetch', [identityId])
            const result = apiRes.success ? apiRes.data : null
            if (result?.success && result?.result) {
                const data = result.result
                return {
                    identityId: data.identityId,
                    identityIdx: 0,
                    publicKeys: mapPublicKeys(data.publicKeys || []),
                    balance: data.balance || '0',
                    revision: data.revision ? Number(data.revision) : 0
                }
            }
            return null
        }, 'GET_IDENTITY_BY_ID_FAILED')
    }
    const searchByIndex = async (
        _idx: number, _reg: boolean, _phrase?: string
    ): Promise<any | null> => null
    const deriveKeyHash = async (keyInput: string): Promise<string | null> => {
        const apiRes = await queryWebAPI('derive_public_key_hash', [keyInput])
        return apiRes.success ? apiRes.data?.result?.hash : null
    }
    const detectKeyType = (keyInput: string): string => {
        const cleanKey = keyInput.trim()
        if (/^[cKL][0-9A-Za-z]{50,}$/.test(cleanKey)) return 'WIF'
        if (/^[0-9a-fA-F]{64}$/.test(cleanKey)) return 'HEX'
        if (/^0[23][0-9a-fA-F]{64}$/.test(cleanKey)) return 'COMPRESSED_PUBKEY'
        return 'UNKNOWN'
    }
    const mapPublicKeys = (keys: any[]): IPublicKey[] => {
        return (keys || []).map((key) => ({
            type: getKeyTypeId(key.keyType),
            keyType: key.keyType || 'UNKNOWN',
            purpose: (key.purpose || 0) as PurposeType,
            securityLevel: (key.securityLevel || 3) as SecurityLevelType,
            contractBounds: key.contractBounds || null,
            data: key.data || '',
            dataBytes: decodeBase64ToHex(key.dataB64 || ''),
            readOnly: key.readOnly || false,
            disabledAt: key.disabledAt || null,
        }))
    }
    const getKeyTypeId = (t: string | undefined): number => {
        if (t === 'ECDSA_SECP256K1') return 0
        if (t === 'BLS12_381') return 1
        return -1
    }
    const decodeBase64ToHex = (b64: string): string | null => {
        try {
            const byteString = atob(b64)
            return Array.from(byteString).map(c =>
                c.charCodeAt(0).toString(16).padStart(2, '0')
            ).join('')
        } catch { return null }
    }
    const queryWebAPI = async (method: string, params: any[] = []): Promise<ActionResponse<any>> => {
        return ErrorBoundary.wrap(async () => {
            const response = await fetch(getDapiEndpoint(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ method, params, network: network.value }),
            })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            return await response.json()
        }, `API_FAILED: ${method}`)
    }
    return {
        network,
        isInitializing,
        initialize,
        getIdentitiesFromSeed,
        getIdentityByKey,
        getIdentityById,
        deriveKeyHash,
        detectKeyType,
        mapPublicKeys,
        queryWebAPI
    }
}
