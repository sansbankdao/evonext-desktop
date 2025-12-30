// src/stores/connect.ts

import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import type { DiscoveredIdentity } from '@/services/identity/types'
// import type { ConnectionMethod } from './types/connect.types'
type ConnectionMethod = 'seed' | 'privateKey'

export const useConnectStore = defineStore('connect', () => {
    // Connection method state
    const connectionMethod = ref<ConnectionMethod>('seed')

    // Seed phrase state
    const seedWordCount = ref<'12' | '24'>('12')
    const seedWords = reactive<string[]>(Array(12).fill(''))
    const selectedSeedIdentityId = ref<string>('')
    const seedDiscoveryResults = ref<DiscoveredIdentity[]>([])
    const seedDiscoveryError = ref<string>('')
    const isSearchingSeed = ref(false)
    const seedSearchTimer = ref<NodeJS.Timeout | null>(null)

    // Private key state
    const currentInputKey = ref('')
    const debugOutput = ref<any>(null)
    const discoveredIdentity = ref<DiscoveredIdentity | null>(null)
    const discoveryDetails = ref<any>(null)
    const manualIdentityId = ref('')
    const isDiscovering = ref(false)

    // Computed properties
    const isFormValid = computed(() => {
        if (connectionMethod.value === 'seed') {
            if (seedDiscoveryResults.value.length > 0) return true
            return seedWords.every(word => word.trim() !== '')
        } else {
            const hasIdentity = discoveredIdentity.value || manualIdentityId.value.trim() !== ''
            const hasKey = currentInputKey.value.trim() !== ''
            return hasIdentity && hasKey
        }
    })

    const discoveryStatus = computed(() => {
        if (connectionMethod.value === 'seed') {
            if (isSearchingSeed.value) return 'Searching seed identities...'
            if (seedDiscoveryResults.value.length > 0) return `Found ${seedDiscoveryResults.value.length} identities`
            if (seedDiscoveryError.value) return 'Discovery failed'
            return 'Enter seed phrase to discover identities'
        } else {
            if (isDiscovering.value) return 'Searching for identity...'
            if (discoveredIdentity.value) return 'Identity found!'
            return 'Enter private key or public key'
        }
    })

    // Actions
    const updateConnectionMethod = (method: ConnectionMethod) => {
        connectionMethod.value = method
        resetDiscovery()
    }

    const handlePaste = (words: string[]) => {
        const totalSlots = seedWords.length
        seedWords.length = 0
        for (let i = 0; i < totalSlots; i++) {
            seedWords.push(words[i] || '')
        }
    }

    const clearSeedDiscovery = () => {
        seedDiscoveryResults.value = []
        seedDiscoveryError.value = ''
        selectedSeedIdentityId.value = ''
        manualIdentityId.value = ''
    }

    const resetDiscovery = () => {
        discoveredIdentity.value = null
        discoveryDetails.value = null
        manualIdentityId.value = ''
        currentInputKey.value = ''
        debugOutput.value = null
        clearSeedDiscovery()
    }

    const selectSeedIdentity = (identity: DiscoveredIdentity) => {
        selectedSeedIdentityId.value = identity.identityId
        manualIdentityId.value = identity.identityId
    }

    const useManualIdentity = () => {
        if (manualIdentityId.value.trim()) {
            discoveredIdentity.value = {
                identityId: manualIdentityId.value.trim(),
                balance: '0',
                revision: '0',
                publicKeys: [],
                dpnsUsername: null
            }
        }
    }

    const setSeedWordCount = (count: '12' | '24') => {
        seedWordCount.value = count
        const newArray = Array(parseInt(count, 10)).fill('')
        seedWords.length = 0
        seedWords.push(...newArray)
        clearSeedDiscovery()
    }

    const setSeedWords = (words: string[]) => {
        seedWords.length = 0
        words.forEach((word, index) => {
            if (index < seedWords.length) {
                seedWords[index] = word
            } else {
                seedWords.push(word)
            }
        })
    }

    // Cleanup
    const cleanup = () => {
        if (seedSearchTimer.value) {
            clearTimeout(seedSearchTimer.value)
            seedSearchTimer.value = null
        }
    }

    // Getters for derived state
    const getSelectedSeedIdentity = computed(() => {
        return seedDiscoveryResults.value.find(
            identity => identity.identityId === selectedSeedIdentityId.value
        ) || null
    })

    const getAllIdentities = computed(() => {
        const identities: DiscoveredIdentity[] = []
        if (discoveredIdentity.value) {
            identities.push(discoveredIdentity.value)
        }
        identities.push(...seedDiscoveryResults.value)
        return identities
    })

    const hasActiveIdentity = computed(() => {
        return !!discoveredIdentity.value || seedDiscoveryResults.value.length > 0
    })

    return {
        // State
        connectionMethod,
        seedWordCount,
        seedWords,
        selectedSeedIdentityId,
        seedDiscoveryResults,
        seedDiscoveryError,
        isSearchingSeed,
        seedSearchTimer,
        currentInputKey,
        debugOutput,
        discoveredIdentity,
        discoveryDetails,
        manualIdentityId,
        isDiscovering,

        // Computed
        isFormValid,
        discoveryStatus,
        getSelectedSeedIdentity,
        getAllIdentities,
        hasActiveIdentity,

        // Actions
        updateConnectionMethod,
        handlePaste,
        clearSeedDiscovery,
        resetDiscovery,
        selectSeedIdentity,
        useManualIdentity,
        setSeedWordCount,
        setSeedWords,
        cleanup
    }
})
