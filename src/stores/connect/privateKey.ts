// src/stores/connect/privateKey.ts

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useDebounce } from '@/composables/useDebounce'
import type { DiscoveredIdentity } from '@/services/identity/types'
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
        reset
    }
})
