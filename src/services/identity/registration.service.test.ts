// src/services/identity/registration.service.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RegistrationService } from './registration.service'
const MockEvo = vi.hoisted(() => ({
    connect: vi.fn().mockResolvedValue(true),
    identities: {
        create: vi.fn().mockResolvedValue(undefined)
    },
    dpns: {
        registerName: vi.fn().mockResolvedValue(true)
    }
}))
vi.mock('@/services/platform', () => ({
    connectEvoSdk: vi.fn().mockResolvedValue(MockEvo)
}))
vi.mock('@dashevo/evo-sdk', () => {
    class MockAssetLockProof {
        createIdentityId() { return { toBase58: () => 'mock_id' } }
        static fromJSON() { return new MockAssetLockProof() }
        static fromHex() { return new MockAssetLockProof() }
    }
    class MockIdentity {
        keys: any[] = []
        addPublicKey(pk: any) { this.keys.push(pk) }
        getPublicKeyById(id: number) { return this.keys[id] }
    }
    class MockIdentityPublicKeyInCreation {
        constructor(public options: any) {}
        toIdentityPublicKey() { return { keyId: this.options.keyId } }
    }
    class MockIdentitySigner {
        keys: string[] = []
        addKeyFromWif(wif: string) { this.keys.push(wif); return this }
    }
    class MockPrivateKey {
        static fromWIF(wif: string) { return { wif } }
    }
    return {
        EvoSDK: {
            testnetTrusted: vi.fn().mockReturnValue(MockEvo),
            mainnetTrusted: vi.fn().mockReturnValue(MockEvo)
        },
        AssetLockProof: MockAssetLockProof,
        Identity: MockIdentity,
        IdentityPublicKeyInCreation: MockIdentityPublicKeyInCreation,
        IdentitySigner: MockIdentitySigner,
        PrivateKey: MockPrivateKey,
        KeyType: { ECDSA_SECP256K1: 0, BLS12_381: 1, ECDSA_HASH160: 2 },
        Purpose: { AUTHENTICATION: 0, ENCRYPTION: 1, DECRYPTION: 2, TRANSFER: 3 },
        SecurityLevel: { MASTER: 0, CRITICAL: 1, HIGH: 2, MEDIUM: 3 }
    }
})
vi.mock('./keyDerivation.service', () => ({
    KeyDerivationService: {
        deriveAllKeysFromSeed: vi.fn().mockResolvedValue([{
            keys: Array(5).fill({
                publicKey: 'aa',
                publicKeyHash: 'bb',
                privateKey: {
                    toBuffer: () => Buffer.from('a'),
                    toWIF: () => 'wif'
                }
            })
        }])
    }
}))
vi.mock('@/composables/useMnemonic', () => ({
    mnemonicManager: {
        getMnemonic: vi.fn().mockResolvedValue('test mnemonic')
    }
}))
describe('RegistrationService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        global.fetch = vi.fn()
    })
    it('should handshake with registrar and return platform ID', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ registrar: { dashAddr: 'Xaddr' } })
        } as Response)
        const addr = await RegistrationService.getPaymentAddress('alice', '', 'testnet')
        expect(addr).toBe('Xaddr')
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ results: [{ proof: 'p', wif: 'w' }] })
        } as Response)
        const proof = await RegistrationService.pollForProof('testnet')
        expect(proof?.proof).toBe('p')
        const id = await RegistrationService.registerOnPlatform('p', 'w', 'alice', 'testnet')
        expect(id).toBe('mock_id')
    })
})
