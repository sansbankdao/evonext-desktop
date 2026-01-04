// src/composables/useConnect.ts

import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { getIdentityManager } from '@/services/identity'
import { useIdentityStore } from '@/stores/identity'
import { useSeedStore } from '@/stores/connect/seed'
import { usePrivateKeyStore } from '@/stores/connect/privateKey'
import { useNetwork } from '@/composables'
import type { DiscoveryResult, ScanProgress } from '@/services/identity/types'
import type { DiscoveredIdentity } from '@/types'

export function useConnect() {
    const router = useRouter()
    const identityStore = useIdentityStore()
    const identityManager = getIdentityManager()
    const { ensure } = useNetwork()

    // Initialize stores - only use their methods, not their state
    const seedStore = useSeedStore()
    const keyStore = usePrivateKeyStore()

    // --- State: General ---
    const connectionMethod = ref<'seed' | 'privateKey'>('seed')
    const connectionError = ref<string | null>(null)
    const isConnecting = ref(false)
    const isDiscovering = ref(false)
    const discoveryStatus = ref('')
    const debugOutput = ref<any>(null)
    const isSavingToStorage = ref(false) // NEW: track storage saving

    // --- Progress tracking state ---
    const discoveryProgress = ref<ScanProgress | null>(null)

    // --- State: Seed Form ---
    const seedWordCount = ref<'12' | '24'>('12')
    const seedWords = ref<string[]>(new Array(12).fill(''))
    const seedDiscoveryResults = ref<DiscoveredIdentity[]>([])
    const selectedSeedIdentity = ref<DiscoveredIdentity | null>(null)
    const seedDiscoveryError = ref<string | null>(null)

    // --- State: Private Key Form ---
    const currentInputKey = ref('')
    const manualIdentityId = ref('')
    const discoveredIdentity = ref<DiscoveredIdentity | null>(null)
    const discoveryDetails = ref<any>(null)

    // --- Computed: Validation ---
    const isFormValid = computed(() => {
        if (connectionMethod.value === 'seed') {
            const requiredCount = parseInt(seedWordCount.value)
            const filledWords = seedWords.value.filter(w => w && w.trim().length > 0)

            // 1. Words must be filled
            if (filledWords.length !== requiredCount) return false

            // 2. If we have discovery results, one must be selected
            if (seedDiscoveryResults.value.length > 0 && !selectedSeedIdentity.value) {
                return false
            }
            return true
        } else {
            // Private Key: Needs a key and an identity ID (either discovered or manual)
            const hasKey = currentInputKey.value.trim().length > 0
            const hasId = discoveredIdentity.value || manualIdentityId.value.trim().length > 0
            return hasKey && hasId
        }
    })

    const isSearchingSeed = computed(() => isDiscovering.value && connectionMethod.value === 'seed')

    // --- Progress computed properties ---
    const progressPercentage = computed(() => {
        if (!discoveryProgress.value) return 0
        const progress = discoveryProgress.value
        const totalOperations = progress.totalIdentities * progress.totalKeysPerIdentity * 2 // *2 for unique + non-unique
        return totalOperations > 0
            ? Math.round((progress.scannedCount / totalOperations) * 100)
            : 0
    })

    const progressMessage = computed(() => {
        if (!discoveryProgress.value) return 'Deriving keys and scanning network...'
        const progress = discoveryProgress.value
        switch (progress.status) {
            case 'deriving':
                return 'Deriving cryptographic keys from seed phrase...'
            case 'scanning':
                return `Scanning network... (Identity ${progress.currentIdentityIndex + 1}/${progress.totalIdentities}, Key ${progress.currentKeyIndex + 1}/${progress.totalKeysPerIdentity})`
            case 'completed':
                return `Scan complete. Found ${progress.foundCount} identity(ies).`
            case 'failed':
                return 'Scan failed.'
            default:
                return 'Starting scan...'
        }
    })

    // --- NEW: Save discovered identities to Rust ---
    const saveDiscoveredIdentitiesToStorage = async (identities: DiscoveredIdentity[], keyType: 'seed' | 'private') => {
        if (!identities || identities.length === 0 || isSavingToStorage.value) {
            return
        }

        isSavingToStorage.value = true
        try {
            const network = await ensure()
            const saveResult = await identityStore.saveDiscoveredIdentities(identities, network, keyType)

            if (saveResult.success) {
                debugOutput.value = {
                    ...debugOutput.value,
                    storage: {
                        saved: saveResult.savedCount,
                        total: identities.length,
                        type: keyType,
                        timestamp: new Date().toISOString()
                    }
                }
            }
        } catch (error: any) {
            console.error('[useConnect] Error saving discovered identities:', error)
        } finally {
            isSavingToStorage.value = false
        }
    }

    // --- Set up progress callback ---
    identityManager.setProgressCallback((progress: ScanProgress) => {
        discoveryProgress.value = progress
        discoveryStatus.value = progressMessage.value
    })

    // --- Actions: State Helpers ---
    const updateConnectionMethod = (method: 'seed' | 'privateKey') => {
        connectionMethod.value = method
        connectionError.value = null
        // Clear input fields that don't belong to the target tab
        if (method === 'seed') {
            currentInputKey.value = ''
            discoveredIdentity.value = null
            discoveryDetails.value = null
        } else {
            seedWords.value = new Array(parseInt(seedWordCount.value)).fill('')
            selectedSeedIdentity.value = null
            seedDiscoveryResults.value = []
        }
    }

    const closeResults = () => {
        seedDiscoveryResults.value = []
        selectedSeedIdentity.value = null
        seedDiscoveryError.value = null
        discoveryProgress.value = null
    }

    const resetDiscovery = () => {
        connectionError.value = null
        seedDiscoveryResults.value = []
        seedDiscoveryError.value = null
        selectedSeedIdentity.value = null

        discoveredIdentity.value = null
        discoveryDetails.value = null
        manualIdentityId.value = ''
        currentInputKey.value = ''

        debugOutput.value = null
        isDiscovering.value = false
        discoveryProgress.value = null
        discoveryStatus.value = ''

        isSavingToStorage.value = false

        seedStore.reset()
        keyStore.reset()
    }

    const formatBalance = (balance: string | number | undefined) => {
        if (!balance) return '0.00'
        const num = typeof balance === 'string' ? parseFloat(balance) : balance
        return (num / 100000000).toFixed(2)
    }

    // --- Actions: Seed Logic ---
    const handlePaste = (pastedText: string | string[]) => {
        let words: string[] = []
        if (Array.isArray(pastedText)) {
            words = pastedText
        } else if (typeof pastedText === 'string') {
            words = pastedText.trim().split(/[\s,]+/)
        }

        if (words.length > 0) {
            if (words.length > 12) seedWordCount.value = '24'
            else seedWordCount.value = '12'

            const count = parseInt(seedWordCount.value)
            seedWords.value = new Array(count).fill('')
            words.slice(0, count).forEach((w, i) => {
                seedWords.value[i] = w
            })

            if (words.length >= count) {
                discoverFromSeed()
            }
        }

        seedStore.handlePaste(pastedText)
    }

    const selectSeedIdentity = (identity: DiscoveredIdentity) => {
        selectedSeedIdentity.value = identity
    }

    const discoverFromSeed = async () => {
        const phrase = seedWords.value.join(' ').trim()
        const count = parseInt(seedWordCount.value)
        if (phrase.split(/\s+/).length !== count) return

        isDiscovering.value = true
        seedDiscoveryError.value = null
        seedDiscoveryResults.value = []
        selectedSeedIdentity.value = null
        discoveryProgress.value = null
        discoveryStatus.value = 'Deriving keys and scanning network...'

        try {
            const network = await ensure()
            const result: DiscoveryResult = await identityManager.discoverFromSeed(phrase, {
                network,
                maxIdentityIndex: 5
            })

            debugOutput.value = result.debug

            if (result.success && result.identities && result.identities.length > 0) {
                const validIdentities = (result.identities as (DiscoveredIdentity | undefined)[]).filter(
                    (identity): identity is DiscoveredIdentity => identity !== undefined && identity !== null
                )

                seedDiscoveryResults.value = validIdentities

                if (validIdentities.length > 0 && validIdentities[0]) {
                    selectedSeedIdentity.value = validIdentities[0]
                }

                await saveDiscoveredIdentitiesToStorage(validIdentities, 'seed')
            } else {
                seedDiscoveryError.value = result.error || 'No identities found for this seed.'
            }
        } catch (e: any) {
            seedDiscoveryError.value = e.message
        } finally {
            isDiscovering.value = false
        }
    }

    // --- Actions: Private Key Logic ---
    const handleDiscoverIdentity = async (keyInput: string) => {
        isDiscovering.value = true
        connectionError.value = null
        currentInputKey.value = keyInput
        discoveryStatus.value = 'Analyzing key and searching...'

        try {
            const network = await ensure()
            const result: DiscoveryResult = await identityManager.discoverFromKey(keyInput, {
                network
            })

            debugOutput.value = result.debug

            if (result.success && result.identity) {
                const discovered = result.identity || null
                discoveredIdentity.value = discovered
                manualIdentityId.value = discovered.identityId || ''

                discoveryDetails.value = {
                    detectedKeyType: result.detectedKeyType,
                    associatedKeys: result.associatedKeys || []
                }

                if (discovered) {
                    await saveDiscoveredIdentitiesToStorage([discovered], 'private')
                }
            } else {
                connectionError.value = result.error || 'Identity not found. You can enter ID manually.'
            }
        } catch (e: any) {
            connectionError.value = e.message
        } finally {
            isDiscovering.value = false
        }
    }

    const useManualIdentity = () => {
        // Logic handled in computed isFormValid
    }

    // --- Actions: Final Connection ---
    const handleConnect = async () => {
        isConnecting.value = true
        connectionError.value = null

        try {
            const network = await ensure()

            if (connectionMethod.value === 'seed') {
                const phrase = seedWords.value.join(' ').trim()

                // Run discovery if we haven't yet or have no results
                if (seedDiscoveryResults.value.length === 0) {
                    await discoverFromSeed()
                    if (seedDiscoveryResults.value.length === 0) {
                        throw new Error('No identities found for this seed phrase')
                    }
                    if (seedDiscoveryResults.value.length === 1 && seedDiscoveryResults.value[0]) {
                        selectedSeedIdentity.value = seedDiscoveryResults.value[0]
                    }
                }

                if (!selectedSeedIdentity.value?.identityId) {
                    throw new Error('Please select an identity from the discovered list')
                }

                // CRITICAL: Ensure identityIdx is passed. Default to 0 if undefined.
                const idx = selectedSeedIdentity.value.identityIdx ?? 0

                const result = await identityStore.connectWithSeed(
                    phrase,
                    network,
                    selectedSeedIdentity.value.identityId,
                    idx
                )
                if (!result.success) throw new Error(result.error)

            } else {
                // PRIVATE KEY CONNECTION
                const idToUse = discoveredIdentity.value?.identityId || manualIdentityId.value
                if (!idToUse) throw new Error('Identity ID is required')

                const result = await identityStore.connectWithSingleKey(
                    currentInputKey.value,
                    idToUse,
                    network
                )
                if (!result.success) throw new Error(result.error)
            }

            // Redirect on success
            router.push({ name: 'Home' })

        } catch (e: any) {
            connectionError.value = e.message || 'Connection failed'
        } finally {
            isConnecting.value = false
        }
    }

    const initialize = () => {
        seedStore.initialize()
        keyStore.initialize()
    }
    const cleanup = () => {
        resetDiscovery()
        seedStore.cleanup()
        keyStore.cleanup()
    }

    onUnmounted(() => {
        cleanup()
    })

    return {
        // State
        connectionMethod,
        connectionError,
        isConnecting,
        isDiscovering,
        isSearchingSeed,
        discoveryStatus,
        debugOutput,
        isSavingToStorage,

        // Progress
        discoveryProgress,
        progressPercentage,
        progressMessage,

        // Seed State
        seedWordCount,
        seedWords,
        seedDiscoveryResults,
        selectedSeedIdentity,
        seedDiscoveryError,

        // Key State
        manualIdentityId,
        discoveredIdentity,
        discoveryDetails,

        // Computed
        isFormValid,

        // Actions
        updateConnectionMethod,
        formatBalance,
        handlePaste,
        selectSeedIdentity,
        handleDiscoverIdentity,
        handleConnect,
        resetDiscovery,
        closeResults,
        useManualIdentity,
        initialize,
        cleanup
    }
}
