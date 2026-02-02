// src/services/identity/keyDerivation.service.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { KeyDerivationService } from './keyDerivation.service'
import { DashPlatformSDK } from 'dash-platform-sdk'

vi.mock('dash-platform-sdk', () => {
    const MockSDK = vi.fn(() => ({
        keyPair: {
            mnemonicToSeed: vi.fn().mockResolvedValue(Buffer.from('seed')),
            seedToHdKey: vi.fn().mockReturnValue({}),
            deriveIdentityPrivateKey: vi.fn().mockReturnValue({
                privateKey: Buffer.from('private_bytes_32_chars_long_!!'),
                publicKey: Buffer.from('public_bytes_33_chars_long_!!!')
            })
        }
    }))
    return { DashPlatformSDK: MockSDK }
})

describe('KeyDerivationService - Instance Tracking', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        KeyDerivationService.cleanup()
    })

    it('should track SDK instances correctly', async () => {
        const mnemonic = 'word '.repeat(12).trim()
        await KeyDerivationService.getPrivateKeyWASM(mnemonic, 'testnet', 0, 0)

        const sdkConstructor = vi.mocked(DashPlatformSDK)
        expect(sdkConstructor).toHaveBeenCalled()

        const sdkInstance = sdkConstructor.mock.instances[0] as any
        expect(sdkInstance.keyPair.deriveIdentityPrivateKey).toHaveBeenCalled()
    })
})
