// src/composables/usePlatform.ts
import { computed, ref } from 'vue'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { useNetwork } from './useNetwork'

// --- GLOBAL STATE (Singleton) ---
const sdk = ref<DashPlatformSDK | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const currentNetwork = ref<string | null>(null)  // Track active network
let creationCount = 0  // Debug SDK creations

export function usePlatform() {
    const { ensure } = useNetwork()

    /**
     * Initialize or Re-initialize SDK
     * Uses options.network if provided, otherwise falls back to ensure()
     */
    const initialize = async (options: any = {}): Promise<DashPlatformSDK> => {
        // Priority: Passed Options > Global Store (ensure) > Default
        const targetNetwork = options.network || await ensure()

        // STRICT SINGLETON: Reuse if exists + same network
        if (sdk.value && currentNetwork.value === targetNetwork) {
            console.log(`[usePlatform] Reusing existing SDK for network: ${targetNetwork}`)
            return sdk.value
        }

        loading.value = true
        error.value = null
        creationCount++

        try {
            console.log(`[usePlatform] Creating NEW SDK #${creationCount} for network: ${targetNetwork}`, {
                options: { ...options, wallet: '***' }
            })

            const clientOptions = {
                network: targetNetwork,
                ...options
            }

            sdk.value = new DashPlatformSDK(clientOptions)
            currentNetwork.value = targetNetwork

            console.log(`[usePlatform] SDK created and cached for: ${targetNetwork}`)
            loading.value = false
            return sdk.value
        } catch (err: any) {
            console.error('[usePlatform] Initialization failed:', err)
            error.value = err.message || 'Failed to initialize platform SDK'
            loading.value = false
            throw err
        }
    }

    /**
     * Get SDK Instance
     * CRITICAL FIX: Now accepts 'network' argument to force context.
     * If 'network' is passed, we use that. Otherwise we use default store state.
     */
    const getSDK = async (networkArg?: string | boolean): Promise<DashPlatformSDK> => {
        // Scenario 1: Explicit network string passed (e.g., 'mainnet')
        if (typeof networkArg === 'string') {
            console.log(`[usePlatform] getSDK called with explicit network: ${networkArg}`)
            return await initialize({ network: networkArg })
        }

        // Scenario 2: Boolean force passed (Legacy support)
        if (networkArg === true) {
            console.log('[usePlatform] getSDK called with force=true')
            return await initialize({}) // Uses ensure()
        }

        // Scenario 3: No args (Lazy load)
        if (sdk.value && currentNetwork.value) {
            console.log(`[usePlatform] Fast-return cached SDK (${currentNetwork.value})`)
            return sdk.value
        }

        // Scenario 4: Nothing cached, init default
        return await initialize({})
    }

    const reset = () => {
        console.log('[usePlatform] RESET: Clearing SDK cache')
        if (sdk.value) {
            // Add disconnect logic if SDK supports it
            const client = sdk.value as any
            if (typeof client.disconnect === 'function') {
                client.disconnect()
            }
        }
        sdk.value = null
        currentNetwork.value = null
        loading.value = false
        error.value = null
    }

    return {
        sdk: computed(() => sdk.value),
        loading: computed(() => loading.value),
        error: computed(() => error.value),
        creationCount: computed(() => creationCount),
        currentNetwork: computed(() => currentNetwork.value),
        initialize,
        getSDK,
        reset
    }
}
