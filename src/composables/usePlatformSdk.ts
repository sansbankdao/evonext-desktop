// src/composables/usePlatformSdk.ts

import { ref, readonly } from 'vue'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { useNetwork, type Network } from './useNetwork'

class SDKManager {
    private static instance: SDKManager
    private sdkInstances: Map<Network, DashPlatformSDK> = new Map()
    private constructor() {}

    static getInstance(): SDKManager {
        if (!SDKManager.instance) {
            SDKManager.instance = new SDKManager()
        }
        return SDKManager.instance
    }

    getSDK(network: Network): DashPlatformSDK {
        const key = network
        if (!this.sdkInstances.has(key)) {
            console.log(`Creating new SDK instance for ${network}`)
            this.sdkInstances.set(key, new DashPlatformSDK({ network }))
        }
        return this.sdkInstances.get(key)!
    }

    clearSDK(network: Network): void {
        const key = network
        const sdk = this.sdkInstances.get(key)
        if (sdk) {
            // Note: DashPlatformSDK doesn't have dispose method per docs
            // We'll just delete from cache; let JS GC handle cleanup
            console.log(`Clearing SDK instance for ${network}`)
            this.sdkInstances.delete(key)
        }
    }

    clearAll(): void {
        console.log('Clearing all SDK instances')
        this.sdkInstances.clear()
    }

    getNetworkSDKs(): Map<Network, DashPlatformSDK> {
        return new Map(this.sdkInstances)
    }
}

export function usePlatformSdk() {
    const { network, ensure } = useNetwork()
    const manager = SDKManager.getInstance()
    const _isInitialized = ref(false)

    async function getSDK(): Promise<DashPlatformSDK> {
        if (!_isInitialized.value) {
            await ensure()
            _isInitialized.value = true
        }
        const currentNetwork = network.value as Network
        return manager.getSDK(currentNetwork)
    }

    async function getSDKForNetwork(targetNetwork: Network): Promise<DashPlatformSDK> {
        return manager.getSDK(targetNetwork)
    }

    function clearCurrent(): void {
        manager.clearSDK(network.value as Network)
        _isInitialized.value = false
    }

    function clearAll(): void {
        manager.clearAll()
        _isInitialized.value = false
    }

    function switchNetwork(_newNetwork: Network): void {
        // Clear SDK for old network and update network
        manager.clearSDK(network.value as Network)
        _isInitialized.value = false
        // Note: network would need to be updated via settings store
    }

    return {
        getSDK,
        getSDKForNetwork,
        clearCurrent,
        clearAll,
        switchNetwork,
        isInitialized: readonly(_isInitialized)
    }
}

// Export manager for advanced usage if needed
export const sdkManager = SDKManager.getInstance()
