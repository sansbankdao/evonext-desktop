// src/composables/useIdentityDiscovery.ts
import { ref } from 'vue'
import { ErrorBoundary, type ActionResponse } from '@/utils/errors'
import { log, getDapiEndpoint } from '@/utils/env'
import { DEFAULT_IDENTITY_SEARCH_LIMIT, DEFAULT_QUERY_REGISTRY } from '@/constants'
import { useNetwork } from './useNetwork'
import type { IIdentity, IPublicKey, PurposeType, SecurityLevelType, IdentitySearchOptions } from '@/types'
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
                network.value = await ensure()
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
            log('debug', `Searching identities from seed with options:`, { minIndexSearch, queryRegistry })
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
                            balance: '0',  // Fix: Missing property
                            revision: 0    // Fix: Missing property
                        })
                    }
                }
            } catch (err) {
                log('warn', 'Direct seed discovery failed, falling back to index search...', err)
            }
            // Fallback: Index-based search
            if (identities.length === 0) {
                log('debug', 'No identities found via direct method, trying index search...')
                for (let i = 0; i < minIndexSearch; i++) {
                    const result = await searchByIndex(i, queryRegistry, seedPhrase)
                    if (result) {
                        identities.push({
                            identityId: result.identityId,
                            identityIdx: i,
                            publicKeys: mapPublicKeys(result.regPubKeys || []),
                            balance: result.balance || '0', // Fix: Missing property
                            revision: result.revision ? Number(result.revision) : 0 // Fix: Missing property
                        })
                        break
                    }
                }
            }
            if (identities.length === 0) {
                log('warn', 'No identities found for the provided seed phrase.')
                return null
            }
            log('info', `Found ${identities.length} identities`)
            return identities
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
                        balance: '0',
                        revision: 0
                    },
                    keyType: detectKeyType(keyInput)
                }
            }
            const hash = await deriveKeyHash(keyInput)
            if (hash) {
                const hashApiRes = await queryWebAPI('get_identity_by_public_key_hash', [hash])
                const hashResult = hashApiRes.success ? hashApiRes.data : null
                if (hashResult?.success && hashResult?.result?.identityId) {
                    return {
                        identity: {
                            identityId: hashResult.result.identityId,
                            identityIdx: 0,
                            publicKeys: mapPublicKeys(hashResult.result.publicKeys || []),
                            balance: '0',
                            revision: 0
                        },
                        keyType: detectKeyType(keyInput)
                    }
                }
            }
            return null
        }, 'GET_IDENTITY_BY_KEY_FAILED')
    }
    // Lookup identity directly by ID
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
        _identityIdx: number,
        _queryRegistry: boolean,
        _seedPhrase?: string
    ): Promise<{ identityId: string; regPubKeys: any[]; balance?: string; revision?: string } | null> => {
        try {
            return null
        } catch (err) {
            return null
        }
    }
    const deriveKeyHash = async (keyInput: string): Promise<string | null> => {
        try {
            const apiRes = await queryWebAPI('derive_public_key_hash', [keyInput])
            const response = apiRes.success ? apiRes.data : null
            return response?.result?.hash || null
        } catch (err) {
            return null
        }
    }
    const detectKeyType = (keyInput: string): string => {
        const cleanKey = keyInput.trim()
        if (/^[cKL][0-9A-Za-z]{50,}$/.test(cleanKey)) return 'WIF'
        if (/^[0-9a-fA-F]{64}$/.test(cleanKey)) return 'HEX'
        if (/^0[23][0-9a-fA-F]{64}$/.test(cleanKey)) return 'COMPRESSED_PUBKEY'
        if (/^04[0-9a-fA-F]{128}$/.test(cleanKey)) return 'UNCOMPRESSED_PUBKEY'
        return 'UNKNOWN'
    }
    const mapPublicKeys = (keys: any[]): IPublicKey[] => {
        return (keys || []).map((key) => {
            const purpose = getPurposeNumber(key.purpose)
            const securityLevel = getSecurityLevelNumber(key.securityLevel)
            return {
                type: getKeyTypeId(key.keyType),
                keyType: key.keyType || 'UNKNOWN',
                purpose: purpose as PurposeType,
                securityLevel: securityLevel as SecurityLevelType,
                contractBounds: key.contractBounds || null,
                data: key.data || '',
                dataBytes: decodeBase64ToHex(key.dataB64 || ''),
                readOnly: key.readOnly || false,
                disabledAt: key.disabledAt || null,
            }
        })
    }
    const getKeyTypeId = (keyType: string | undefined): number => {
        switch(keyType?.toUpperCase()) {
            case 'ECDSA_SECP256K1': return 0
            case 'BLS12_381': return 1
            case 'ECDSA_HASH160': return 2
            case 'BIP13_SCRIPT_HASH': return 3
            case 'EDDSA_25519_HASH160': return 4
            default: return -1
        }
    }
    const getPurposeNumber = (purpose: string | number | undefined): 0 | 1 | 2 | 3 => {
        const purposeNum = typeof purpose === 'string' ? parseInt(purpose) : (purpose || 0)
        return [0, 1, 2, 3].includes(purposeNum) ? (purposeNum as 0 | 1 | 2 | 3) : 0
    }
    const getSecurityLevelNumber = (securityLevel: string | number | undefined): 0 | 1 | 2 | 3 | 4 => {
        const levelNum = typeof securityLevel === 'string' ? parseInt(securityLevel) : (securityLevel || 3)
        return [0, 1, 2, 3, 4].includes(levelNum) ? (levelNum as 0 | 1 | 2 | 3 | 4) : 3
    }
    const decodeBase64ToHex = (base64String: string): string | null => {
        try {
            const byteString = atob(base64String)
            const bytes: string[] = []
            for (let i = 0; i < byteString.length; i++) {
                bytes.push(byteString.charCodeAt(i).toString(16).padStart(2, '0'))
            }
            return bytes.join('')
        } catch (e) {
            return null
        }
    }
    const queryWebAPI = async (method: string, params: any[] = []): Promise<ActionResponse<any>> => {
        return ErrorBoundary.wrap(async () => {
            const endpoint = getDapiEndpoint()
            const body = JSON.stringify({
                method,
                params,
                network: network.value,
            })
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
            })
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
            return await response.json()
        }, `QUERY_WEB_API_FAILED: ${method}`)
    }
    return {
        network,
        isInitializing,
        initialize,
        getIdentitiesFromSeed,
        getIdentityByKey,
        getIdentityById,
        searchByIndex,
        deriveKeyHash,
        detectKeyType,
        mapPublicKeys,
        queryWebAPI
    }
}
