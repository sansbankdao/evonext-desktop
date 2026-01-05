// src/composables/useConnect.ts

import { ref, computed } from 'vue'
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
    const { network: currentNetwork } = useNetwork()
    const {
        isConnecting,
        connectionError,
    } = storeToRefs(store)

    // =========================================================================
    // State: Connection Method & General
    // =========================================================================
    const connectionMethod = ref<'seed' | 'privateKey'>('seed')

    // =========================================================================
    // State: Seed Phrase Discovery
    // =========================================================================
    const seedWordCount = ref<'12' | '24'>('12')
    const seedWords = ref<string[]>(Array(12).fill(''))
    // Explicitly type the array to hold the extended interface to prevent downstream variance issues,
    // though base type is usually sufficient. Using base DiscoveredIdentity[] for UI compatibility.
    const seedDiscoveryResults = ref<DiscoveredIdentity[]>([])
    const selectedSeedIdentity = ref<DiscoveredIdentity | null>(null)
    const seedDiscoveryError = ref<string | null>(null)
    const isSearchingSeed = ref(false)

    // =========================================================================
    // State: Private Key Discovery
    // =========================================================================
    const manualIdentityId = ref('')
    const privateKeyInput = ref('')
    const discoveredIdentity = ref<DiscoveredIdentity | null>(null)
    const discoveryDetails = ref<any>(null)
    const debugOutput = ref<DiscoveryResult | null>(null)
    const isDiscovering = ref(false)

    // =========================================================================
    // State: Progress Tracking
    // =========================================================================
    const localDiscoveryProgress = ref<DiscoveryProgress | null>(null)

    // =========================================================================
    // Actions
    // =========================================================================

    const updateConnectionMethod = (method: 'seed' | 'privateKey') => {
        connectionMethod.value = method
        store.clearConnectionError()
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
            seedWords.value = words
            seedDiscoveryError.value = null

            await startSeedDiscovery()
        } else {
            seedDiscoveryError.value = `Invalid seed phrase length: ${wordCount} words (must be 12 or 24)`
        }
    }

    const startSeedDiscovery = async () => {
        if (isSearchingSeed.value) return

        isSearchingSeed.value = true
        seedDiscoveryResults.value = []
        selectedSeedIdentity.value = null
        localDiscoveryProgress.value = null
        seedDiscoveryError.value = null

        const manager = getIdentityManager()

        manager.setProgressCallback((details: any) => {
            localDiscoveryProgress.value = details as DiscoveryProgress
        })

        try {
            const seedPhrase = seedWords.value.join(' ')

            const result: DiscoveryResult = await manager.discoverFromSeed(seedPhrase, {
                network: currentNetwork.value,
                maxIdentityIndex: 5
            })

            if (result.success && result.identities) {
                seedDiscoveryResults.value = result.identities

                // FIX: Explicit check to satisfy strict null checks
                const firstIdentity = result.identities[0]
                if (firstIdentity) {
                    selectedSeedIdentity.value = firstIdentity
                }
            } else if (result.error) {
                seedDiscoveryError.value = result.error
            }
        } catch (err: any) {
            console.error('Seed discovery failed:', err)
            seedDiscoveryError.value = err.message || 'Unknown error during seed discovery'
        } finally {
            isSearchingSeed.value = false
        }
    }

    const handleDiscoverIdentity = async (key: string) => {
        if (!key || isDiscovering.value) return

        isDiscovering.value = true
        privateKeyInput.value = key
        debugOutput.value = null
        discoveryDetails.value = null
        discoveredIdentity.value = null
        manualIdentityId.value = ''

        try {
            const manager = getIdentityManager()
            const result: DiscoveryResult = await manager.discoverFromKey(key, {
                network: currentNetwork.value
            })

            debugOutput.value = result

            if (result.success && result.identity) {
                discoveredIdentity.value = result.identity
                manualIdentityId.value = result.identity.identityId

                if (result.associatedKeys) {
                    discoveryDetails.value = { associatedKeys: result.associatedKeys }
                }
            }
        } catch (err: any) {
            console.error('Identity discovery failed:', err)
            debugOutput.value = {
                success: false,
                error: err.message || 'Unknown error occurred',
                debug: { step: 'service_error', error: err.message }
            } as DiscoveryResult
        } finally {
            isDiscovering.value = false
        }
    }

    const handleConnect = async () => {
        if (connectionMethod.value === 'seed') {
            const identity = selectedSeedIdentity.value
            if (!identity) return

            await store.connectWithSeed(
                seedWords.value.join(' '),
                currentNetwork.value,
                identity.identityId,
                identity.identityIdx
            )
        }
        else {
            const targetId = manualIdentityId.value || discoveredIdentity.value?.identityId
            if (!targetId) return

            if (!privateKeyInput.value) {
                console.error("Missing private key input for connection")
                return
            }

            await store.connectWithSingleKey(
                privateKeyInput.value,
                targetId,
                currentNetwork.value
            )
        }
    }

    const resetDiscovery = () => {
        discoveredIdentity.value = null
        discoveryDetails.value = null
        debugOutput.value = null
        manualIdentityId.value = ''
    }

    const closeResults = () => { seedDiscoveryResults.value = [] }

    const useManualIdentity = () => {
        if (manualIdentityId.value && discoveredIdentity.value?.identityId !== manualIdentityId.value) {
            discoveredIdentity.value = null
            discoveryDetails.value = null
        }
    }

    const selectSeedIdentity = (identity: DiscoveredIdentity) => selectedSeedIdentity.value = identity

    const switchIdentity = async (targetIdentityId: string): Promise<ConnectionResult> => {
        return await store.switchIdentity(targetIdentityId)
    }

    const initialize = () => { }

    const cleanup = () => {
        const manager = getIdentityManager()
        if (typeof manager.cleanup === 'function') {
            manager.cleanup()
        }
    }

    // =========================================================================
    // Computed Properties
    // =========================================================================

    const isFormValid = computed(() => {
        if (connectionMethod.value === 'seed') return !!selectedSeedIdentity.value
        return (!!manualIdentityId.value || !!discoveredIdentity.value) && !!privateKeyInput.value
    })

    const discoveryProgress = computed(() => localDiscoveryProgress.value || store.discoveryProgress)

    const progressPercentage = computed(() => {
        const progress = discoveryProgress.value
        if (!progress) return 0
        const { currentIdentityIndex, totalIdentities } = progress
        if (!totalIdentities || totalIdentities === 0) return 0
        return Math.min(100, Math.round((currentIdentityIndex / totalIdentities) * 100))
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
