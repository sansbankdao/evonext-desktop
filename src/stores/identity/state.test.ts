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

    it('should initialize all primitive state values correctly', () => {
        const state = useIdentityState()
        expect(state.identityId).toBeNull()
        expect(state.identityIdx).toBe(0)
        expect(state.username).toBeNull()
        expect(state.displayName).toBe('')
        expect(state.identity).toBeNull()
        expect(state.balance).toBe('0')
        expect(state.formattedBalance).toBe('0.00 DASH')
        expect(state.revision).toBe(0)
        expect(state.isAuthenticated).toBe(false)
        expect(state.isConnected).toBe(false)
        expect(state.isConnecting).toBe(false)
        expect(state.premiumAccess).toBe(false)
        expect(state.connectionError).toBeNull()
        expect(state.discoveryProgress).toBeNull()
    })

    it('should initialize collection state values correctly', () => {
        const state = useIdentityState()
        expect(state.identities).toEqual({})
        expect(state.publicKeys).toEqual([])
        expect(state.balanceBigInt).toBe(BigInt(0))
        expect(state.dashBigInt).toBe(BigInt(0))
    })

    it('should have all connection action stubs returning failure', async () => {
        const state = useIdentityState()
        const pkRes = await state.connectWithPrivateKey('', '', '')
        expect(pkRes.success).toBe(false)
        const woRes = await state.connectWriteOnlyFromDiscovered({} as any, '')
        expect(woRes.success).toBe(false)
    })

    it('should have all lifecycle action stubs as no-ops', async () => {
        const state = useIdentityState()
        await expect(state.refreshIdentity()).resolves.toBeUndefined()
        await expect(state.fetchBalance()).resolves.toBeUndefined()
        const keys = await state.loadPublicKeys()
        expect(keys).toEqual([])
    })

    it('should have query stubs returning expected shapes', async () => {
        const state = useIdentityState()
        const pubKeysRes = await state.getPublicKeys('id', 'testnet')
        expect(pubKeysRes).toEqual({ success: false, data: null })
    })

    it('should have management action stubs as no-ops', async () => {
        const state = useIdentityState()
        await expect(state.switchIdentity('id_1')).resolves.toBeUndefined()
        await expect(state.deleteIdentity('id_1')).resolves.toBeUndefined()
        await expect(state.updateIdentityMetadata('id_1', {})).resolves.toBeUndefined()
        const identities = await state.searchUserIdentities()
        expect(identities).toEqual([])
    })

    it('should have storage action stubs working correctly', async () => {
        const state = useIdentityState()
        await expect(state.loadFromStorage()).resolves.toBeUndefined()
        await expect(state.saveToStorage()).resolves.toBeUndefined()
        await expect(state.clearStorage()).resolves.toBeUndefined()
        state.clearConnectionError()
        // no throw means it works
    })

    it('should have save stubs returning failure', async () => {
        const state = useIdentityState()
        const mnemonicRes = await state.saveMnemonicToStore('testnet', 'mnemonic')
        expect(mnemonicRes).toEqual({ success: false })
        const identityDataRes = await state.saveIdentityDataToStore('testnet', 'id', {})
        expect(identityDataRes).toEqual({ success: false })
        const saveIdentityRes = await state.saveIdentity('testnet', {})
        expect(saveIdentityRes).toEqual({ success: false })
    })

    it('should have getCurrentNetwork returning testnet', async () => {
        const state = useIdentityState()
        const net = await state.getCurrentNetwork()
        expect(net).toBe('testnet')
    })
})
