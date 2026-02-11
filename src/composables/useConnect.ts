// src/composables/useConnect.ts

import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useIdentityStore } from '@/stores/identity'
import type { DiscoveredIdentity, DiscoveryProgress } from '@/types/identity'
import { invoke } from '@/utils/tauri'

export function useConnect() {
    const store = useIdentityStore()
    const router = useRouter()

    // Form State
    const connectionMethod = ref<'seed' | 'privateKey'>('seed')
    const seedWordCount = ref<'12' | '24'>('12')
    const seedWords = ref<string[]>(Array(12).fill(''))
    const manualIdentityId = ref('')

    // Discovery State
    const seedDiscoveryResults = ref<DiscoveredIdentity[]>([])
    const selectedSeedIdentity = ref<DiscoveredIdentity | null>(null)
    const isSearchingSeed = ref(false)
    const seedDiscoveryError = ref<string | null>(null)
    const discoveryDetails = ref<any>(null)
    const debugOutput = ref('')

    const discoveryProgress = ref<DiscoveryProgress>({
        currentIdentityIndex: 0,
        totalIdentities: 0,
        scannedCount: 0,
        foundCount: 0
    })

    const isFormValid = computed(() => {
        if (connectionMethod.value === 'seed') {
            return seedWords.value.every(w => w.length > 0)
        }
        return manualIdentityId.value.length > 0
    })

    const handlePaste = (words: string[]) => {
        if (words.length === 12 || words.length === 24) {
            seedWordCount.value = words.length === 12 ? '12' : '24'
            seedWords.value = words
        }
    }

    const startSeedDiscovery = async () => {
        isSearchingSeed.value = true
        seedDiscoveryError.value = null
        seedDiscoveryResults.value = []

        try {
            const mnemonic = seedWords.value.join(' ')
            const results = await invoke<DiscoveredIdentity[]>('discover_identities_from_seed', {
                mnemonic,
                network: 'testnet'
            })
            seedDiscoveryResults.value = results
            if (results.length > 0) {
                selectedSeedIdentity.value = results[0]
                discoveryProgress.value.foundCount = results.length
            }
        } catch (e) {
            seedDiscoveryError.value = String(e)
        } finally {
            isSearchingSeed.value = false
        }
    }

    const handleConnect = async () => {
        let result
        if (connectionMethod.value === 'seed') {
            if (!selectedSeedIdentity.value) return
            result = await store.connectWithSeed(
                seedWords.value.join(' '),
                'testnet',
                selectedSeedIdentity.value.identityId,
                selectedSeedIdentity.value.identityIdx
            )
        } else {
            result = await store.connectWithPrivateKey(
                manualIdentityId.value,
                '',
                'testnet'
            )
        }

        if (result.success) {
            router.push('/')
        }
    }

    const resetDiscovery = () => {
        seedDiscoveryResults.value = []
        selectedSeedIdentity.value = null
        seedDiscoveryError.value = null
    }

    const formatBalance = (val?: string) => {
        if (!val) return '0.00 DASH'
        return `${(Number(val) / 100_000_000).toFixed(4)} DASH`
    }

    return {
        connectionMethod,
        seedWordCount,
        seedWords,
        manualIdentityId,
        seedDiscoveryResults,
        selectedSeedIdentity,
        isSearchingSeed,
        isDiscovering: isSearchingSeed, // Alias for tests
        seedDiscoveryError,
        discoveryDetails,
        debugOutput,
        discoveryProgress,
        discoveryStatus: computed(() => isSearchingSeed.value ? 'Searching...' : 'Idle'),
        isFormValid,
        progressPercentage: computed(() => 0),

        handlePaste,
        startSeedDiscovery,
        handleConnect,
        resetDiscovery,
        formatBalance,
        updateConnectionMethod: (val: any) => connectionMethod.value = val,
        selectSeedIdentity: (id: DiscoveredIdentity) => selectedSeedIdentity.value = id,
        handleDiscoverIdentity: startSeedDiscovery,
        closeResults: resetDiscovery,
        useManualIdentity: () => connectionMethod.value = 'privateKey',
        initialize: () => {},
        cleanup: () => resetDiscovery(),
        switchIdentity: (id: string) => store.switchIdentity(id),

        isConnecting: computed(() => store.isConnecting),
        connectionError: computed(() => store.connectionError)
    }
}
