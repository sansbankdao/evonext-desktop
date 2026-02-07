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

    it('should throw error in getCurrent if accessed before loading', () => {
        const { getCurrent } = useNetwork()
        // Mock loading state by triggering a refresh but not awaiting it
        vi.mocked(invoke).mockReturnValue(new Promise(() => {}))

        // We trigger it to set _loading to true
        const { refresh } = useNetwork()
        refresh()

        expect(() => getCurrent()).toThrow('Network is still loading')
    })

    it('should ensure network is loaded', async () => {
        const { ensure } = useNetwork()
        vi.mocked(invoke).mockResolvedValue({ settings: { network: 'testnet' } })

        const net = await ensure()
        expect(net).toBe('testnet')
        expect(invoke).toHaveBeenCalledWith('load_settings')
    })
})
