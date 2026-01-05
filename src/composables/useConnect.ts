// src/composables/useConnect.ts

import { ref, computed } from 'vue'
import { useIdentityStore } from '@/stores/identity'
import { storeToRefs } from 'pinia'
import type { ConnectionResult, DiscoveredIdentity } from '@/types'

export function useConnect() {
    const store = useIdentityStore()
    const {
        isConnecting,
        connectionError,
    } = storeToRefs(store)
    const connectionMethod = ref<'seed' | 'privateKey'>('seed')
    const seedWordCount = ref<'12' | '24'>('12')
    const seedWords = ref<string[]>(Array(12).fill(''))
    const seedDiscoveryResults = ref<DiscoveredIdentity[]>([])
    const selectedSeedIdentity = ref<DiscoveredIdentity | null>(null)
    const seedDiscoveryError = ref<string | null>(null)
    const manualIdentityId = ref('')
    const discoveredIdentity = ref<any>(null)
    const discoveryDetails = ref<any>(null)
    const debugOutput = ref<any>(null)
    const isSearchingSeed = ref(false)
    const isDiscovering = ref(false)

    const updateConnectionMethod = (method: 'seed' | 'privateKey') => {
        connectionMethod.value = method
        store.clearConnectionError()
    }

    const formatBalance = (balance: number) => {
        return (balance / 100000000).toFixed(4)
    }

    const handlePaste = (event: ClipboardEvent) => {
        const text = event.clipboardData?.getData('text')
        if (!text) return
        const words = text.trim().split(/\s+/)
        if (words.length === 12 || words.length === 24) {
            seedWordCount.value = String(words.length) as '12' | '24'
            seedWords.value = words
        }
    }

    const handleConnect = async () => {
        if (connectionMethod.value === 'seed') {
            if (!selectedSeedIdentity.value) return
            await store.connectWithSeed(
                seedWords.value.join(' '),
                'mainnet',
                selectedSeedIdentity.value.identityId,
                selectedSeedIdentity.value.identityIdx
            )
        } else {
             await store.connectWithSingleKey(
                manualIdentityId.value,
                discoveredIdentity.value?.identityId || '',
                'mainnet'
            )
        }
    }

    const switchIdentity = async (targetIdentityId: string): Promise<ConnectionResult> => {
        return await store.switchIdentity(targetIdentityId)
    }

    const selectSeedIdentity = (identity: DiscoveredIdentity) => selectedSeedIdentity.value = identity
    const handleDiscoverIdentity = async () => { }
    const resetDiscovery = () => { }
    const closeResults = () => { seedDiscoveryResults.value = [] }
    const useManualIdentity = () => { }
    const initialize = () => { }
    const cleanup = () => { }

    const isFormValid = computed(() => {
        if (connectionMethod.value === 'seed') return !!selectedSeedIdentity.value
        return !!manualIdentityId.value
    })

    const progressPercentage = computed(() => {
        const progress = store.discoveryProgress
        if (!progress) return 0
        const { currentIdentityIndex, totalIdentities } = progress
        if (totalIdentities === 0) return 0
        return Math.min(100, Math.round((currentIdentityIndex / totalIdentities) * 100))
    })

    const progressMessage = computed(() => store.discoveryProgress?.message || '')
    const discoveryStatus = computed(() => isSearchingSeed.value ? 'Scanning network...' : '')

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
        isConnecting,
        connectionError,
        discoveryProgress: computed(() => store.discoveryProgress),
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
