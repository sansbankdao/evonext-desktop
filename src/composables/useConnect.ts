// src/composables/useConnect.ts
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { getIdentityManager } from '@/services/identity'
import { useIdentityStore } from '@/stores/identity'
import getNetwork from '@/libs/getNetwork'
import type { DiscoveredIdentity, DiscoveryResult, ScanProgress } from '@/services/identity/types'

export function useConnect() {
    const router = useRouter()
    const identityStore = useIdentityStore()
    const identityManager = getIdentityManager()

    // --- State: General ---
    const connectionMethod = ref<'seed' | 'privateKey'>('seed')
    const connectionError = ref<string | null>(null)
    const isConnecting = ref(false)
    const isDiscovering = ref(false)
    const discoveryStatus = ref('')
    const debugOutput = ref<any>(null)

    // --- Progress tracking state ---
    const discoveryProgress = ref<ScanProgress | null>(null)

    // --- State: Seed Form ---
    const seedWordCount = ref<'12' | '24'>('12')
    const seedWords = ref<string[]>(new Array(12).fill(''))
    const seedDiscoveryResults = ref<DiscoveredIdentity[]>([])
    const selectedSeedIdentityId = ref<string | null>(null)
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
            if (seedDiscoveryResults.value.length > 0 && !selectedSeedIdentityId.value) {
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

    // --- Actions: State Helpers ---
    const updateConnectionMethod = (method: 'seed' | 'privateKey') => {
        connectionMethod.value = method
        // We do NOT call resetDiscovery() here anymore to preserve results
        connectionError.value = null
        // We only clear input fields that don't belong to the target tab
        if (method === 'seed') {
            currentInputKey.value = ''
            discoveredIdentity.value = null
            discoveryDetails.value = null
        } else {
            seedWords.value = new Array(parseInt(seedWordCount.value)).fill('')
        }
    }

    const closeResults = () => {
        // Explicitly clear results and selection
        seedDiscoveryResults.value = []
        selectedSeedIdentityId.value = null
        seedDiscoveryError.value = null
        discoveryProgress.value = null
    }

    const closeProgress = () => {
        // Close just the progress bar
        discoveryProgress.value = null
    }

    const resetDiscovery = () => {
        // Hard reset: clear everything including results
        connectionError.value = null
        seedDiscoveryResults.value = []
        seedDiscoveryError.value = null
        selectedSeedIdentityId.value = null

        discoveredIdentity.value = null
        discoveryDetails.value = null
        manualIdentityId.value = ''
        currentInputKey.value = ''

        debugOutput.value = null
        isDiscovering.value = false
        discoveryProgress.value = null
        discoveryStatus.value = ''
    }

    const formatBalance = (balance: string | number | undefined) => {
        if (!balance) return '0.00'
        const num = typeof balance === 'string' ? parseFloat(balance) : balance
        return (num / 100000000).toFixed(2)
    }

    // --- Set up progress callback ---
    identityManager.setProgressCallback((progress: ScanProgress) => {
        discoveryProgress.value = progress
        discoveryStatus.value = progressMessage.value
    })

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

            // Trigger discovery automatically on paste if full
            if (words.length >= count) {
                discoverFromSeed()
            }
        }
    }

    const selectSeedIdentity = (identity: DiscoveredIdentity) => {
        selectedSeedIdentityId.value = identity.identityId
    }

    const discoverFromSeed = async () => {
        // Basic validation
        const phrase = seedWords.value.join(' ').trim()
        const count = parseInt(seedWordCount.value)
        if (phrase.split(/\s+/).length !== count) return

        isDiscovering.value = true
        seedDiscoveryError.value = null
        // Clear previous results only on new scan
        seedDiscoveryResults.value = []
        selectedSeedIdentityId.value = null

        // Reset progress
        discoveryProgress.value = null

        discoveryStatus.value = 'Deriving keys and scanning network...'

        try {
            const network = await getNetwork()
            const result: DiscoveryResult = await identityManager.discoverFromSeed(phrase, {
                network,
                maxIdentityIndex: 5
            })

            debugOutput.value = result.debug

            if (result.success && result.identities && result.identities.length > 0) {
                seedDiscoveryResults.value = result.identities
                if (result.identities.length === 1) {
                    selectedSeedIdentityId.value = result.identities[0]?.identityId || null
                }
            } else {
                seedDiscoveryError.value = result.error || 'No identities found for this seed.'
            }
        } catch (e: any) {
            seedDiscoveryError.value = e.message
        } finally {
            isDiscovering.value = false
            // REMOVED: Auto-hide progress. It stays on screen now.
            // setTimeout(() => {
            //     discoveryProgress.value = null
            // }, 2000)
        }
    }

    // --- Actions: Private Key Logic ---
    const handleDiscoverIdentity = async (keyInput: string) => {
        isDiscovering.value = true
        connectionError.value = null
        currentInputKey.value = keyInput
        discoveryStatus.value = 'Analyzing key and searching...'

        try {
            const network = await getNetwork()
            const result: DiscoveryResult = await identityManager.discoverFromKey(keyInput, {
                network
            })

            debugOutput.value = result.debug

            if (result.success && result.identity) {
                discoveredIdentity.value = result.identity
                manualIdentityId.value = result.identity.identityId

                discoveryDetails.value = {
                    detectedKeyType: result.detectedKeyType,
                    associatedKeys: result.associatedKeys || []
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
        // Logic handled in computed isFormValid mostly
    }

    // --- Actions: Final Connection ---
    const handleConnect = async () => {
        isConnecting.value = true
        connectionError.value = null

        try {
            const network = await getNetwork()

            if (connectionMethod.value === 'seed') {
                // SEED CONNECTION
                const phrase = seedWords.value.join(' ').trim()
                if (!selectedSeedIdentityId.value && seedDiscoveryResults.value.length === 0) {
                    await discoverFromSeed()
                    if (seedDiscoveryResults.value.length === 0) throw new Error('No identities found')
                    selectedSeedIdentityId.value = seedDiscoveryResults.value[0]?.identityId || null
                }

                if (!selectedSeedIdentityId.value) throw new Error('Please select an identity')

                const result = await identityStore.connectWithSeed(phrase, network) // Ensure your store has this
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
            router.push({ name: 'Home' }) // or 'Dashboard'

        } catch (e: any) {
            connectionError.value = e.message || 'Connection failed'
        } finally {
            isConnecting.value = false
        }
    }

    // Lifecycle
    const initialize = () => { resetDiscovery() }
    const cleanup = () => { resetDiscovery() }

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

        // Progress
        discoveryProgress,
        progressPercentage,
        progressMessage,

        // Seed State
        seedWordCount,
        seedWords,
        seedDiscoveryResults,
        selectedSeedIdentityId,
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
        closeProgress,
        useManualIdentity,
        initialize,
        cleanup
    }
}
