// src/stores/connect/privateKey.ts

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useDebounce } from '@/composables/useDebounce'
import type { DiscoveredIdentity } from '@/types'
import type { DiscoveryDetails } from '@/services/identity/types'

export const usePrivateKeyStore = defineStore('connect.privateKey', () => {
    const inputKey = ref('')
    const discoveredIdentity = ref<DiscoveredIdentity | null>(null)
    const manualIdentityId = ref('')
    const discoveryDetails = ref<DiscoveryDetails | null>(null)
    const isDiscovering = ref(false)
    const error = ref<string | null>(null)

    // useDebounce with a getter function
    const debouncedKey = useDebounce(() => inputKey.value, 500)

    const isValid = computed(() =>
        inputKey.value.trim().length > 0 &&
        (discoveredIdentity.value || manualIdentityId.value.trim().length > 0)
    )

    const discover = async (key: string) => {
        if (isDiscovering.value || !key.trim()) return
        isDiscovering.value = true
        error.value = null
        inputKey.value = key
        // Service call will be triggered by useConnect composable
        // discoveryDetails will be populated by the service
    }

    const setManualId = (id: string) => {
        manualIdentityId.value = id.trim()
    }

    const reset = () => {
        inputKey.value = ''
        discoveredIdentity.value = null
        manualIdentityId.value = ''
        discoveryDetails.value = null
        isDiscovering.value = false
        error.value = null
    }

    // ADD THESE 2 FUNCTIONS:
    const initialize = () => {
        // Initialize store from localStorage or other persistent storage
        try {
            const savedKey = localStorage.getItem('connect_private_key')
            const savedId = localStorage.getItem('connect_manual_identity_id')
            if (savedKey) {
                inputKey.value = savedKey
            }
            if (savedId) {
                manualIdentityId.value = savedId
            }
        } catch (e) {
            // If parsing fails, use defaults
        }
    }

    const cleanup = () => {
        // Clean up resources - save to localStorage
        try {
            if (inputKey.value) {
                localStorage.setItem('connect_private_key', inputKey.value)
            }
            if (manualIdentityId.value) {
                localStorage.setItem('connect_manual_identity_id', manualIdentityId.value)
            }
        } catch (e) {
            // Ignore storage errors
        }
    }

    // Watch the debounced key for auto-discovery
    watch(() => debouncedKey.value, (newKey) => {
        if (newKey && newKey.trim()) {
            discover(newKey)
        }
    })

    return {
        // State
        inputKey,
        discoveredIdentity,
        manualIdentityId,
        discoveryDetails,
        isDiscovering,
        error,

        // Computed
        isValid,

        // Actions
        discover,
        setManualId,
        reset,
        initialize,  // ADDED
        cleanup      // ADDED
    }
})
