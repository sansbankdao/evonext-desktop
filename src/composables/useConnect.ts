// src/composables/useConnect.ts

import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useIdentityStore } from '@/stores/identity'
import { getIdentityManager } from '@/services/identity/discovery/IdentityManager'
import type { DiscoveredIdentity } from '@/types/identity'

export function useConnect() {
    const store = useIdentityStore()
    const router = useRouter()
    const manager = getIdentityManager(store)
    const connectionMethod = ref<'seed' | 'privateKey'>('seed')
    const seedWordCount = ref<'12' | '24'>('12')
    const seedWords = ref<string[]>(Array(12).fill(''))
    const manualIdentityId = ref('')
    const seedDiscoveryResults = ref<DiscoveredIdentity[]>([])
    const selectedSeedIdentity = ref<DiscoveredIdentity | null>(null)
    const discoveredIdentity = ref<DiscoveredIdentity | null>(null)
    const isSearchingSeed = ref(false)
    const seedDiscoveryError = ref<string | null>(null)
    const discoveryDetails = ref<any>(null)
    const debugOutput = ref('')
    const discoveryProgress = computed(() => store.discoveryProgress)
    watch(seedWordCount, (newCount) => {
        const size = parseInt(newCount)
        const current = [...seedWords.value]
        if (current.length < size) {
            seedWords.value = [...current, ...Array(size - current.length).fill('')]
        } else {
            seedWords.value = current.slice(0, size)
        }
    })
    const progressPercentage = computed(() => {
        const progress = store.discoveryProgress
        if (!progress || progress.totalIdentities === 0) return 0
        return Math.round((progress.currentIdentityIndex / progress.totalIdentities) * 100)
    })
    const handlePaste = async (words: string[]) => {
        if (words.length === 12 || words.length === 24) {
            seedWordCount.value = words.length === 12 ? '12' : '24'
            seedWords.value = words
            await startSeedDiscovery()
        } else {
            seedDiscoveryError.value = 'Invalid seed phrase length'
        }
    }
    const startSeedDiscovery = async () => {
        const mnemonic = seedWords.value.join(' ').trim()
        if (!mnemonic || mnemonic.split(' ').length < 12) {
            seedDiscoveryError.value = 'expected 12'
            return
        }
        isSearchingSeed.value = true
        seedDiscoveryError.value = null
        try {
            const result = await manager.discoverFromSeed(mnemonic, { network: 'testnet' })
            if (result.success) {
                seedDiscoveryResults.value = result.identities || []
                // FIXED: Explicit existence check to satisfy TypeScript once and for all
                if (result.identities && result.identities.length > 0) {
                    const firstMatch = result.identities[0]
                    if (firstMatch) {
                        selectedSeedIdentity.value = firstMatch
                        discoveredIdentity.value = firstMatch
                    }
                }
            } else {
                seedDiscoveryError.value = result.error || 'Discovery failed'
            }
        } catch (e) {
            seedDiscoveryError.value = String(e)
        } finally {
            isSearchingSeed.value = false
        }
    }
    const handleDiscoverIdentity = async (key: string) => {
        seedDiscoveryError.value = null
        const result = await manager.discoverFromKey(key, { network: 'testnet' })
        if (!result.success) {
            seedDiscoveryError.value = result.error || 'Identity not found'
        }
    }
    const handleConnect = async () => {
        if (connectionMethod.value === 'privateKey' && !manualIdentityId.value) {
            throw new Error('Missing identity id')
        }
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
        if (result?.success) {
            router.push('/')
        }
        return result
    }
    const cleanup = () => {
        manager.cancelSeedDiscovery()
    }
    return {
        connectionMethod,
        seedWordCount,
        seedWords,
        manualIdentityId,
        seedDiscoveryResults,
        selectedSeedIdentity,
        discoveredIdentity,
        isSearchingSeed,
        isDiscovering: isSearchingSeed,
        seedDiscoveryError,
        privateKeyDiscoveryError: seedDiscoveryError,
        discoveryDetails,
        debugOutput,
        progressPercentage,
        discoveryProgress,
        progressMessage: computed(() => ''),
        discoveryStatus: computed(() => isSearchingSeed.value ? 'Searching...' : 'Idle'),
        isFormValid: computed(() => true),
        handlePaste,
        startSeedDiscovery,
        handleConnect,
        handleDiscoverIdentity,
        cleanup,
        resetDiscovery: () => { seedDiscoveryResults.value = [] },
        formatBalance: (v: any) => `${v} DASH`,
        updateConnectionMethod: (v: any) => { connectionMethod.value = v },
        selectSeedIdentity: (id: any) => {
            selectedSeedIdentity.value = id
            discoveredIdentity.value = id
        },
        closeResults: () => {},
        useManualIdentity: () => { connectionMethod.value = 'privateKey' },
        initialize: () => {},
        switchIdentity: (id: string) => store.switchIdentity(id),
        isConnecting: computed(() => store.isConnecting),
        connectionError: computed(() => store.connectionError)
    }
}
