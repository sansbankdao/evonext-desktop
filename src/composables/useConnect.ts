// src/composables/useConnect.ts

// src/composables/useConnect.ts

import { ref, computed, watch } from 'vue'
import { useIdentityStore } from '@/stores/identity'
import { storeToRefs } from 'pinia'
import { getIdentityManager } from '@/services/identity/discovery/IdentityManager'
import { useNetwork } from '@/composables/useNetwork'
import type {
    ConnectionResult,
    DiscoveredIdentity,
    DiscoveryProgress
} from '@/types'
import type { DiscoveryResult } from '@/services/identity/types'

export function useConnect() {
    const store = useIdentityStore()
    const { network: _currentNetwork, ensure } = useNetwork()
    const { isConnecting, connectionError } = storeToRefs(store)

    // =========================================================================
    // State: Connection Method & General
    // =========================================================================
    const connectionMethod = ref<'seed' | 'privateKey'>('seed')

    // =========================================================================
    // State: Seed Phrase Discovery
    // =========================================================================
    const seedWordCount = ref<'12' | '24'>('12')
    const seedWords = ref<string[]>(Array(12).fill(''))
    const seedDiscoveryResults = ref<DiscoveredIdentity[]>([])
    const selectedSeedIdentity = ref<DiscoveredIdentity | null>(null)
    const seedDiscoveryError = ref<string | null>(null)
    const isSearchingSeed = ref(false)

    // Keep seedWords length synced to wordCount always
    watch(seedWordCount, (count) => {
        const targetLen = count === '24' ? 24 : 12
        const next = seedWords.value.slice(0, targetLen)
        while (next.length < targetLen) next.push('')
        seedWords.value = next
        seedDiscoveryResults.value = []
        selectedSeedIdentity.value = null
        seedDiscoveryError.value = null
    })

    // =========================================================================
    // State: Private Key Discovery
    // =========================================================================
    const manualIdentityId = ref('')
    const privateKeyInput = ref('')
    const discoveredIdentity = ref<DiscoveredIdentity | null>(null)
    const discoveryDetails = ref<any>(null)
    const debugOutput = ref<DiscoveryResult | null>(null)
    const privateKeyDiscoveryError = ref<string | null>(null)
    const isDiscovering = ref(false)

    // =========================================================================
    // State: Progress Tracking
    // =========================================================================
    const localDiscoveryProgress = ref<DiscoveryProgress | null>(null)

    // Run tokens to prevent stale updates
    const activeSeedRun = ref<symbol | null>(null)
    const activeKeyRun = ref<symbol | null>(null)

    // =========================================================================
    // Helpers
    // =========================================================================
    const normalizeSeed = (words: string[]) =>
        words.map(w => w.trim().toLowerCase()).filter(w => w.length > 0)
    const normalizeId = (id: string) => id.trim()

    // =========================================================================
    // Actions
    // =========================================================================
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

        // CRITICAL: lock network from settings at run start
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
                // Persist discovered identities for index/switch recovery
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

        // CRITICAL: lock network from settings at run start
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
        try {
            const runNetwork = await ensure()

            if (connectionMethod.value === 'seed') {
                const identity = selectedSeedIdentity.value
                if (!identity) throw new Error('No identity selected')

                await store.connectWithSeed(
                    normalizeSeed(seedWords.value).join(' '),
                    runNetwork,
                    identity.identityId,
                    identity.identityIdx
                )
            } else {
                const id = normalizeId(
                    manualIdentityId.value || discoveredIdentity.value?.identityId || ''
                )
                if (!id) throw new Error('Missing identity id')
                if (!privateKeyInput.value?.trim()) {
                    throw new Error('Missing private key input')
                }

                // Build preloaded snapshot from what we already discovered to avoid refetch
                const preload = discoveredIdentity.value
                    ? {
                        identityId: discoveredIdentity.value.identityId,
                        balance: discoveredIdentity.value.balance ?? null,
                        revision: discoveredIdentity.value.revision ?? 0,
                        publicKeys: discoveredIdentity.value.publicKeys || [],
                        dpnsUsername: discoveredIdentity.value.dpnsUsername || null,
                        identityIdx: 0
                      }
                    : null

                await store.connectWithSingleKey(
                    privateKeyInput.value.trim(),
                    id,
                    runNetwork,
                    preload
                )
            }
        } catch (err: any) {
            console.error('Connect failed:', err)
            store.clearConnectionError()
            store.connectionError = err?.message || 'Failed to connect'
            throw err
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
        // Clear sensitive data and tokens
        privateKeyInput.value = ''
        activeSeedRun.value = null
        activeKeyRun.value = null

        const manager = getIdentityManager()
        manager.cancelSeedDiscovery()
        if (typeof manager.cleanup === 'function') {
            manager.cleanup()
        }
    }

    // =========================================================================
    // Computed Properties
    // =========================================================================
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
        // State
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

        // Store State
        isConnecting,
        connectionError,
        discoveryProgress,

        // Loading States
        isSearchingSeed,
        isDiscovering,
        discoveryStatus,

        // Computed
        isFormValid,
        progressPercentage,
        progressMessage,

        // Actions
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
