// src/composables/usePlatform.ts

import { computed, ref } from 'vue'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { useNetwork } from './useNetwork'

const sdk = ref<DashPlatformSDK | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const currentNetwork = ref<string | null>(null)
let creationCount = 0

export function usePlatform() {
    const { ensure } = useNetwork()
    const initialize = async (options: any = {}): Promise<DashPlatformSDK> => {
        const targetNetwork = options.network || await ensure()

        if (sdk.value && currentNetwork.value === targetNetwork) {
            return sdk.value
        }

        loading.value = true
        error.value = null
        creationCount++

        try {
            const clientOptions = {
                network: targetNetwork,
                ...options
            }
            sdk.value = new DashPlatformSDK(clientOptions)

            const debugInfo: any = {
                targetInput: targetNetwork,
                instanceType: typeof sdk.value
            }

            const internalClient = (sdk.value as any).client || (sdk.value as any).transport
            if (internalClient) {
                debugInfo.clientType = typeof internalClient
                const internalNet = internalClient.network || internalClient.chain || internalClient.options?.network
                if (internalNet) {
                    debugInfo.internalNetwork = internalNet
                }
            }

            (sdk.value as any)._debugInfo = debugInfo
            currentNetwork.value = targetNetwork
            loading.value = false
            return sdk.value
        } catch (err: any) {
            error.value = err.message || 'Failed to initialize platform SDK'
            loading.value = false
            throw err
        }
    }

    const getSDK = async (networkArg?: string | boolean): Promise<DashPlatformSDK> => {
        if (typeof networkArg === 'string') {
            return await initialize({ network: networkArg })
        }
        if (networkArg === true) {
            return await initialize({})
        }
        if (sdk.value && currentNetwork.value) {
            return sdk.value
        }
        return await initialize({})
    }

    const reset = () => {
        if (sdk.value) {
            const client = sdk.value as any
            if (typeof client.disconnect === 'function') {
                client.disconnect()
            }
        }
        sdk.value = null
        currentNetwork.value = null
        loading.value = false
        error.value = null
        creationCount = 0
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
