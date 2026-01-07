// src/composables/useConnect.ts

import { ref, computed, watch } from 'vue'
import { useIdentityStore } from '@/stores/identity'
import { storeToRefs } from 'pinia'
import { getIdentityManager } from '@/services/identity/discovery/IdentityManager'
import { useNetwork } from '@/composables/useNetwork'
import { useNotification } from '@/composables/useNotification'
import { invoke } from '@tauri-apps/api/core'
import { KeyDerivationService } from '@/services/identity/keyDerivation.service'
import type {
    ConnectionResult,
    DiscoveredIdentity,
    DiscoveryProgress
} from '@/types'
import type { DiscoveryResult } from '@/services/identity/types'

const { showSuccess, showError } = useNotification()

export function useConnect() {
    const store = useIdentityStore()
    const { ensure } = useNetwork()
    const { isConnecting, connectionError } = storeToRefs(store)

    const connectionMethod = ref<'seed' | 'privateKey'>('seed')

    // Seed discovery state
    const seedWordCount = ref<'12' | '24'>('12')
    const seedWords = ref<string[]>(Array(12).fill(''))
    const seedDiscoveryResults = ref<DiscoveredIdentity[]>([])
    const selectedSeedIdentity = ref<DiscoveredIdentity | null>(null)
    const seedDiscoveryError = ref<string | null>(null)
    const isSearchingSeed = ref(false)

    watch(seedWordCount, (count) => {
        const targetLen = count === '24' ? 24 : 12
        const next = seedWords.value.slice(0, targetLen)
        while (next.length < targetLen) next.push('')
        seedWords.value = next
        seedDiscoveryResults.value = []
        selectedSeedIdentity.value = null
        seedDiscoveryError.value = null
    })

    // Private key discovery state
    const manualIdentityId = ref('')
    const privateKeyInput = ref('')
    const discoveredIdentity = ref<DiscoveredIdentity | null>(null)
    const discoveryDetails = ref<any>(null)
    const debugOutput = ref<DiscoveryResult | null>(null)
    const privateKeyDiscoveryError = ref<string | null>(null)
    const isDiscovering = ref(false)

    // Progress tracking
    const localDiscoveryProgress = ref<DiscoveryProgress | null>(null)
    const activeSeedRun = ref<symbol | null>(null)
    const activeKeyRun = ref<symbol | null>(null)

    const normalizeSeed = (words: string[]) =>
        words.map(w => w.trim().toLowerCase()).filter(w => w.length > 0)
    const normalizeId = (id: string) => id.trim()

    const updateConnectionMethod = (method: 'seed' | 'privateKey') => {
        connectionMethod.value = method
        store.clearConnectionError()
        seedDiscoveryError.value = null
        privateKeyDiscoveryError.value = null
    }

    const formatBalance = (balance: number | string | null | undefined): string => {
        if (balance === undefined || balance === null) return '0.0000'
        const val = typeof balance === 'string' ? parseFloat(balance) : balance
        if (isNaN(val)) return '0.0000'
        return (val / 100000000).toFixed(4)
    }

    const handlePaste = async (words: string[]) => {
        const wordCount = words.length
        if (wordCount === 12 || wordCount === 24) {
            seedWordCount.value = String(wordCount) as '12' | '24'
            seedWords.value = normalizeSeed(words)
            seedDiscoveryError.value = null
            await startSeedDiscovery()
        } else {
            seedDiscoveryError.value =
                `Invalid seed phrase length: ${wordCount} words (must be 12 or 24)`
        }
    }

    const startSeedDiscovery = async () => {
        if (isSearchingSeed.value) return
        isSearchingSeed.value = true
        seedDiscoveryResults.value = []
        selectedSeedIdentity.value = null
        localDiscoveryProgress.value = null
        seedDiscoveryError.value = null
        store.clearConnectionError()

        const runNetwork = await ensure()
        const run = Symbol('seed')
        activeSeedRun.value = run

        const manager = getIdentityManager()
        manager.setProgressCallback((details: any) => {
            if (activeSeedRun.value !== run) return
            localDiscoveryProgress.value = details as DiscoveryProgress
        })

        try {
            const cleaned = normalizeSeed(seedWords.value)
            const expectedLen = seedWordCount.value === '24' ? 24 : 12
            if (cleaned.length !== expectedLen) {
                throw new Error(`Seed has ${cleaned.length} words, expected ${expectedLen}`)
            }

            const seedPhrase = cleaned.join(' ')
            const result: DiscoveryResult = await manager.discoverFromSeed(seedPhrase, {
                network: runNetwork,
                maxIdentityIndex: 5
            })

            if (activeSeedRun.value !== run) return

            if (result.success && result.identities?.length) {
                seedDiscoveryResults.value = result.identities
                selectedSeedIdentity.value = result.identities[0] ?? null
                await store.saveDiscoveredIdentities(
                    result.identities,
                    runNetwork,
                    'seed'
                )
            } else {
                seedDiscoveryError.value = result.error || 'No identities found'
            }
        } catch (err: any) {
            if (activeSeedRun.value !== run) return
            console.error('Seed discovery failed:', err)
            seedDiscoveryError.value =
                err?.message || 'Unknown error during seed discovery'
        } finally {
            if (activeSeedRun.value === run) {
                isSearchingSeed.value = false
            }
        }
    }

    const handleDiscoverIdentity = async (key: string) => {
        const trimmedKey = key?.trim()
        if (!trimmedKey || isDiscovering.value) return

        isDiscovering.value = true
        privateKeyInput.value = trimmedKey
        debugOutput.value = null
        discoveryDetails.value = null
        discoveredIdentity.value = null
        privateKeyDiscoveryError.value = null
        manualIdentityId.value = ''
        store.clearConnectionError()

        const runNetwork = await ensure()
        const run = Symbol('key')
        activeKeyRun.value = run

        try {
            const manager = getIdentityManager()
            const result: DiscoveryResult = await manager.discoverFromKey(trimmedKey, {
                network: runNetwork
            })

            if (activeKeyRun.value !== run) return
            debugOutput.value = result

            if (result.success && result.identity) {
                discoveredIdentity.value = result.identity
                manualIdentityId.value = result.identity.identityId
                if (result.associatedKeys) {
                    discoveryDetails.value = { associatedKeys: result.associatedKeys }
                }
                await store.saveDiscoveredIdentities(
                    [result.identity],
                    runNetwork,
                    'private'
                )
            } else {
                privateKeyDiscoveryError.value =
                    result.error || 'No identity associated with this key'
            }
        } catch (err: any) {
            if (activeKeyRun.value !== run) return
            console.error('Identity discovery failed:', err)
            privateKeyDiscoveryError.value =
                err?.message || 'Unknown error occurred'
            debugOutput.value = {
                success: false,
                error: privateKeyDiscoveryError.value,
                debug: { step: 'service_error', error: err?.message }
            } as DiscoveryResult
        } finally {
            if (activeKeyRun.value === run) {
                isDiscovering.value = false
            }
        }
    }

    const handleConnect = async () => {
        if (store.isConnecting) return
        store.isConnecting = true

        try {
            const runNetwork = await ensure()

            if (connectionMethod.value === 'seed') {
                const identity = selectedSeedIdentity.value
                if (!identity) throw new Error('No identity selected')

                // 1) Identity write-only
                await store.connectWriteOnlyFromDiscovered(
                    {
                        identityId: identity.identityId,
                        identityIdx: identity.identityIdx ?? 0,
                        balance: identity.balance ?? null,
                        revision: (identity as any).revision ?? null,
                        username: (identity as any).username ?? identity.identityId,
                        dpnsUsername: (identity as any).dpnsUsername ?? null,
                        publicKeys: (identity as any).publicKeys ?? null,
                        publicKeyIds: (identity as any).publicKeyIds ?? null
                    },
                    runNetwork
                )

                // 2) Deterministic SAFU write
                const cleaned = normalizeSeed(seedWords.value)
                const expectedLen = seedWordCount.value === '24' ? 24 : 12
                if (cleaned.length !== expectedLen) {
                    throw new Error(`Seed has ${cleaned.length} words, expected ${expectedLen}`)
                }
                const seedPhrase = cleaned.join(' ')
                const publicKeys = (identity as any).publicKeys || []

                const purposeMap: Record<string, number> = {
                    AUTHENTICATION: 0,
                    ENCRYPTION: 1,
                    DECRYPTION: 2,
                    TRANSFER: 3
                }
                const secMap: Record<string, number> = {
                    MASTER: 0,
                    CRITICAL: 1,
                    HIGH: 2,
                    MEDIUM: 3,
                    LOW: 4
                }

                const now = new Date().toISOString()
                const entries: any[] = []

                for (let i = 0; i < publicKeys.length; i++) {
                    const pk = publicKeys[i] || {}
                    const keyId = Number(pk.id ?? i)

                    const res = await KeyDerivationService.getPrivateKeyWASM(
                        seedPhrase,
                        runNetwork,
                        identity.identityIdx ?? 0,
                        keyId
                    )
                    const purposeStr = String(pk.purpose || 'AUTHENTICATION').toUpperCase()
                    const secStr = String(pk.securityLevel || 'MASTER').toUpperCase()

                    // Note: Object properties must be camelCase to match Rust struct #[serde(rename_all = "camelCase")]
                    entries.push({
                        identityId: identity.identityId,
                        keyId: keyId,
                        purpose: purposeMap[purposeStr] ?? 0,
                        securityLevel: secMap[secStr] ?? 0,
                        keyType: String(pk.keyType || pk.type || 'ECDSA_SECP256K1'),
                        privateKey: res.privateKey.WIF(),
                        publicKey: pk.data || '',
                        derivedFromMnemonic: true,
                        createdAt: now,
                        lastUsed: now
                    })
                }

                if (entries.length > 0) {
                    // FIX: Invoke argument 'identity_id' MUST be passed as 'identityId' in Tauri v2
                    await invoke<boolean>('save_private_keys', {
                        identityId: identity.identityId, // <--- CHANGED FROM identity_id
                        keys: entries,
                        network: runNetwork
                    })
                } else if (publicKeys.length > 0) {
                    throw new Error('Failed to derive private keys for the selected identity.')
                }
            } else {
                const id =
                    (manualIdentityId.value || discoveredIdentity.value?.identityId || '')
                        .trim()
                if (!id) throw new Error('Missing identity id')

                const snap = discoveredIdentity.value
                    ? {
                        identityId: discoveredIdentity.value.identityId,
                        identityIdx: (discoveredIdentity.value as any).identityIdx ?? 0,
                        balance: discoveredIdentity.value.balance ?? null,
                        revision: (discoveredIdentity.value as any).revision ?? null,
                        username:
                            (discoveredIdentity.value as any).username ??
                            discoveredIdentity.value.identityId,
                        dpnsUsername:
                            (discoveredIdentity.value as any).dpnsUsername ?? null,
                        publicKeys: (discoveredIdentity.value as any).publicKeys ?? null,
                        publicKeyIds:
                            (discoveredIdentity.value as any).publicKeyIds ?? null
                    }
                    : {
                        identityId: id,
                        identityIdx: 0,
                        balance: null,
                        revision: null,
                        username: id,
                        dpnsUsername: null,
                        publicKeys: null,
                        publicKeyIds: null
                    }

                // 1) Identity write-only
                await store.connectWriteOnlyFromDiscovered(snap, runNetwork)

                // 2) Deterministic SAFU write
                const pk = privateKeyInput.value?.trim()
                if (pk) {
                    const first = (discoveryDetails.value?.associatedKeys || [])[0] || {}
                    const purposeStr = String(first.purpose || 'AUTHENTICATION').toUpperCase()
                    const secStr = String(first.securityLevel || 'MASTER').toUpperCase()

                    const purposeMap: Record<string, number> = {
                        AUTHENTICATION: 0,
                        ENCRYPTION: 1,
                        DECRYPTION: 2,
                        TRANSFER: 3
                    }
                    const secMap: Record<string, number> = {
                        MASTER: 0,
                        CRITICAL: 1,
                        HIGH: 2,
                        MEDIUM: 3,
                        LOW: 4
                    }

                    const purpose = purposeMap[purposeStr] ?? 0
                    const security_level = secMap[secStr] ?? 0

                    const now = new Date().toISOString()

                    // Note: Object properties must be camelCase to match Rust struct #[serde(rename_all = "camelCase")]
                    const entry = {
                        identityId: id,
                        keyId: 0,
                        purpose,
                        securityLevel: security_level,
                        keyType: String(first.keyType || 'ECDSA_SECP256K1'),
                        privateKey: pk,
                        publicKey: '',
                        derivedFromMnemonic: false,
                        createdAt: now,
                        lastUsed: now
                    }

                    // FIX: Invoke argument 'identity_id' MUST be passed as 'identityId' in Tauri v2
                    await invoke<boolean>('save_single_identity_keys', {
                        identityId: id, // <--- CHANGED FROM identity_id
                        key: entry,
                        network: runNetwork
                    })
                }
            }

            showSuccess(`Connected to ${store.username || store.identityId || 'identity'}`)
        } catch (err: any) {
            const msg = typeof err === 'string' ? err : (err?.message || 'Failed to connect');
            showError(msg)
            console.error('Connect failed:', err)
            store.clearConnectionError()
            store.connectionError = msg
            throw err
        } finally {
            store.isConnecting = false
        }
    }

    const resetDiscovery = () => {
        discoveredIdentity.value = null
        discoveryDetails.value = null
        debugOutput.value = null
        manualIdentityId.value = ''
        privateKeyDiscoveryError.value = null
        activeKeyRun.value = null
    }

    const closeResults = () => {
        seedDiscoveryResults.value = []
        selectedSeedIdentity.value = null
        seedDiscoveryError.value = null
        localDiscoveryProgress.value = null
        activeSeedRun.value = null
    }

    const useManualIdentity = () => {
        const norm = normalizeId(manualIdentityId.value)
        manualIdentityId.value = norm
        if (norm && discoveredIdentity.value?.identityId !== norm) {
            discoveredIdentity.value = null
            discoveryDetails.value = null
        }
    }

    const selectSeedIdentity = (identity: DiscoveredIdentity) => {
        selectedSeedIdentity.value = identity
    }

    const switchIdentity = async (targetIdentityId: string): Promise<ConnectionResult> => {
        return await store.switchIdentity(targetIdentityId.trim())
    }

    const initialize = () => { }
    const cleanup = () => {
        privateKeyInput.value = ''
        activeSeedRun.value = null
        activeKeyRun.value = null

        const manager = getIdentityManager()
        manager.cancelSeedDiscovery()
        if (typeof manager.cleanup === 'function') {
            manager.cleanup()
        }
    }

    const isFormValid = computed(() => {
        if (connectionMethod.value === 'seed') {
            return !!selectedSeedIdentity.value
        }
        const idOk = !!normalizeId(
            manualIdentityId.value || discoveredIdentity.value?.identityId || ''
        )
        const keyOk = !!privateKeyInput.value?.trim()
        return idOk && keyOk
    })

    const discoveryProgress = computed(
        () => localDiscoveryProgress.value || store.discoveryProgress
    )

    const progressPercentage = computed(() => {
        const progress = discoveryProgress.value
        if (!progress) return 0
        const { currentIdentityIndex, totalIdentities } = progress
        if (!totalIdentities || totalIdentities <= 0) return 0
        return Math.min(
            100,
            Math.round((currentIdentityIndex / totalIdentities) * 100)
        )
    })

    const progressMessage = computed(() => discoveryProgress.value?.message || '')

    const discoveryStatus = computed(() => {
        if (isSearchingSeed.value) return 'Scanning network...'
        if (isDiscovering.value) return 'Deriving keys and querying DAPI...'
        return ''
    })

    return {
        connectionMethod,
        seedWordCount,
        seedWords,
        seedDiscoveryResults,
        selectedSeedIdentity,
        seedDiscoveryError,
        manualIdentityId,
        discoveredIdentity,
        discoveryDetails,
        debugOutput,
        privateKeyDiscoveryError,

        isConnecting,
        connectionError,
        discoveryProgress,

        isSearchingSeed,
        isDiscovering,
        discoveryStatus,

        isFormValid,
        progressPercentage,
        progressMessage,

        updateConnectionMethod,
        formatBalance,
        handlePaste,
        selectSeedIdentity,
        handleDiscoverIdentity,
        resetDiscovery,
        closeResults,
        useManualIdentity,
        handleConnect,
        initialize,
        cleanup,
        switchIdentity
    }
}
