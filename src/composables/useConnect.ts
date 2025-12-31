// src/composables/useConnect.ts
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getIdentityManager } from '@/services/identity'
import { useIdentityStore } from '@/stores/identity' // Assuming this exists for final login
import getNetwork from '@/libs/getNetwork'
import type { DiscoveredIdentity, DiscoveryResult } from '@/services/identity/types'

export function useConnect() {
    const router = useRouter()
    const identityStore = useIdentityStore()
    const identityManager = getIdentityManager()

    // --- State: General ---
    const connectionMethod = ref<'seed' | 'privateKey'>('seed')
    const connectionError = ref<string | null>(null)
    const isConnecting = ref(false)
    const isDiscovering = ref(false) // Shared loading state for discovery
    const discoveryStatus = ref('')
    const debugOutput = ref<any>(null)

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
    const discoveryDetails = ref<any>(null) // UI specific details for KeyDiscoveryForm

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

    // --- Actions: State Helpers ---
    const updateConnectionMethod = (method: 'seed' | 'privateKey') => {
        connectionMethod.value = method
        resetDiscovery()
    }

    const resetDiscovery = () => {
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
    }

    const formatBalance = (balance: string | number | undefined) => {
        if (!balance) return '0.00'
        const num = typeof balance === 'string' ? parseFloat(balance) : balance
        // Assuming balance is in duffs/satoshis, adjust divisor as needed for your coin
        return (num / 100000000).toFixed(2)
    }

    // --- Actions: Seed Logic ---
    const handlePaste = (pastedText: string | string[]) => {
        // Handle both raw string (from some events) or array (from component emit)
        let words: string[] = []
        if (Array.isArray(pastedText)) {
            words = pastedText
        } else if (typeof pastedText === 'string') {
            words = pastedText.trim().split(/[\s,]+/)
        }

        if (words.length > 0) {
            // Auto-switch length if 24 words pasted
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
        seedDiscoveryResults.value = []
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
                // Auto-select if only one
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
        }
    }

    // --- Actions: Private Key Logic ---
    const handleDiscoverIdentity = async (keyInput: string) => {
        isDiscovering.value = true
        connectionError.value = null
        currentInputKey.value = keyInput // Store input for final connection
        discoveryStatus.value = 'Analyzing key and searching...'

        try {
            const network = await getNetwork()
            const result: DiscoveryResult = await identityManager.discoverFromKey(keyInput, {
                network
            })

            debugOutput.value = result.debug

            if (result.success && result.identity) {
                discoveredIdentity.value = result.identity
                manualIdentityId.value = result.identity.identityId // Auto-fill manual ID

                // Map service result to UI expectations
                discoveryDetails.value = {
                    detectedKeyType: result.detectedKeyType,
                    associatedKeys: result.associatedKeys || []
                }
            } else {
                connectionError.value = result.error || 'Identity not found. You can enter ID manually.'
                // Even if not found, we keep the key so they can try manual ID
            }
        } catch (e: any) {
            connectionError.value = e.message
        } finally {
            isDiscovering.value = false
        }
    }

    const useManualIdentity = () => {
        // Logic handled in computed isFormValid mostly,
        // but this can be used to trigger specific validation if needed
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
                    // Force discovery if clicked connect without discovering
                    await discoverFromSeed()
                    if (seedDiscoveryResults.value.length === 0) throw new Error('No identities found')
                    selectedSeedIdentityId.value = seedDiscoveryResults.value[0]?.identityId || null
                }

                if (!selectedSeedIdentityId.value) throw new Error('Please select an identity')

                // Call Store Action
                // Note: We use the store for the final "Login" which sets up the wallet/session
                const result = await identityStore.connectWithSeed(phrase, network) // Ensure your store has this
                if (!result.success) throw new Error(result.error)

            } else {
                // PRIVATE KEY CONNECTION
                const idToUse = discoveredIdentity.value?.identityId || manualIdentityId.value
                if (!idToUse) throw new Error('Identity ID is required')

                // Call Store Action
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

    return {
        // State
        connectionMethod,
        connectionError,
        isConnecting,
        isDiscovering,
        isSearchingSeed,
        discoveryStatus,
        debugOutput,

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
        useManualIdentity,
        initialize,
        cleanup
    }
}
