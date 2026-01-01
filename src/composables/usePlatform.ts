// src/composables/usePlatform.ts

import { computed, ref } from 'vue'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { useNetwork } from './useNetwork'

export function usePlatform() {
    const { ensure } = useNetwork()
    const sdk = ref<DashPlatformSDK | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)
    const initialize = async (): Promise<DashPlatformSDK> => {
        if (sdk.value) return sdk.value
        loading.value = true
        error.value = null
        try {
            const network = await ensure()
            sdk.value = new DashPlatformSDK({ network })
            loading.value = false
            return sdk.value
        } catch (err: any) {
            error.value = err.message || 'Failed to initialize platform SDK'
            loading.value = false
            throw err
        }
    }
    const getSDK = async (): Promise<DashPlatformSDK> => {
        if (!sdk.value) {
            return await initialize()
        }
        return sdk.value
    }
    const reset = () => {
        sdk.value = null
        loading.value = false
        error.value = null
    }
    return {
        sdk: computed(() => sdk.value),
        loading: computed(() => loading.value),
        error: computed(() => error.value),
        initialize,
        getSDK,
        reset
    }
}
