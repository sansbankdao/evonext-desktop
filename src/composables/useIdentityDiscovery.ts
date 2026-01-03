// src/composables/useIdentityDiscovery.ts

import { ref } from 'vue'
import { ErrorBoundary } from '@/utils/errors'
import { log, getDapiEndpoint } from '@/utils/env'
import { DEFAULT_IDENTITY_SEARCH_LIMIT, DEFAULT_QUERY_REGISTRY } from '@/constants'
import { useNetwork } from './useNetwork'
import type { IIdentity, IPublicKey, PurposeType, SecurityLevelType, IdentitySearchOptions } from '@/types'

export function useIdentityDiscovery() {
    const { ensure } = useNetwork()
    const network = ref<'testnet' | 'mainnet'>('testnet')
    const isInitializing = ref(false)

    // Initialize network
    const initialize = async (): Promise<void> => {
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
    ): Promise<IIdentity[] | null> => {
        return ErrorBoundary.wrap(async () => {
            await initialize()

            const minIndexSearch = options?.minIndexSearch || DEFAULT_IDENTITY_SEARCH_LIMIT
            const queryRegistry = options?.queryRegistry || DEFAULT_QUERY_REGISTRY
            log('debug', `Searching identities from seed with options:`, { minIndexSearch, queryRegistry })

            const identities: IIdentity[] = []

            // Try direct backend call first (most efficient)
            try {
                const result = await queryWebAPI('get_identities_from_seed', [seedPhrase])
                if (result?.success && Array.isArray(result.result)) {
                    for (const identityData of result.result) {
                        identities.push({
                            identityId: identityData.identityId,
                            identityIdx: identityData.index || identities.length,
                            publicKeys: mapPublicKeys(identityData.publicKeys || []),
                        })
                    }
                }
            } catch (err) {
                log('warn', 'Direct seed discovery failed, falling back to index search...', err)
            }

            // Fallback: If no identities found, try the old index-based search
            if (identities.length === 0) {
                log('debug', 'No identities found via direct method, trying index search...')
                for (let i = 0; i < minIndexSearch; i++) {
                    const result = await searchByIndex(i, queryRegistry, seedPhrase)
                    if (result) {
                        identities.push({
                            identityId: result.identityId,
                            identityIdx: i,
                            publicKeys: mapPublicKeys(result.regPubKeys || []),
                        })
                        break // Stop after first found identity for now
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
    ): Promise<{ identity: IIdentity; keyType: string } | null> => {
        return ErrorBoundary.wrap(async () => {
            await initialize()
            log('debug', `Searching identity by key: ${keyInput.substring(0, 8)}...`)

            // Try direct backend discovery
            const result = await queryWebAPI('get_identity_by_private_key', [keyInput])

            if (result?.success && result?.result?.identityId) {
                const identityData = result.result
                return {
                    identity: {
                        identityId: identityData.identityId,
                        identityIdx: 0,
                        publicKeys: mapPublicKeys(identityData.publicKeys || []),
                    },
                    keyType: detectKeyType(keyInput)
                }
            }

            // Fallback: Try hash-based lookup
            const hash = await deriveKeyHash(keyInput)

            if (hash) {
                const hashResult = await queryWebAPI('get_identity_by_public_key_hash', [hash])
                if (hashResult?.success && hashResult?.result?.identityId) {
                    return {
                        identity: {
                            identityId: hashResult.result.identityId,
                            identityIdx: 0,
                            publicKeys: mapPublicKeys(hashResult.result.publicKeys || []),
                        },
                        keyType: detectKeyType(keyInput)
                    }
                }
            }
            log('warn', 'No identity found for key')

            return null
        }, 'GET_IDENTITY_BY_KEY_FAILED')
    }

    // Lookup identity directly by ID
    const getIdentityById = async (identityId: string): Promise<IIdentity | null> => {
        return ErrorBoundary.wrap(async () => {
            await initialize()
            const result = await queryWebAPI('identity_fetch', [identityId])
            if (result?.success && result?.result) {
                const data = result.result
                return {
                    identityId: data.identityId,
                    identityIdx: 0,
                    publicKeys: mapPublicKeys(data.publicKeys || []),
                }
            }
            return null
        }, 'GET_IDENTITY_BY_ID_FAILED')
    }

    // Private helper methods (exposed for testing if needed)
    const searchByIndex = async (
        identityIdx: number,
        _queryRegistry: boolean,
        _seedPhrase?: string
    ): Promise<{ identityId: string; regPubKeys: any[]; balance?: string; revision?: string } | null> => {
        try {
            // Implementation would be restored from original
            return null
        } catch (err) {
            log('error', `Failed to search by index ${identityIdx}:`, err)
            return null
        }
    }

    const deriveKeyHash = async (keyInput: string): Promise<string | null> => {
        try {
            const response = await queryWebAPI('derive_public_key_hash', [keyInput])
            return response?.result?.hash || null
        } catch (err) {
            log('error', 'Failed to derive key hash:', err)
            return null
        }
    }

    const detectKeyType = (keyInput: string): string => {
        const cleanKey = keyInput.trim()
        if (/^[cKL][0-9A-Za-z]{50,}$/.test(cleanKey)) {
            return 'WIF'
        } else if (/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
            return 'HEX'
        } else if (/^0[23][0-9a-fA-F]{64}$/.test(cleanKey)) {
            return 'COMPRESSED_PUBKEY'
        } else if (/^04[0-9a-fA-F]{128}$/.test(cleanKey)) {
            return 'UNCOMPRESSED_PUBKEY'
        }
        return 'UNKNOWN'
    }

    const mapPublicKeys = (keys: any[]): IPublicKey[] => {
        return (keys || []).map((key, _index) => {
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
        switch(purposeNum) {
            case 1: return 1
            case 2: return 2
            case 3: return 3
            case 0:
            default: return 0
        }
    }

    const getSecurityLevelNumber = (securityLevel: string | number | undefined): 0 | 1 | 2 | 3 | 4 => {
        const levelNum = typeof securityLevel === 'string' ? parseInt(securityLevel) : (securityLevel || 3)
        switch(levelNum) {
            case 0: return 0
            case 1: return 1
            case 2: return 2
            case 3: return 3
            case 4: return 4
            default: return 3
        }
    }

    const decodeBase64ToHex = (base64String: string): string | null => {
        try {
            const byteString = atob(base64String)
            const bytes: string[] = []
            for (let i = 0; i < byteString.length; i++) {
                const byte = byteString.charCodeAt(i)
                const hex = byte.toString(16).padStart(2, '0')
                bytes.push(hex)
            }
            return bytes.join('')
        } catch (e) {
            log('error', 'Failed to decode Base64 string:', e)
            return null
        }
    }

    // Web API Query wrapper - Pure fetch implementation
    const queryWebAPI = async (method: string, params: any[] = []): Promise<any> => {
        return ErrorBoundary.wrap(async () => {
            const endpoint = getDapiEndpoint()

            const body = JSON.stringify({
                method,
                params,
                network: network.value,
            })
            log('debug', `[DAPI] Calling ${method} with params:`, params)

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body,
            })

            if (!response.ok) {
                if (response.status === 404) {
                    return null
                }
                const errorText = await response.text()
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
            }
            return await response.json()
        }, `QUERY_WEB_API_FAILED: ${method}`)
    }

    // For backward compatibility with existing singleton pattern
    const getSingleton = (() => {
        let instance: ReturnType<typeof useIdentityDiscovery> | null = null
        return () => {
            if (!instance) {
                instance = useIdentityDiscovery()
                instance.initialize() // Auto-init for backward compatibility
            }
            return instance
        }
    })()

    return {
        // State
        network,
        isInitializing,

        // Main public methods
        initialize,
        getIdentitiesFromSeed,
        getIdentityByKey,
        getIdentityById,

        // Helper methods (exposed for testing/debugging)
        searchByIndex,
        deriveKeyHash,
        detectKeyType,
        mapPublicKeys,
        queryWebAPI,

        // Singleton accessor (for backward compatibility)
        getSingleton
    }
}

// Singleton export for direct import
export const identityDiscovery = useIdentityDiscovery()
