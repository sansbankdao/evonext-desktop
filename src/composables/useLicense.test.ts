// src/composables/useLicense.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useLicense } from './useLicense'
import { invoke } from '@/utils/tauri'

vi.mock('@/utils/tauri', () => ({
    invoke: vi.fn()
}))

describe('useLicense', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('loadLicense should update state correctly on success', async () => {
        const mockLicense = { identityId: '123', isPremium: true }
        vi.mocked(invoke).mockResolvedValueOnce(mockLicense)

        const { loadLicense, license, loading } = useLicense()

        const promise = loadLicense('123')
        expect(loading.value).toBe(true)

        const result = await promise
        expect(result).toEqual(mockLicense)
        expect(license.value).toEqual(mockLicense)
        expect(loading.value).toBe(false)
    })

    it('loadLicense should handle errors', async () => {
        vi.mocked(invoke).mockRejectedValueOnce('API Error')
        const { loadLicense, loading } = useLicense()

        const result = await loadLicense('123')
        expect(result).toBeNull()
        expect(loading.value).toBe(false)
    })

    it('refreshLicense should update and return new data', async () => {
        const mockLicense = { identityId: '123', isPremium: false }
        vi.mocked(invoke).mockResolvedValueOnce(mockLicense)

        const { refreshLicense, license } = useLicense()
        await refreshLicense('123')

        expect(license.value?.isPremium).toBe(false)
    })

    it('refreshLicense should return existing license on failure', async () => {
        const initialLicense = { identityId: '123', isPremium: true }
        vi.mocked(invoke).mockResolvedValueOnce(initialLicense)

        const { loadLicense, refreshLicense } = useLicense()
        await loadLicense('123')

        vi.mocked(invoke).mockRejectedValueOnce('Update Failed')
        const result = await refreshLicense('123')

        expect(result).toEqual(initialLicense)
    })

    it('clearLicense should nullify state', async () => {
        const { clearLicense, license } = useLicense()
        await clearLicense('123')
        expect(invoke).toHaveBeenCalledWith('delete_license', { identityId: '123' })
        expect(license.value).toBeNull()
    })

    it('computeds should reflect current state', async () => {
        const { isPremium, hasPremiumLicense } = useLicense()
        // Default state check
        expect(isPremium.value).toBe(false)
        expect(hasPremiumLicense()).toBe(false)
    })
})
