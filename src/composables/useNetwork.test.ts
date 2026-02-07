// src/composables/useNetwork.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useNetwork } from './useNetwork'
import { invoke } from '@/utils/tauri'
vi.mock('@/utils/tauri', () => ({
    invoke: vi.fn()
}))
describe('useNetwork', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })
    it('should default to testnet and handle successful load', async () => {
        const { refresh, network } = useNetwork()
        vi.mocked(invoke).mockResolvedValue({
            settings: { network: 'mainnet' }
        })
        const result = await refresh()
        expect(result).toBe('mainnet')
        expect(network.value).toBe('mainnet')
    })
    it('should return default testnet if settings are invalid', async () => {
        const { refresh, network } = useNetwork()
        vi.mocked(invoke).mockResolvedValue({
            settings: { network: 'invalid-net' }
        })
        const result = await refresh()
        expect(result).toBe('testnet')
        expect(network.value).toBe('testnet')
    })
    it('should handle backend errors by falling back to testnet', async () => {
        const { refresh, error } = useNetwork()
        vi.mocked(invoke).mockRejectedValue(new Error('File not found'))
        const result = await refresh()
        expect(result).toBe('testnet')
        expect(error.value).toBe('Failed to load network settings')
    })
    it('should throw error in getCurrent if accessed before loading', async () => {
        const { refresh, getCurrent } = useNetwork()
        // Use a promise we can resolve to clean up state after the assertion
        let resolvePromise: any
        const promise = new Promise((resolve) => { resolvePromise = resolve })
        vi.mocked(invoke).mockReturnValue(promise)
        const refreshTask = refresh()
        expect(() => getCurrent()).toThrow('Network is still loading')
        // Clean up: resolve the promise so _loading returns to false
        resolvePromise({ settings: { network: 'testnet' } })
        await refreshTask
    })
    it('should ensure network is loaded', async () => {
        const { ensure } = useNetwork()
        vi.mocked(invoke).mockResolvedValue({ settings: { network: 'testnet' } })
        const net = await ensure()
        expect(net).toBe('testnet')
        expect(invoke).toHaveBeenCalledWith('load_settings')
    })
})
