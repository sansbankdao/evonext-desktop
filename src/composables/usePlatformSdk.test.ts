// src/composables/usePlatformSdk.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePlatformSdk, sdkManager } from './usePlatformSdk'
import { DashPlatformSDK } from 'dash-platform-sdk'

vi.mock('dash-platform-sdk', () => ({
    // Use a function instead of an arrow function to ensure it is constructible
    DashPlatformSDK: vi.fn().mockImplementation(function () {
        return {
            identities: {}
        }
    })
}))

vi.mock('./useNetwork', () => ({
    useNetwork: () => ({
        network: { value: 'testnet' },
        ensure: vi.fn().mockResolvedValue('testnet')
    })
}))

describe('usePlatformSdk logic', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        sdkManager.clearAll()
    })

    it('should create and cache SDK instances (Singleton)', async () => {
        const { getSDK } = usePlatformSdk()

        const sdk1 = await getSDK()
        const sdk2 = await getSDK()

        expect(DashPlatformSDK).toHaveBeenCalledTimes(1)
        expect(sdk1).toBe(sdk2)
    })

    it('should maintain separate instances for different networks', async () => {
        const { getSDKForNetwork } = usePlatformSdk()

        const testnetSdk = await getSDKForNetwork('testnet')
        const mainnetSdk = await getSDKForNetwork('mainnet')

        expect(testnetSdk).not.toBe(mainnetSdk)
        expect(DashPlatformSDK).toHaveBeenCalledTimes(2)
    })

    it('should clear specific network instance', async () => {
        const { getSDKForNetwork, clearAll } = usePlatformSdk()
        await getSDKForNetwork('testnet')

        clearAll()
        await getSDKForNetwork('testnet')

        expect(DashPlatformSDK).toHaveBeenCalledTimes(2)
    })
})
