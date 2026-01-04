// src/composables/usePlatform.ts

import { computed, ref } from 'vue'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { useNetwork } from './useNetwork'

export function usePlatform() {
    const { ensure } = useNetwork()
    // Make sdk global state so it persists across composable usages
    const sdk = ref<DashPlatformSDK | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)

    const initialize = async (options: any = {}): Promise<DashPlatformSDK> => {
        // If we have an SDK and no specific options are passed, return the existing one
        if (sdk.value && Object.keys(options).length === 0) return sdk.value

        loading.value = true
        error.value = null

        try {
            // Ensure we have the correct network setting
            const network = options.network || await ensure()

            // Merge defaults with passed options (e.g., wallet, mnemonic)
            const clientOptions = {
                network,
                ...options
            }

            console.log('[usePlatform] Initializing SDK with options:', { ...clientOptions, wallet: '***' })
            sdk.value = new DashPlatformSDK(clientOptions)

            loading.value = false
            return sdk.value
        } catch (err: any) {
            console.error('[usePlatform] Initialization failed:', err)
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
        if (sdk.value) {
            // Add disconnect logic if the SDK supports it
            // Cast to any to avoid TS error: Property 'disconnect' does not exist on type...
            const client = sdk.value as any
            if (typeof client.disconnect === 'function') {
                client.disconnect()
            }
        }
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
