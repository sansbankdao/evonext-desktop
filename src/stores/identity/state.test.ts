// src/stores/identity/state.test.ts

import { describe, it, expect } from 'vitest'
import { useIdentityState } from './state'

describe('Identity Store State', () => {
    it('stubs should return expected failure objects', async () => {
        const state = useIdentityState()
        const seedRes = await state.connectWithSeed('', 'mainnet', '', 0)
        expect(seedRes.success).toBe(false)
        const saveKeysRes = await state.saveKeys('mainnet', '', [])
        expect(saveKeysRes).toEqual({ success: false })
        const loadKeystoreRes = await state.loadKeystore('mainnet')
        expect(loadKeystoreRes).toEqual({ success: false })
    })
})
