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
import type {
    IPublicKey,
    PurposeType,
    SecurityLevelType,
} from '@/types'
import { log } from '@/utils/env'
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
type ParsedPurpose = 0 | 1 | 2 | 3
type ParsedSecurityLevel = 0 | 1 | 2 | 3 | 4
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
        0: { // AUTHENTICATION (purpose 0)
            0: { keyIdx: 0, keyType: 'ECDSA_HASH160', securityLevel: 0 }, // MASTER
            1: { keyIdx: 1, keyType: 'ECDSA_HASH160', securityLevel: 1 }, // CRITICAL
            2: { keyIdx: 2, keyType: 'ECDSA_HASH160', securityLevel: 2 }, // HIGH
        },
        1: { // TRANSFER (purpose 3) - Note: purpose 3 is TRANSFER, but stored here
            1: { keyIdx: 3, keyType: 'ECDSA_HASH160', securityLevel: 1 }, // CRITICAL
        },
        2: { // ENCRYPTION (purpose 2)
            3: { keyIdx: 4, keyType: 'ECDSA_SECP256K1', securityLevel: 3 }, // MEDIUM
        }
    } as const
    // Helper to parse purpose/security level
    const parsePurpose = (purpose: string | number): ParsedPurpose => {
        if (typeof purpose === 'string') {
            const parsed = parseInt(purpose)
            if (parsed === 0 || parsed === 1 || parsed === 2 || parsed === 3) {
                return parsed
            }
            return 0 // Default to AUTHENTICATION
        }
        return purpose as ParsedPurpose
    }
    const parseSecurityLevel = (level: string | number): ParsedSecurityLevel => {
        if (typeof level === 'string') {
            const parsed = parseInt(level)
            if (parsed >= 0 && parsed <= 4) {
                return parsed as ParsedSecurityLevel
            }
            return 0 // Default to MASTER
        }
        return level as ParsedSecurityLevel
    }
    // Initialization
    const initialize = async (): Promise<void> => {
        if (isInitialized.value) return
        loading.value = true
        error.value = null
        try {
            const currentNetwork = await ensure()
            // TODO: Replace with Tauri invoke
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
    const deriveKey = async (
        identityIdx: number,
        keyIdx: number
    ): Promise<PrivateKeyWASM> => {
        if (!sdk.value) {
            await initialize()
        }
        const seed = await sdk.value!.keyPair.mnemonicToSeed(mnemonic.value, undefined)
        const walletHDKey = sdk.value!.keyPair.seedToHdKey(seed)
        const hdKey = sdk.value!.keyPair.deriveIdentityPrivateKey(
            walletHDKey,
            identityIdx,
            keyIdx,
            network.value
        )
        return PrivateKeyWASM.fromHex(binToHex(hdKey.privateKey), network.value)
    }
    // Get all private keys for an identity
    const getPrivateKeys = async (
        identityIdx: number,
        _queryRegistry: boolean = false
    ): Promise<KeyDerivationResult> => {
        loading.value = true
        error.value = null
        try {
            if (!sdk.value) {
                await initialize()
            }
            log('debug', `Getting private keys for identity index: ${identityIdx}`)
            const keys: DerivedKey[] = []
            // Standard 5 key indices (0-4)
            const keyDefinitions = [
                { keyIdx: 0, purpose: 0, purposeStr: 'AUTHENTICATION', securityLevel: 0, securityLevelStr: 'MASTER' },
                { keyIdx: 1, purpose: 0, purposeStr: 'AUTHENTICATION', securityLevel: 1, securityLevelStr: 'CRITICAL' },
                { keyIdx: 2, purpose: 0, purposeStr: 'AUTHENTICATION', securityLevel: 2, securityLevelStr: 'HIGH' },
                { keyIdx: 3, purpose: 3, purposeStr: 'TRANSFER', securityLevel: 1, securityLevelStr: 'CRITICAL' },
                { keyIdx: 4, purpose: 2, purposeStr: 'ENCRYPTION', securityLevel: 3, securityLevelStr: 'MEDIUM' }
            ]
            for (const def of keyDefinitions) {
                const privateKey = await deriveKey(identityIdx, def.keyIdx)
                const publicKey = privateKey.getPublicKey()
                const publicKeyHash = binToHex(hash160(publicKey.bytes()))
                keys.push({
                    keyIndex: def.keyIdx,
                    purpose: def.purposeStr,
                    securityLevel: def.securityLevelStr,
                    privateKey,
                    publicKey: binToHex(publicKey.bytes()),
                    publicKeyHash
                })
            }
            // Optional: Query registry for registered keys
            if (_queryRegistry && identityStore.identity) {
                // TODO: Implement registry query
                console.log('Registry query not implemented yet')
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
        purpose: ParsedPurpose,
        securityLevel: ParsedSecurityLevel
    ): Promise<PrivateKeyWASM | null> => {
        try {
            const result = await getPrivateKeys(identityIdx)
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
                4: 'LOW'
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
    // Get auth key (MASTER AUTHENTICATION - purpose 0, securityLevel 0)
    const getAuthKey = async (identityIdx: number): Promise<string | null> => {
        try {
            const identity = identityStore.identity
            if (!identity) {
                log('error', '[GET_AUTH_KEY] No active identity found')
                return null
            }
            // Find MASTER AUTHENTICATION key
            const masterAuthKey = identity.publicKeys?.find(key => {
                const purpose = parsePurpose(key.purpose)
                const securityLevel = parseSecurityLevel(key.securityLevel)
                return purpose === 0 && securityLevel === 0
            })
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
    // Get transfer key (TRANSFER - purpose 3, securityLevel 1)
    const getTransferKey = async (identityIdx: number): Promise<string | null> => {
        try {
            const privateKey = await getKeyByPurpose(identityIdx, 3, 1)
            return privateKey?.WIF() || null
        } catch (err: any) {
            log('error', 'Failed to get transfer key:', err)
            return null
        }
    }
    // Get encryption key (ENCRYPTION - purpose 2, securityLevel 3)
    const getEncryptionKey = async (identityIdx: number): Promise<string | null> => {
        try {
            const privateKey = await getKeyByPurpose(identityIdx, 2, 3)
            return privateKey?.WIF() || null
        } catch (err: any) {
            log('error', 'Failed to get encryption key:', err)
            return null
        }
    }
    // Keychain management
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
                const purpose = parsePurpose(key.purpose)
                const securityLevel = parseSecurityLevel(key.securityLevel)
                if (!entry.keys[purpose]) {
                    entry.keys[purpose] = {}
                }
                // Find which key index this corresponds to in our default keychain
                const purposeMap = DEFAULT_KEYCHAIN[purpose as keyof typeof DEFAULT_KEYCHAIN]
                let keyIdx = -1
                if (purposeMap) {
                    // Find matching security level
                    for (const [defaultSecurityLevelStr, keyInfo] of Object.entries(purposeMap)) {
                        const defaultSecurityLevel = parseInt(defaultSecurityLevelStr)
                        if (defaultSecurityLevel === securityLevel) {
                            keyIdx = (keyInfo as any).keyIdx
                            break
                        }
                    }
                }
                entry.keys[purpose][securityLevel] = {
                    keyIdx: keyIdx !== -1 ? keyIdx : findBestMatch(key),
                    keyType: key.keyType,
                    securityLevel,
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
    // Helper
    const findBestMatch = (key: IPublicKey): number => {
        const purpose = parsePurpose(key.purpose)
        const securityLevel = parseSecurityLevel(key.securityLevel)
        if (purpose === 0) { // AUTHENTICATION
            if (securityLevel === 0) return 0 // MASTER
            if (securityLevel === 1) return 1 // CRITICAL
            if (securityLevel === 2) return 2 // HIGH
        } else if (purpose === 1 || purpose === 3) { // TRANSFER
            return 3 // CRITICAL TRANSFER
        } else if (purpose === 2) { // ENCRYPTION
            return 4 // MEDIUM ENCRYPTION
        }
        return -1
    }
    // Transfer key addition specific methods
    const addTransferKey = async (
        identityId: string,
        identityIdx: number,
        currentRevision: bigint,
        publicKeys: IPublicKey[],
        keyType: 'ECDSA_HASH160' | 'ECDSA_SECP256K1' = 'ECDSA_HASH160',
        securityLevel: ParsedSecurityLevel = 1 // CRITICAL
    ): Promise<{
        success: boolean
        error?: string
        result?: any
    }> => {
        const targetNetwork = await ensure()
        const sdkInstance = new DashPlatformSDK({ network: targetNetwork })
        try {
            // 1. Get next revision and nonce
            const newRevision = currentRevision + BigInt(1)
            const currentIdentityNonce = await sdkInstance.identities.getIdentityNonce(identityId)
            const identityNonce = currentIdentityNonce + BigInt(1)
            // 2. Get master key
            const keyDerivation = await getPrivateKeys(identityIdx)
            const masterKeyEntry = keyDerivation.keys?.find(key =>
                key.purpose === 'AUTHENTICATION' && key.securityLevel === 'MASTER'
            )
            const masterPrivateKey = masterKeyEntry?.privateKey
            if (!masterPrivateKey) {
                throw new Error('Master authentication key not found')
            }
            // 3. Determine next key ID
            const validIds = publicKeys.map(k => k.id).filter(id => id !== undefined)
            const sortedIds = validIds.sort((a: number, b: number) => a - b)
            const nextKeyId = sortedIds.length > 0 ? Math.max(...sortedIds) + 1 : 0
            // 4. Derive transfer key
            const transferPrivateKey = await deriveKey(identityIdx, 3)
            const transferPublicKey = transferPrivateKey.getPublicKey()
            // 5. Create public key object
            const transferPublicKeyBytes = transferPublicKey.bytes()
            const publicKeyData = keyType === 'ECDSA_HASH160'
                ? hash160(transferPublicKeyBytes)
                : transferPublicKeyBytes
            const identityPublicKeyInCreation: any = {
                purpose: 3 as PurposeType, // TRANSFER
                securityLevel: securityLevel as SecurityLevelType,
                keyType,
                readOnly: false,publicKeyData,
                signature: new Uint8Array()
            }
            // 6. Two-phase signing
            let identityUpdateTransition = sdkInstance.identities.createStateTransition('update', {
                identityId,
                revision: newRevision,
                identityNonce,
                addPublicKeys: [identityPublicKeyInCreation]
            })
            identityUpdateTransition.signByPrivateKey(transferPrivateKey, nextKeyId, keyType)
            identityPublicKeyInCreation.signature = new Uint8Array(identityUpdateTransition.signature)
            identityUpdateTransition = sdkInstance.identities.createStateTransition('update', {
                identityId,
                revision: newRevision,
                identityNonce,
                addPublicKeys: [identityPublicKeyInCreation]
            })
            const masterKey = publicKeys.find((key: any) => {
                const purpose = parsePurpose(key.purpose)
                const securityLevel = parseSecurityLevel(key.securityLevel)
                return purpose === 0 && (securityLevel === 0 || securityLevel === 3)
            })
            const masterKeyId = masterKey ? masterKey.id : 0
            identityUpdateTransition.signByPrivateKey(masterPrivateKey, masterKeyId, keyType)
            // 7. Broadcast
            const result = await sdkInstance.stateTransitions.broadcast(identityUpdateTransition)
            return {
                success: true,
                result
            }
        } catch (error: any) {
            let errorMessage = error.message || 'Failed to add transfer key'
            if (errorMessage.includes('insufficient')) {
                errorMessage = 'Insufficient credits for identity update fee'
            } else if (errorMessage.includes('nonce')) {
                errorMessage = 'Nonce mismatch - please try again'
            } else if (errorMessage.includes('revision')) {
                errorMessage = 'Identity revision mismatch - please refresh'
            } else if (errorMessage.includes('signature')) {
                errorMessage = 'Signature verification failed'
            }
            return {
                success: false,
                error: errorMessage
            }
        }
    }
    return {
        // State
        loading: computed(() => loading.value),
        error: computed(() => error.value),
        // Key derivation
        getPrivateKeys,
        getAuthKey,
        getTransferKey,
        getEncryptionKey,
        getKeyByPurpose,
        deriveKey,
        // Keychain management
        addTransferKey,
        loadKeychain,
        saveKeychain,
        getMissingKeys,
        // Utilities
        parsePurpose,
        parseSecurityLevel,
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
// Type export
export type UseKeyManagementReturn = ReturnType<typeof useKeyManagement>
