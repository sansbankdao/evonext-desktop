// src/composables/useConnect.ts

import { ref, computed, watch } from 'vue'
import { useIdentityStore } from '@/stores/identity'
import { storeToRefs } from 'pinia'
import { getIdentityManager } from '@/services/identity/discovery/IdentityManager'
import { useNetwork } from '@/composables/useNetwork'
import { useNotification } from '@/composables/useNotification'
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
        // Pass store instance to Manager for persistence
        const manager = getIdentityManager(store)
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
            const manager = getIdentityManager(store)
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
                identities: null,
                identity: null,
                detectedKeyType: null,
                associatedKeys: null,
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
        try {
            const network = await ensure()
            // FIX: Dynamic import of composable needs to destructure the hook, then call it
            const module = await import('@/composables/usePlatform')
            const { reset: resetPlatform } = module.usePlatform()
            await resetPlatform()
            if (connectionMethod.value === 'seed') {
                const identity = selectedSeedIdentity.value
                if (!identity) throw new Error('No identity selected')
                const seedPhrase = seedWords.value.join(' ')
                await store.connectWithSeed(
                    seedPhrase,
                    network,
                    identity.identityId,
                    identity.identityIdx ?? 0
                )
            } else {
                const id =
                    (manualIdentityId.value || discoveredIdentity.value?.identityId || '')
                        .trim()
                if (!id) throw new Error('Missing identity id')
                const privateKey = privateKeyInput.value?.trim()
                if (!privateKey) throw new Error('Missing private key')
                await store.connectWithSingleKey(
                    privateKey,
                    id,
                    network,
                    discoveredIdentity.value
                )
            }
            showSuccess(`Connected to ${store.username || store.identityId}`)
        } catch (err: any) {
            const msg = typeof err === 'string' ? err : (err?.message || 'Failed to connect')
            showError(msg)
            console.error('Connect failed:', err)
            // @ts-ignore
            store.connectionError = msg
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
        privateKeyInput.value = ''
        activeSeedRun.value = null
        activeKeyRun.value = null
        const manager = getIdentityManager(store)
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
        switchIdentity,
        // ADDED: Explicitly return startSeedDiscovery
        startSeedDiscovery
    }
}
