// src/services/identity/registration.service.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RegistrationService } from './registration.service'
import { EvoSDK } from '@dashevo/evo-sdk'

vi.mock('@dashevo/evo-sdk', () => {
    const MockEvo = {
        connect: vi.fn().mockResolvedValue(true),
        identities: {
            create: vi.fn().mockResolvedValue({
                getId: () => 'mock_id'
            })
        },
        dpns: {
            registerName: vi.fn().mockResolvedValue(true)
        }
    }
    return {
        EvoSDK: {
            testnetTrusted: vi.fn().mockReturnValue(MockEvo),
            mainnetTrusted: vi.fn().mockReturnValue(MockEvo)
        }
    }
})

vi.mock('./keyDerivation.service', () => ({
    KeyDerivationService: {
        deriveAllKeysFromSeed: vi.fn().mockResolvedValue([{
            keys: Array(5).fill({
                publicKey: 'pub',
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
