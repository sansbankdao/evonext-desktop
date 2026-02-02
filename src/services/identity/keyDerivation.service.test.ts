// src/services/identity/keyDerivation.service.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { KeyDerivationService } from './keyDerivation.service'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKeyWASM } from 'pshenmic-dpp'

vi.mock('pshenmic-dpp', () => ({
    PrivateKeyWASM: {
        fromWIF: vi.fn().mockReturnValue({
            getPublicKey: () => ({ bytes: () => new Uint8Array(33) }),
            WIF: () => 'mock_wif'
        }),
        fromHex: vi.fn().mockReturnValue({
            getPublicKey: () => ({ bytes: () => new Uint8Array(33) }),
            WIF: () => 'mock_wif'
        })
    }
}))

vi.mock('dash-platform-sdk', () => {
    const MockSDK = vi.fn().mockImplementation(function(this: any) {
        this.keyPair = {
            mnemonicToSeed: vi.fn().mockResolvedValue(Buffer.from('seed')),
            seedToHdKey: vi.fn().mockReturnValue({}),
            deriveIdentityPrivateKey: vi.fn().mockReturnValue({
                privateKey: Buffer.from('f'.repeat(64), 'hex'),
                publicKey: Buffer.from('02' + 'f'.repeat(64), 'hex')
            })
        }
    })
    return { DashPlatformSDK: MockSDK }
})

vi.mock('@evonext/utils', () => ({
    binToHex: vi.fn(() => 'f'.repeat(64)),
    hexToBin: vi.fn(() => new Uint8Array(32))
}))

vi.mock('@/services/crypto', () => ({
    hash160: vi.fn().mockResolvedValue(new Uint8Array(20))
}))

describe('KeyDerivationService - SDK Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        KeyDerivationService.cleanup()
    })

    it('should track SDK instances correctly and derive keys', async () => {
        const mnemonic = 'word '.repeat(12).trim()
        await KeyDerivationService.getPrivateKeyWASM(mnemonic, 'testnet', 0, 0)

        const sdkConstructor = vi.mocked(DashPlatformSDK)
        expect(sdkConstructor).toHaveBeenCalled()

        const sdkInstance = sdkConstructor.mock.instances[0] as any
        expect(sdkInstance.keyPair.deriveIdentityPrivateKey).toHaveBeenCalled()
        expect(PrivateKeyWASM.fromHex).toHaveBeenCalled()
    })
})
