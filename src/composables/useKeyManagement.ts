// src/composables/useKeyManagement.ts

import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'

import { EvoSDK } from '@dashevo/evo-sdk'
import { PrivateKeyWASM } from 'pshenmic-dpp'

// @ts-ignore
import { hash160 } from '@evonext/crypto'
// @ts-ignore
import { binToHex } from '@evonext/utils'

import { useNetwork } from './useNetwork'
import { log } from '@/utils/env'

import type {
    IPublicKey,
    // PurposeType,
    // SecurityLevelType,
} from '@/types'
import type { PrivateKeyEntry } from '@/types/identity'

// Define Types Locally to avoid import errors
interface DerivedKey {
    keyIndex: number
    purpose: string
    securityLevel: string
    privateKey: PrivateKeyWASM
    publicKey: string
    publicKeyHash: string
}

interface KeyDerivationResult {
    identityIndex: number
    keys: DerivedKey[]
    success: boolean
    error?: string
}

interface KeychainEntry {
    identityId: string
    identityIdx: number
    keys: {
        [purpose: number]: {
            [securityLevel: number]: {
                keyIdx: number
                keyType: string
                securityLevel: number
                registered: boolean
                registeredAt?: string
            }
        }
    }
    createdAt: string
    updatedAt: string
}

// New Type for the result of getTransferKey
export interface KeyPair {
    privateKey: string
    keyId: number
}

type ParsedPurpose = 0 | 1 | 2 | 3
type ParsedSecurityLevel = 0 | 1 | 2 | 3

