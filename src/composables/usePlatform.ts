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
    const initialize = async (options: any = {}): Promise<DashPlatformSDK> => {
        const network = options.network || await ensure()
        // STRICT SINGLETON: Reuse if exists + same network
        if (sdk.value && currentNetwork.value === network) {
            console.log('[usePlatform] Reusing existing SDK (singleton)')
            return sdk.value
        }
        loading.value = true
        error.value = null
        creationCount++
        try {
            console.log(`[usePlatform] Creating NEW SDK #${creationCount} for network: ${network}`, {
                options: { ...options, wallet: '***' }
            })
            const clientOptions = {
                network,
                ...options
            }
            sdk.value = new DashPlatformSDK(clientOptions)
            currentNetwork.value = network
            console.log('[usePlatform] SDK created and cached')
            loading.value = false
            return sdk.value
        } catch (err: any) {
            console.error('[usePlatform] Initialization failed:', err)
            error.value = err.message || 'Failed to initialize platform SDK'
            loading.value = false
            throw err
        }
    }
    const getSDK = async (forceRefresh = false): Promise<DashPlatformSDK> => {
        if (sdk.value && !forceRefresh) {
            console.log('[usePlatform] Fast-return cached SDK')
            return sdk.value
        }
        return await initialize({})
    }
    const reset = () => {
        console.log('[usePlatform] RESET: Clearing SDK cache')
        if (sdk.value) {
            // Add disconnect logic if the SDK supports it
            // Cast to any to avoid TS error: Property 'disconnect' does not exist on type...
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
