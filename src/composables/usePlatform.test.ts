// src/composables/usePlatform.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePlatform } from './usePlatform'

// Mock the SDK
vi.mock('dash-platform-sdk', () => ({
    DashPlatformSDK: vi.fn().mockImplementation((opts) => ({
        options: opts,
        _debugInfo: {},
        disconnect: vi.fn()
    }))
}))

vi.mock('./useNetwork', () => ({
    useNetwork: () => ({
        ensure: vi.fn().mockResolvedValue('testnet')
    })
}))

describe('usePlatform', () => {
    beforeEach(() => {
        const { reset } = usePlatform()
        reset()
        vi.clearAllMocks()
    })

    it('should initialize a new SDK instance', async () => {
        const { initialize, currentNetwork } = usePlatform()
        const sdkInstance = await initialize({ network: 'mainnet' })

        expect(sdkInstance).toBeDefined()
        expect(currentNetwork.value).toBe('mainnet')
    })

    it('should reuse existing SDK if network matches (Singleton)', async () => {
        const { getSDK, creationCount } = usePlatform()

        await getSDK('testnet')
        const firstCount = creationCount.value

        await getSDK('testnet')
        expect(creationCount.value).toBe(firstCount)
    })

    it('should create a new SDK if network changes', async () => {
        const { getSDK, creationCount } = usePlatform()

        await getSDK('testnet')
        await getSDK('mainnet')

        expect(creationCount.value).toBe(2)
    })

    it('should reset state and call disconnect', async () => {
        const { getSDK, reset, sdk, currentNetwork } = usePlatform()
        const instance = await getSDK('testnet')
        const disconnectSpy = vi.spyOn(instance as any, 'disconnect')

        reset()
        expect(sdk.value).toBeNull()
        expect(currentNetwork.value).toBeNull()
        expect(disconnectSpy).toHaveBeenCalled()
    })
})