export function useKeyManagement() {
    const { ensure } = useNetwork()

    // State
    const mnemonic = ref<string>('')
    const isInitialized = ref(false)
    const loading = ref(false)
    const error = ref<string | null>(null)

    // Constants
    // const EVONEXT_DEFAULT_KEYCHAIN = {
    //         0: { keyIdx: 0, keyType: 'ECDSA_HASH160', securityLevel: 0 },   // AUTHENTICATION_MASTER
    //         1: { keyIdx: 1, keyType: 'ECDSA_HASH160', securityLevel: 1 },   // AUTHENTICATION_CRITICAL
    //         2: { keyIdx: 2, keyType: 'ECDSA_HASH160', securityLevel: 2 },   // AUTHENTICATION_HIGH
    //         3: { keyIdx: 3, keyType: 'ECDSA_HASH160', securityLevel: 1 },   // TRANSFER_CRITICAL
    //         4: { keyIdx: 4, keyType: 'ECDSA_SECP256K1', securityLevel: 3 }, // ENCRYPTION_MEDIUM (NOTE: Key type MUST be "ECDSA_SECP256K1")
    // } as const

    const parsePurpose = (purpose: string | number): ParsedPurpose => {
        if (typeof purpose === 'string') {
            const parsed = parseInt(purpose)
            if (parsed === 0 || parsed === 1 || parsed === 2 || parsed === 3) {
                return parsed
            }
            return 0
        }
        return purpose as ParsedPurpose
    }

    const parseSecurityLevel = (level: string | number): ParsedSecurityLevel => {
        if (typeof level === 'string') {
            const parsed = parseInt(level)
            if (parsed >= 0 && parsed <= 4) {
                return parsed as ParsedSecurityLevel
            }
            return 0
        }
        return level as ParsedSecurityLevel
    }

    const initialize = async (): Promise<void> => {
        if (isInitialized.value) return
        loading.value = true
        error.value = null
        try {
            await ensure()
            const storedMnemonic = localStorage.getItem('evonext_mnemonic')
            if (!storedMnemonic) {
                log('info', 'No mnemonic found in localStorage')
            } else {
                mnemonic.value = storedMnemonic
            }
            isInitialized.value = true
            log('info', `KeyManagement initialized for network`)
        } catch (err: any) {
            error.value = err.message || 'Failed to initialize key management'
            throw err
        } finally {
            loading.value = false
        }
    }

    // =========================================================================
    //  FILE BASED KEY MANAGEMENT (Rust Integration)
    // =========================================================================
    const getTransferKeyFromFile = async (identityId: string): Promise<KeyPair | null> => {
        try {
            const currentNetwork = await ensure()

            const networkName = currentNetwork.toLowerCase() === 'mainnet' ? 'mainnet' : 'testnet'
            log('info', `[KeyManagement] Fetching key for identity ${identityId} on network: ${networkName}`)

            const keystoreData: any = await invoke('load_private_keys', {
                network: networkName
            })
            if (!keystoreData || !keystoreData.identities) {
                console.warn(`[KeyManagement] No keystore found for network ${networkName}`)
                return null
            }

            const identitiesMap = keystoreData.identities
            if (!identitiesMap || !identitiesMap[identityId]) {
                console.warn(`[KeyManagement] Identity ${identityId} not found in file`)
                return null
            }

            const identityKeys: PrivateKeyEntry[] = identitiesMap[identityId]
            if (!identityKeys || identityKeys.length === 0) {
                console.warn(`[KeyManagement] No keys found for ${identityId}`)
                return null
            }

            // Filter for TRANSFER keys (Purpose 3)
            const transferKeys = identityKeys.filter((k: PrivateKeyEntry) => k.purpose === 3)
            if (transferKeys.length === 0) {
                console.error(`[KeyManagement] No Transfer keys (purpose: 3) found for identity ${identityId}`)
                return null
            }

            // Select the best Transfer key (Highest Security > Higher ID)
            const bestKey = transferKeys.sort((a, b) => {
                if (b.securityLevel !== a.securityLevel) {
                    return b.securityLevel - a.securityLevel
                }

                return a.keyId - b.keyId
            })[0]
            console.log(`[KeyManagement] Found File Transfer Key for ${identityId}: ID ${bestKey?.keyId}`)

            return {
                privateKey: bestKey?.privateKey || '',
                keyId: bestKey?.keyId || -1
            }
        } catch (err) {
            console.error('[KeyManagement] Failed to retrieve transfer key from file:', err)
            return null
        }
    }

    // =========================================================================
    //  MNEMONIC / WASM KEY MANAGEMENT (Updated for EvoSDK)
    // =========================================================================
    const deriveKey = async (
        identityIdx: number,
        keyIdx: number
    ): Promise<PrivateKeyWASM> => {
        if (!mnemonic.value) {
            await initialize()
        }

        if (!mnemonic.value) {
            throw new Error('Mnemonic not available for derivation')
        }

        const currentNetwork = await ensure()

        // Initialize EvoSDK instance for key derivation
        // We use 'any' temporarily as the SDK types might be strict
        const sdk: any = currentNetwork === 'mainnet'
            ? EvoSDK.mainnetTrusted()
            : EvoSDK.testnetTrusted()

        // 1. Generate Seed from Mnemonic
        const seed = await sdk.keyPair.mnemonicToSeed(mnemonic.value, undefined)

        // 2. Generate Root HD Key
        const walletHDKey = sdk.keyPair.seedToHdKey(seed)

        // 3. Derive Identity Private Key
        const hdKey = sdk.keyPair.deriveIdentityPrivateKey(
            walletHDKey,
            identityIdx,
            keyIdx,
            currentNetwork
        )

        // 4. Wrap in PrivateKeyWASM for usage in DPP/Platform logic
        return PrivateKeyWASM.fromHex(binToHex(hdKey.privateKey), currentNetwork)
    }

    // const getPrivateKeys = async (
    //     identityIdx: number,
    //     _queryRegistry: boolean = false
    // ): Promise<KeyDerivationResult> => {
    //     loading.value = true
    //     error.value = null
    //     try {
    //         if (!mnemonic.value) {
    //             await initialize()
    //         }

    //         if (!mnemonic.value) {
    //             throw new Error('No mnemonic available')
    //         }

    //         log('debug', `Getting private keys for identity index: ${identityIdx}`)
    //         const keys: DerivedKey[] = []

    //         const keyDefinitions = [
    //             { keyIdx: 0, purpose: 0, purposeStr: 'AUTHENTICATION', securityLevel: 0, securityLevelStr: 'MASTER' },
    //             { keyIdx: 1, purpose: 0, purposeStr: 'AUTHENTICATION', securityLevel: 1, securityLevelStr: 'CRITICAL' },
    //             { keyIdx: 2, purpose: 0, purposeStr: 'AUTHENTICATION', securityLevel: 2, securityLevelStr: 'HIGH' },
    //             { keyIdx: 3, purpose: 3, purposeStr: 'TRANSFER', securityLevel: 1, securityLevelStr: 'CRITICAL' },
    //             { keyIdx: 4, purpose: 2, purposeStr: 'ENCRYPTION', securityLevel: 3, securityLevelStr: 'MEDIUM' }
    //         ]

    //         for (const def of keyDefinitions) {
    //             const privateKey = await deriveKey(identityIdx, def.keyIdx)
    //             const publicKey = privateKey.getPublicKey()
    //             const publicKeyHash = binToHex(hash160(publicKey.bytes()))
    //             keys.push({
    //                 keyIndex: def.keyIdx,
    //                 purpose: def.purposeStr,
    //                 securityLevel: def.securityLevelStr,
    //                 privateKey,
    //                 publicKey: binToHex(publicKey.bytes()),
    //                 publicKeyHash
    //             })
    //         }

    //         const result: KeyDerivationResult = {
    //             identityIndex: identityIdx,
    //             keys,
    //             success: true
    //         }
    //         log('debug', `Successfully derived keys for identity index: ${identityIdx}`)
    //         return result
    //     } catch (err: any) {
    //         error.value = err.message || 'Failed to derive private keys'
    //         log('error', 'Failed to derive private keys:', err)
    //         return {
    //             identityIndex: identityIdx,
    //             keys: [],
    //             success: false,
    //             error: error.value || ''
    //         }
    //     } finally {
    //         loading.value = false
    //     }
    // }

    const getKeyByPurpose = async (
        identityId: string,
        purpose: ParsedPurpose,
        securityLevel: ParsedSecurityLevel
    ): Promise<PrivateKeyWASM | null> => {
        try {
            // const result = await getPrivateKeys(identityIdx)
            const currentNetwork = await ensure()

            const networkName = currentNetwork.toLowerCase() === 'mainnet' ? 'mainnet' : 'testnet'
            log('info', `[KeyManagement] Fetching key for identity ${identityId} on network: ${networkName}`)

            const keystoreData: any = await invoke('load_private_keys', {
                network: networkName
            })

alert(`GET PRIVATE KEYS: ${JSON.stringify(keystoreData, null, 2)}`)
const result = keystoreData
            if (!result.success || !result.keys) return null

            const purposeMap: Record<number, string> = {
                0: 'AUTHENTICATION',
                1: 'ENCRYPTION',
                2: 'DECRYPTION',
                3: 'TRANSFER'
            }
            const securityLevelMap: Record<number, string> = {
                0: 'MASTER',
                1: 'CRITICAL',
                2: 'HIGH',
                3: 'MEDIUM',
            }

            const purposeStr = purposeMap[purpose]
            const securityLevelStr = securityLevelMap[securityLevel]

            const foundKey = result.keys.find((key: any) =>
                key.purpose === purposeStr &&
                key.securityLevel === securityLevelStr
            )

            return foundKey?.privateKey || null
        } catch (err) {
            log('error', 'Failed to get key by purpose:', err)
            return null
        }
    }

    const getAuthKey = async (identityId: string): Promise<string | null> => {
        try {
            const privateKey = await getKeyByPurpose(identityId, 0, 1) // OR getKeyByPurpose(identityId, 0, 2)
            return privateKey?.WIF() || null
        } catch (err: any) {
            log('error', 'Failed to get auth key:', err)
            return null
        }
    }

    /**
     * Returns the Master Key as PrivateKeyWASM.
     * Useful for operations requiring signing with the master key.
     */
    const getMasterKey = async (identityId: string): Promise<PrivateKeyWASM | null> => {
        try {
            return await getKeyByPurpose(identityId, 0, 0)
        } catch (err) {
            log('error', 'Failed to get master key:', err)
            return null
        }
    }

    /**
     * Get Transfer Key
     * Updated Strategy:
     * 1. Expects an identityId (string).
     * 2. Looks up the file store to find the registered transfer key.
     * 3. Returns KeyPair { privateKey, keyId } to allow precise signing.
     */
    const getTransferKey = async (identifier: string): Promise<KeyPair | null> => {
        try {
            if (typeof identifier === 'string') {
                return await getTransferKeyFromFile(identifier)
            }
            return null
        } catch (err: any) {
            log('error', 'Failed to get transfer key:', err)
            return null
        }
    }

    const getEncryptionKey = async (identityId: string): Promise<string | null> => {
        try {
            const privateKey = await getKeyByPurpose(identityId, 2, 3)
            return privateKey?.WIF() || null
        } catch (err: any) {
            log('error', 'Failed to get encryption key:', err)
            return null
        }
    }

    const loadKeychain = async (
        identityId: string,
        _identityIdx: number
    ): Promise<KeychainEntry | null> => {
        try {
            const stored = localStorage.getItem('evonext_keychain')

            if (!stored) return null

            const keychains: Record<string, KeychainEntry> = JSON.parse(stored)

            return keychains[identityId] || null
        } catch (error) {
            log('error', 'Failed to load keychain:', error)
            return null
        }
    }

    // const saveKeychain = async (
    //     identityId: string,
    //     identityIdx: number,
    //     publicKeys: IPublicKey[]
    // ): Promise<void> => {
    //     try {
    //         const stored = localStorage.getItem('evonext_keychain')

    //         const keychains: Record<string, KeychainEntry> = stored ? JSON.parse(stored) : {}

    //         const entry: KeychainEntry = {
    //             identityId,
    //             identityIdx,
    //             keys: {},
    //             createdAt: new Date().toISOString(),
    //             updatedAt: new Date().toISOString()
    //         }

    //         publicKeys.forEach(key => {
    //             const purpose = parsePurpose(key.purpose)
    //             const securityLevel = parseSecurityLevel(key.securityLevel)

    //             if (!entry.keys[purpose]) {
    //                 entry.keys[purpose] = {}
    //             }

    //             const purposeMap = DEFAULT_KEYCHAIN[purpose as keyof typeof DEFAULT_KEYCHAIN]

    //             let keyIdx = -1

    //             if (purposeMap) {
    //                 for (const [defaultSecurityLevelStr, keyInfo] of Object.entries(purposeMap)) {
    //                     const defaultSecurityLevel = parseInt(defaultSecurityLevelStr)

    //                     if (defaultSecurityLevel === securityLevel) {
    //                         keyIdx = (keyInfo as any).keyIdx
    //                         break
    //                     }
    //                 }
    //             }

    //             entry.keys[purpose][securityLevel] = {
    //                 keyIdx: keyIdx !== -1 ? keyIdx : findBestMatch(key),
    //                 keyType: key.keyType,
    //                 securityLevel,
    //                 registered: true,
    //                 registeredAt: new Date().toISOString()
    //             }
    //         })

    //         for (const [purposeStr, purposeMap] of Object.entries(DEFAULT_KEYCHAIN)) {
    //             const purpose = parseInt(purposeStr)

    //             if (!entry.keys[purpose]) {
    //                 entry.keys[purpose] = {}
    //             }

    //             for (const [securityLevelStr, keyInfo] of Object.entries(purposeMap)) {
    //                 const securityLevel = parseInt(securityLevelStr)

    //                 if (!entry.keys[purpose][securityLevel]) {
    //                     entry.keys[purpose][securityLevel] = {
    //                         ...(keyInfo as any),
    //                         registered: false
    //                     }
    //                 }
    //             }
    //         }

    //         keychains[identityId] = entry

    //         localStorage.setItem('evonext_keychain', JSON.stringify(keychains))

    //         log('info', `Keychain saved for identity: ${identityId}`)
    //     } catch (error) {
    //         log('error', 'Failed to save keychain:', error)
    //     }
    // }

    const getMissingKeys = async (identityId: string): Promise<{
        purpose: ParsedPurpose,
        securityLevel: ParsedSecurityLevel,
        keyType: string
    }[]> => {
        const entry = await loadKeychain(identityId, 0)

        if (!entry) return []

        const missing: {
            purpose: ParsedPurpose,
            securityLevel: ParsedSecurityLevel,
            keyType: string
        }[] = []

        for (const [purposeStr, purposeKeys] of Object.entries(entry.keys)) {
            const purpose = parseInt(purposeStr) as ParsedPurpose

            for (const [securityLevelStr, keyInfo] of Object.entries(purposeKeys)) {
                const securityLevel = parseInt(securityLevelStr) as ParsedSecurityLevel

                const info = keyInfo as any

                if (!info.registered) {
                    missing.push({
                        purpose,
                        securityLevel,
                        keyType: info.keyType
                    })
                }
            }
        }

        return missing
    }

    // const findBestMatch = (key: IPublicKey): number => {
    //     const purpose = parsePurpose(key.purpose)

    //     const securityLevel = parseSecurityLevel(key.securityLevel)

    //     if (purpose === 0) {
    //         if (securityLevel === 0) return 0
    //         if (securityLevel === 1) return 1
    //         if (securityLevel === 2) return 2
    //     } else if (purpose === 1 || purpose === 3) {
    //         return 3
    //     } else if (purpose === 2) {
    //         return 4
    //     }

    //     return -1
    // }

    /**
     * NOTE: This legacy method uses DashPlatformSDK directly via addTransferKey
     * inside keyDerivation.service.ts in other parts of the app.
     * While the composable now uses EvoSDK for derivation, this method remains
     * for compatibility if explicitly called for legacy STs.
     */
    const addTransferKey = async (
        _identityId: string,
        _identityIdx: number,
        _currentRevision: number,
        _publicKeys: IPublicKey[],
        _keyType: 'ECDSA_HASH160' | 'ECDSA_SECP256K1' = 'ECDSA_HASH160',
        _securityLevel: ParsedSecurityLevel = 1
    ): Promise<{
        success: boolean
        error?: string
        result?: any
    }> => {
        // Import DashPlatformSDK dynamically for this legacy method to avoid main bundle bloat
        // if EvoSDK is now primary, or keep it simple.
        // For this refactoring, we assume DashPlatformSDK is re-imported or passed.
        // To keep this file self-contained and clean, we will rely on EvoSDK logic now.
        throw new Error('addTransferKey legacy logic removed; use EvoSDK.identities.update with Master Key.')
    }

    return {
        loading: computed(() => loading.value),
        error: computed(() => error.value),
        // getPrivateKeys,
        getAuthKey,
        getTransferKey,
        getEncryptionKey,
        getKeyByPurpose,
        deriveKey,
        getMasterKey,
        getTransferKeyFromFile,
        addTransferKey,
        loadKeychain,
        // saveKeychain,
        getMissingKeys,
        parsePurpose,
        parseSecurityLevel,
        initialize,
        isInitialized: computed(() => isInitialized.value),
        reset: () => {
            mnemonic.value = ''
            isInitialized.value = false
            loading.value = false
            error.value = null
        }
    }
}

export type UseKeyManagementReturn = ReturnType<typeof useKeyManagement>
