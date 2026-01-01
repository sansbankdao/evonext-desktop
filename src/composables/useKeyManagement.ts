// src/composables/useKeyManagement.ts
import { ref, computed } from 'vue'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKeyWASM } from 'pshenmic-dpp'
// @ts-ignore
import { hash160 } from '@evonext/crypto'
// @ts-ignore
import { binToHex } from '@evonext/utils'
import { useNetwork } from './useNetwork'
import { useIdentityStore } from '@/stores/identity'
import type { KeyDerivationResult, DerivedKey, IPublicKey } from '@/types'
import { log } from '@/utils/env'

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

export function useKeyManagement() {
    const { network, ensure } = useNetwork()
    const identityStore = useIdentityStore()

    // State
    const sdk = ref<DashPlatformSDK | null>(null)
    const mnemonic = ref<string>('')
    const isInitialized = ref(false)
    const loading = ref(false)
    const error = ref<string | null>(null)

    // Constants
    const DEFAULT_KEYCHAIN = {
        0: { // AUTHENTICATION
            0: { keyIdx: 0, keyType: 'ECDSA_HASH160', securityLevel: 0 }, // MASTER
            1: { keyIdx: 1, keyType: 'ECDSA_HASH160', securityLevel: 1 }, // CRITICAL
            2: { keyIdx: 2, keyType: 'ECDSA_HASH160', securityLevel: 2 }, // HIGH
        },
        1: { // TRANSFER
            1: { keyIdx: 3, keyType: 'ECDSA_HASH160', securityLevel: 1 }, // CRITICAL
        },
        2: { // ENCRYPTION
            3: { keyIdx: 4, keyType: 'ECDSA_SECP256K1', securityLevel: 3 }, // MEDIUM
        }
    }

    // Initialization
    const initialize = async (): Promise<void> => {
        if (isInitialized.value) return

        loading.value = true
        error.value = null

        try {
            const currentNetwork = await ensure()
            // TODO: Replace with proper mnemonic retrieval via Tauri
            const storedMnemonic = localStorage.getItem('evonext_mnemonic')
            if (!storedMnemonic) {
                throw new Error('Mnemonic not found')
            }
            mnemonic.value = storedMnemonic
            sdk.value = new DashPlatformSDK({ network: currentNetwork })
            isInitialized.value = true
            log('info', `KeyManagement initialized for network: ${currentNetwork}`)
        } catch (err: any) {
            error.value = err.message || 'Failed to initialize key management'
            throw err
        } finally {
            loading.value = false
        }
    }

    // Private key derivation
    const deriveKey = async (identityIdx: number, keyIdx: number): Promise<PrivateKeyWASM> => {
        if (!sdk.value) {
            await initialize()
        }

        const seed = await sdk.value!.keyPair.mnemonicToSeed(mnemonic.value, undefined)
        const walletHDKey = sdk.value!.keyPair.seedToHdKey(seed)
        const hdKey = sdk.value!.keyPair.deriveIdentityPrivateKey(
            walletHDKey, identityIdx, keyIdx, network.value
        )

        return PrivateKeyWASM.fromHex(binToHex(hdKey.privateKey), network.value)
    }

    // Get private keys with structured result
    const getPrivateKeys = async (
        identityIdx: number
    ): Promise<KeyDerivationResult> => {
        loading.value = true
        error.value = null

        try {
            if (!sdk.value) {
                await initialize()
            }

            log('debug', `Getting private keys for identity index: ${identityIdx}`)

            const keys: DerivedKey[] = []

            // Derive standard key set (0-4)
            for (let keyIdx = 0; keyIdx < 5; keyIdx++) {
                const privateKey = await deriveKey(identityIdx, keyIdx)
                const publicKey = privateKey.getPublicKey()
                const publicKeyHash = binToHex(hash160(publicKey.bytes()))

                // Determine purpose and security level based on key index
                let purpose: number
                let securityLevel: number
                let purposeStr: string
                let securityLevelStr: string

                switch (keyIdx) {
                    case 0:
                        purpose = 0 // AUTHENTICATION
                        securityLevel = 0 // MASTER
                        purposeStr = 'AUTHENTICATION'
                        securityLevelStr = 'MASTER'
                        break
                    case 1:
                        purpose = 0 // AUTHENTICATION
                        securityLevel = 1 // CRITICAL
                        purposeStr = 'AUTHENTICATION'
                        securityLevelStr = 'CRITICAL'
                        break
                    case 2:
                        purpose = 0 // AUTHENTICATION
                        securityLevel = 2 // HIGH
                        purposeStr = 'AUTHENTICATION'
                        securityLevelStr = 'HIGH'
                        break
                    case 3:
                        purpose = 1 // TRANSFER
                        securityLevel = 1 // CRITICAL
                        purposeStr = 'TRANSFER'
                        securityLevelStr = 'CRITICAL'
                        break
                    case 4:
                        purpose = 2 // ENCRYPTION
                        securityLevel = 3 // MEDIUM
                        purposeStr = 'ENCRYPTION'
                        securityLevelStr = 'MEDIUM'
                        break
                    default:
                        purpose = -1
                        securityLevel = -1
                        purposeStr = 'UNKNOWN'
                        securityLevelStr = 'UNKNOWN'
                }

                keys.push({
                    keyIndex: keyIdx,
                    purpose: purposeStr,
                    securityLevel: securityLevelStr,
                    privateKey,
                    publicKey: binToHex(publicKey.bytes()),
                    publicKeyHash
                })
            }

            const result: KeyDerivationResult = {
                identityIndex: identityIdx,
                keys,
                success: true
            }

            log('debug', `Successfully derived keys for identity index: ${identityIdx}`)
            return result

        } catch (err: any) {
            error.value = err.message || 'Failed to derive private keys'
            log('error', 'Failed to derive private keys:', err)
            return {
                identityIndex: identityIdx,
                keys: [],
                success: false,
                error: error.value || ''
            }
        } finally {
            loading.value = false
        }
    }

    // Get specific key by purpose and security level
    const getKeyByPurpose = async (
        identityIdx: number,
        purpose: number,
        securityLevel: number
    ): Promise<any | null> => {
        const result = await getPrivateKeys(identityIdx)
        if (!result.success || !result.keys) return null

        return result.keys.find(key => {
            const keyPurpose = key.purpose === 'AUTHENTICATION' ? 0 :
                              key.purpose === 'TRANSFER' ? 1 :
                              key.purpose === 'ENCRYPTION' ? 2 : -1

            const keySecurityLevel = key.securityLevel === 'MASTER' ? 0 :
                                   key.securityLevel === 'CRITICAL' ? 1 :
                                   key.securityLevel === 'HIGH' ? 2 :
                                   key.securityLevel === 'MEDIUM' ? 3 :
                                   key.securityLevel === 'LOW' ? 4 : -1

            return keyPurpose === purpose && keySecurityLevel === securityLevel
        })?.privateKey || null
    }

    // Get auth key (MASTER AUTHENTICATION)
    const getAuthKey = async (identityIdx: number): Promise<string | null> => {
        try {
            const identity = identityStore.identity
            if (!identity) {
                log('error', '[GET_AUTH_KEY] No active identity found')
                return null
            }

            // Find MASTER AUTHENTICATION key
            const masterAuthKey = identity.publicKeys?.find(key =>
                key.purpose === 0 && // 0 = AUTHENTICATION
                key.securityLevel === 0 // 0 = MASTER
            )

            if (!masterAuthKey) {
                log('error', '[GET_AUTH_KEY] Identity has no MASTER AUTHENTICATION key')
                return null
            }

            const privateKey = await getKeyByPurpose(identityIdx, 0, 0)
            return privateKey?.WIF() || null

        } catch (err: any) {
            log('error', 'Failed to get auth key:', err)
            return null
        }
    }

    // Get transfer key
    const getTransferKey = async (identityIdx: number): Promise<string | null> => {
        try {
            const privateKey = await getKeyByPurpose(identityIdx, 1, 1) // TRANSFER, CRITICAL
            return privateKey?.WIF() || null
        } catch (err: any) {
            log('error', 'Failed to get transfer key:', err)
            return null
        }
    }

    // Keychain management
    const loadKeychain = async (identityId: string, identityIdx: number): Promise<KeychainEntry | null> => {
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

    const saveKeychain = async (
        identityId: string,
        identityIdx: number,
        publicKeys: IPublicKey[]
    ): Promise<void> => {
        try {
            const stored = localStorage.getItem('evonext_keychain')
            const keychains: Record<string, KeychainEntry> = stored ? JSON.parse(stored) : {}

            const entry: KeychainEntry = {
                identityId,
                identityIdx,
                keys: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }

            // Map registered keys
            publicKeys.forEach(key => {
                if (!entry.keys[(key.purpose as number)]) {
                    entry.keys[(key.purpose as number)] = {}
                }

                const purposeMap = DEFAULT_KEYCHAIN[key.purpose as keyof typeof DEFAULT_KEYCHAIN]
                let keyIdx = -1

                if (purposeMap) {
                    // Find matching security level
                    for (const [securityLevelStr, keyInfo] of Object.entries(purposeMap)) {
                        const securityLevel = parseInt(securityLevelStr)
                        if (securityLevel === key.securityLevel) {
                            keyIdx = (keyInfo as any).keyIdx
                            break
                        }
                    }
                }

                entry.keys[key.purpose][key.securityLevel] = {
                    keyIdx: keyIdx !== -1 ? keyIdx : findBestMatch(key),
                    keyType: key.keyType,
                    securityLevel: key.securityLevel,
                    registered: true,
                    registeredAt: new Date().toISOString()
                }
            })

            // Add missing keys from default keychain
            for (const [purposeStr, purposeMap] of Object.entries(DEFAULT_KEYCHAIN)) {
                const purpose = parseInt(purposeStr)
                if (!entry.keys[purpose]) {
                    entry.keys[purpose] = {}
                }

                for (const [securityLevelStr, keyInfo] of Object.entries(purposeMap)) {
                    const securityLevel = parseInt(securityLevelStr)
                    if (!entry.keys[purpose][securityLevel]) {
                        entry.keys[purpose][securityLevel] = {
                            ...(keyInfo as any),
                            registered: false
                        }
                    }
                }
            }

            keychains[identityId] = entry
            localStorage.setItem('evonext_keychain', JSON.stringify(keychains))
            log('info', `Keychain saved for identity: ${identityId}`)

        } catch (error) {
            log('error', 'Failed to save keychain:', error)
        }
    }

    const getMissingKeys = async (identityId: string): Promise<Array<{
        purpose: number,
        securityLevel: number,
        keyType: string
    }>> => {
        const entry = await loadKeychain(identityId, 0)
        if (!entry) return []

        const missing: Array<{
            purpose: number,
            securityLevel: number,
            keyType: string
        }> = []

        for (const [purposeStr, purposeKeys] of Object.entries(entry.keys)) {
            const purpose = parseInt(purposeStr)
            for (const [securityLevelStr, keyInfo] of Object.entries(purposeKeys)) {
                const securityLevel = parseInt(securityLevelStr)
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

    // Helper function
    const findBestMatch = (key: IPublicKey): number => {
        if (key.purpose === 0) { // AUTHENTICATION
            if (key.securityLevel === 0) return 0
            if (key.securityLevel === 1) return 1
            if (key.securityLevel === 2) return 2
        } else if (key.purpose === 1) { // TRANSFER
            return 3
        } else if (key.purpose === 2) { // ENCRYPTION
            return 4
        }
        return -1
    }

    return {
        // State
        loading: computed(() => loading.value),
        error: computed(() => error.value),

        // Key derivation
        getPrivateKeys,
        getAuthKey,
        getTransferKey,
        getKeyByPurpose,
        deriveKey,

        // Keychain management
        loadKeychain,
        saveKeychain,
        getMissingKeys,

        // Initialization
        initialize,
        isInitialized: computed(() => isInitialized.value),

        // Reset
        reset: () => {
            sdk.value = null
            mnemonic.value = ''
            isInitialized.value = false
            loading.value = false
            error.value = null
        }
    }
}
