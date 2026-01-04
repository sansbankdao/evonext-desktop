// src/composables/useConnect.ts
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { getIdentityManager } from '@/services/identity'
import { useIdentityStore } from '@/stores/identity'
import { useSeedStore } from '@/stores/connect/seed'
import { usePrivateKeyStore } from '@/stores/connect/privateKey'
import { useNetwork } from '@/composables'
import type { ScanProgress } from '@/services/identity/types'
import type { DiscoveredIdentity } from '@/types'
export function useConnect() {
    const router = useRouter()
    const identityStore = useIdentityStore()
    const identityManager = getIdentityManager()
    const { ensure } = useNetwork()
    const seedStore = useSeedStore()
    const keyStore = usePrivateKeyStore()
    // --- State: General ---
    const connectionMethod = ref<'seed' | 'privateKey'>('seed')
    const connectionError = ref<string | null>(null)
    const isConnecting = ref(false)
    const isDiscovering = ref(false)
    const discoveryStatus = ref('')
    const debugOutput = ref<any>(null)
    const isSavingToStorage = ref(false)
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
            if (filledWords.length !== requiredCount) return false
            if (seedDiscoveryResults.value.length > 0 && !selectedSeedIdentity.value) return false
            return true
        } else {
            const hasKey = currentInputKey.value.trim().length > 0
            const hasId = discoveredIdentity.value || manualIdentityId.value.trim().length > 0
            return hasKey && hasId
        }
    })
    const isSearchingSeed = computed(() => isDiscovering.value && connectionMethod.value === 'seed')
    // --- Progress computed properties ---
    const progressPercentage = computed(() => {
        if (!discoveryProgress.value) return 0
        const { status, totalIdentities, currentIdentityIndex } = discoveryProgress.value
        if (status === 'completed' || status === 'failed') return 100;
        const percent = totalIdentities > 0
            ? Math.round(((currentIdentityIndex) / totalIdentities) * 100)
            : 0;
        return Math.min(percent, 95);
    })
    const progressMessage = computed(() => {
        if (!discoveryProgress.value) return 'Deriving keys and scanning network...'
        const p = discoveryProgress.value
        switch (p.status) {
            case 'deriving':
                return 'Deriving cryptographic keys...'
            case 'scanning':
                const gapInfo = p.totalIdentities > 0 ? `(Gap Search active)` : '';
                return `Scanning Identity #${p.currentIdentityIndex + 1} ${gapInfo}...`
            case 'completed':
                return `Scan complete. Found ${p.foundCount} identity(ies).`
            case 'failed':
                return 'Scan failed.'
            default:
                return 'Starting scan...'
        }
    })
    const saveDiscoveredIdentitiesToStorage = async (identities: DiscoveredIdentity[], keyType: 'seed' | 'private') => {
        if (!identities || identities.length === 0 || isSavingToStorage.value) return
        isSavingToStorage.value = true
        try {
            const network = await ensure()
            const saveResult = await identityStore.saveDiscoveredIdentities(identities, network, keyType)
            if (saveResult.success) {
                debugOutput.value = {
                    ...debugOutput.value,
                    storage: { saved: saveResult.savedCount, total: identities.length, type: keyType }
                }
            }
        } catch (error) {
            console.error(error)
        } finally {
            isSavingToStorage.value = false
        }
    }
    identityManager.setProgressCallback((progress: ScanProgress) => {
        discoveryProgress.value = progress
        discoveryStatus.value = progressMessage.value
    })
    // --- Actions ---
    const updateConnectionMethod = (method: 'seed' | 'privateKey') => {
        connectionMethod.value = method
        connectionError.value = null
        if (method === 'seed') {
            currentInputKey.value = ''
            discoveredIdentity.value = null
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
        manualIdentityId.value = ''
        currentInputKey.value = ''
        debugOutput.value = null
        isDiscovering.value = false
        discoveryProgress.value = null
        isSavingToStorage.value = false
        seedStore.reset()
        keyStore.reset()
    }
    const formatBalance = (balance: string | number | undefined) => {
        if (!balance) return '0.00'
        const num = typeof balance === 'string' ? parseFloat(balance) : balance
        return (num / 100000000).toFixed(2)
    }
    const handlePaste = (pastedText: string | string[]) => {
        let words: string[] = []
        if (Array.isArray(pastedText)) words = pastedText
        else if (typeof pastedText === 'string') words = pastedText.trim().split(/[\s,]+/)
        if (words.length > 0) {
            seedWordCount.value = words.length > 12 ? '24' : '12'
            const count = parseInt(seedWordCount.value)
            seedWords.value = new Array(count).fill('')
            words.slice(0, count).forEach((w, i) => seedWords.value[i] = w)
            if (words.length >= count) discoverFromSeed()
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
        try {
            const network = await ensure()
            const result = await identityManager.discoverFromSeed(phrase, { network, maxIdentityIndex: 5 })
            debugOutput.value = result.debug
            if (result.success && result.identities?.length) {
                const validIdentities = result.identities.filter((i): i is DiscoveredIdentity => !!i)
                seedDiscoveryResults.value = validIdentities
                // FIX: Check existence before assigning, fallback to null
                if (validIdentities.length > 0 && validIdentities[0]) {
                    selectedSeedIdentity.value = validIdentities[0]
                } else {
                    selectedSeedIdentity.value = null
                }
                await saveDiscoveredIdentitiesToStorage(validIdentities, 'seed')
            } else {
                seedDiscoveryError.value = result.error || 'No identities found.'
            }
        } catch (e: any) {
            seedDiscoveryError.value = e.message
        } finally {
            isDiscovering.value = false
        }
    }
    const handleDiscoverIdentity = async (keyInput: string) => {
        isDiscovering.value = true
        connectionError.value = null
        currentInputKey.value = keyInput
        discoveryStatus.value = 'Analyzing key...'
        try {
            const network = await ensure()
            const result = await identityManager.discoverFromKey(keyInput, { network })
            debugOutput.value = result.debug
            if (result.success && result.identity) {
                discoveredIdentity.value = result.identity
                manualIdentityId.value = result.identity.identityId
                discoveryDetails.value = {
                    detectedKeyType: result.detectedKeyType,
                    associatedKeys: result.associatedKeys || []
                }
                await saveDiscoveredIdentitiesToStorage([result.identity], 'private')
            } else {
                connectionError.value = result.error || 'Identity not found.'
            }
        } catch (e: any) {
            connectionError.value = e.message
        } finally {
            isDiscovering.value = false
        }
    }
    const useManualIdentity = () => {}
    const handleConnect = async () => {
        isConnecting.value = true
        connectionError.value = null
        try {
            const network = await ensure()
            if (connectionMethod.value === 'seed') {
                const phrase = seedWords.value.join(' ').trim()
                if (seedDiscoveryResults.value.length === 0) {
                    await discoverFromSeed()
                    if (seedDiscoveryResults.value.length === 0) throw new Error('No identities found')
                    // Logic to select first result if none selected
                    if (!selectedSeedIdentity.value && seedDiscoveryResults.value[0]) {
                        selectedSeedIdentity.value = seedDiscoveryResults.value[0]
                    }
                }
                if (!selectedSeedIdentity.value?.identityId) throw new Error('Select an identity')
                const result = await identityStore.connectWithSeed(
                    phrase,
                    network,
                    selectedSeedIdentity.value.identityId,
                    selectedSeedIdentity.value.identityIdx ?? 0
                )
                if (!result.success) throw new Error(result.error)
            } else {
                const idToUse = discoveredIdentity.value?.identityId || manualIdentityId.value
                const keyToUse = currentInputKey.value
                if (!idToUse) throw new Error('Identity ID required')
                if (!keyToUse) throw new Error('Private Key required')
                const result = await identityStore.connectWithSingleKey(
                    keyToUse,
                    idToUse,
                    network
                )
                if (!result.success) throw new Error(result.error)
            }
            router.push({ name: 'Home' })
        } catch (e: any) {
            connectionError.value = e.message
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
    onUnmounted(() => { cleanup() })
    return {
        connectionMethod, seedWordCount, seedWords, seedDiscoveryResults, selectedSeedIdentity, seedDiscoveryError,
        manualIdentityId, discoveredIdentity, discoveryDetails, debugOutput,
        isSearchingSeed, isDiscovering, isConnecting, discoveryStatus, connectionError, isFormValid,
        discoveryProgress, progressPercentage, progressMessage,
        formatBalance, updateConnectionMethod, handlePaste, selectSeedIdentity, handleDiscoverIdentity,
        resetDiscovery, closeResults, useManualIdentity, handleConnect, initialize, cleanup
    }
}
