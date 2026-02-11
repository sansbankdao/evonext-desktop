// src/composables/useConnect.ts

import { ref, computed } from 'vue'
import { useIdentityStore } from '@/stores/identity'
import { storeToRefs } from 'pinia'
import { getIdentityManager } from '@/services/identity/discovery/IdentityManager'
import { useNetwork } from '@/composables/useNetwork'
import { useNotification } from '@/composables/useNotification'
import type {
    DiscoveredIdentity,
    DiscoveryResult
} from '@/types/identity'
export function useConnect() {
    const { showSuccess, showError } = useNotification()
    const store = useIdentityStore()
    const { ensure } = useNetwork()
    const { isConnecting, connectionError, discoveryProgress } = storeToRefs(store)
    const seedWords = ref<string[]>(Array(12).fill(''))
    const seedDiscoveryResults = ref<DiscoveredIdentity[]>([])
    const selectedSeedIdentity = ref<DiscoveredIdentity | null>(null)
    const isSearchingSeed = ref(false)
    const manualIdentityId = ref('')
    const privateKeyInput = ref('')
    const connectionMethod = ref<'seed' | 'privateKey'>('seed')
    const privateKeyDiscoveryError = ref<string | null>(null)
    const seedDiscoveryError = ref<string | null>(null)
    const seedWordCount = computed(() => seedWords.value.filter(w => w.length > 0).length)
    const progressPercentage = computed(() => store.discoveryProgress?.scannedCount || 0)
    const startSeedDiscovery = async () => {
        if (isSearchingSeed.value) return
        isSearchingSeed.value = true
        seedDiscoveryResults.value = []
        seedDiscoveryError.value = null
        try {
            const network = await ensure()
            const manager = getIdentityManager(store)
            const seedPhrase = seedWords.value.join(' ').trim()
            const result: DiscoveryResult = await manager.discoverFromSeed(seedPhrase, {
                network: network as 'mainnet' | 'testnet',
                maxIdentityIndex: 5
            })
            if (result.success && result.identities?.length) {
                seedDiscoveryResults.value = result.identities
                selectedSeedIdentity.value = result.identities[0] || null
            }
        } catch (err: any) {
            seedDiscoveryError.value = err.message
            showError(err.message || 'Seed discovery failed')
        } finally {
            isSearchingSeed.value = false
        }
    }
    const handleConnect = async () => {
        const network = await ensure()
        try {
            if (connectionMethod.value === 'seed' && selectedSeedIdentity.value) {
                const identity = selectedSeedIdentity.value
                await store.connectWithSeed(
                    seedWords.value.join(' '),
                    network as any,
                    identity.identityId,
                    identity.identityIdx
                )
            } else {
                const id = manualIdentityId.value.trim()
                const pk = privateKeyInput.value.trim()
                if (!id || !pk) throw new Error('Identity ID and Private Key are required')
                await store.connectWithSingleKey(pk, id, network as any)
            }
            showSuccess(`Successfully connected: ${store.identityId}`)
        } catch (err: any) {
            showError(err.message || 'Connection failed')
            store.connectionError = err.message
        }
    }
    const handlePaste = (text: string) => {
        const words = text.trim().split(/\s+/)
        if (words.length >= 12) {
            seedWords.value = words.slice(0, 12)
        }
    }
    return {
        seedWords,
        seedDiscoveryResults,
        selectedSeedIdentity,
        isSearchingSeed,
        manualIdentityId,
        privateKeyInput,
        isConnecting,
        connectionError,
        discoveryProgress,
        startSeedDiscovery,
        handleConnect,
        selectSeedIdentity: (id: DiscoveredIdentity) => { selectedSeedIdentity.value = id },
        // Added for test/UI compatibility
        connectionMethod,
        seedWordCount,
        seedDiscoveryError,
        privateKeyDiscoveryError,
        handlePaste,
        handleDiscoverIdentity: async () => {},
        progressPercentage,
        progressMessage: computed(() => store.discoveryProgress ? `Scanning index ${store.discoveryProgress.currentIdentityIndex}` : ''),
        cleanup: () => {},
        switchIdentity: async (identityId: string) => {},
        resetDiscovery: () => { seedDiscoveryResults.value = [] },
        closeResults: () => { seedDiscoveryResults.value = [] },
        useManualIdentity: () => { connectionMethod.value = 'privateKey' },
        initialize: async () => {},
        formatBalance: (b: string) => b,
        updateConnectionMethod: (m: 'seed' | 'privateKey') => { connectionMethod.value = m }
    }
}
