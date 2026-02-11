// src/composables/useConnect.ts

import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useIdentityStore } from '@/stores/identity'
import type { DiscoveredIdentity } from '@/types/identity'
import { invoke } from '@/utils/tauri'

export function useConnect() {
    const store = useIdentityStore()
    const router = useRouter()

    // UI State
    const connectionMethod = ref<'seed' | 'privateKey'>('seed')
    const seedWordCount = ref<'12' | '24'>('12')
    const seedWords = ref<string[]>(Array(12).fill(''))
    const manualIdentityId = ref('')

    // Discovery State
    const seedDiscoveryResults = ref<DiscoveredIdentity[]>([])
    const selectedSeedIdentity = ref<DiscoveredIdentity | null>(null)
    const isDiscovering = ref(false)
    const discoveryProgress = ref(0)
    const progressMessage = ref('')

    const handlePaste = (words: string[]) => {
        if (words.length === 12 || words.length === 24) {
            seedWordCount.value = words.length === 12 ? '12' : '24'
            seedWords.value = words
        }
    }

    const startSeedDiscovery = async () => {
        isDiscovering.value = true
        seedDiscoveryResults.value = []
        progressMessage.value = 'Scanning Platform...'

        try {
            const mnemonic = seedWords.value.join(' ')
            const results = await invoke<DiscoveredIdentity[]>('discover_identities_from_seed', {
                mnemonic,
                network: 'testnet'
            })
            seedDiscoveryResults.value = results
            if (results.length > 0) {
                selectedSeedIdentity.value = results[0]
            }
        } catch (e) {
            store.connectionError = String(e)
        } finally {
            isDiscovering.value = false
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
                '', // Let Rust derive ID if possible
                'testnet'
            )
        }

        if (result.success) {
            router.push('/')
        }
    }

    return {
        connectionMethod,
        seedWordCount,
        seedWords,
        manualIdentityId,
        seedDiscoveryResults,
        selectedSeedIdentity,
        isDiscovering,
        discoveryProgress,
        progressMessage,
        handlePaste,
        startSeedDiscovery,
        handleConnect,
        isConnecting: computed(() => store.isConnecting),
        connectionError: computed(() => store.connectionError),
        progressPercentage: computed(() => Math.round(discoveryProgress.value * 100))
    }
}
