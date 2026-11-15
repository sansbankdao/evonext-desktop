// tests/shielded/identity-manager.test.mts
//
// The desktop identity-manager wiring (ported 1:1 from evonext.app
// lib/identity-manager.ts): the seed-index scan MUST map the wasm
// identity responses into the IIdentity shape wallet-manager's
// getAuthKey/getTransferKey consume — keyType enum mapping, base64→hex
// dataBytes, both signature schemes, and honest nulls when a scan index
// holds no identity.
//
// Network-free: the wasm sdk service and the two compat identity queries
// are mocked; getPrivateKeys is driven by a REAL mnemonic through the
// real wasm derive (compat-derive pattern) — the key shapes asserted
// here are the ones the send paths match against.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/* Real wasm (the same initSync pattern as token-send/token-facts). */
vi.mock('@/lib/dash-wasm/wasm_sdk.js', async (importOriginal) => {
    const actual = await importOriginal<any>()
    actual.initSync({ module: readFileSync(join(process.cwd(), 'src/lib/dash-wasm/wasm_sdk_bg.wasm')) })
    return actual
})

/* getPrivateKeys derives REAL keys from the session mnemonic. */
vi.mock('@/lib/secure-storage', async (importOriginal) => {
    const actual = await importOriginal<any>()
    return {
        ...actual,
        getMnemonic: () => 'legal winner thank year wave sausage worth useful legal winner thank yellow',
        getIdentityIdx: () => 0,
    }
})

/* The identity queries are mocked per test; the sdk handle is captured. */
const nonUniqueMock = vi.fn()
const uniqueMock = vi.fn()

vi.mock('@/lib/dash-wasm/compat', async (importOriginal) => {
    const actual = await importOriginal<any>()
    return {
        ...actual,
        get_identity_by_non_unique_public_key_hash: (...args: any[]) => nonUniqueMock(...args),
        get_identity_by_public_key_hash: (...args: any[]) => uniqueMock(...args),
    }
})

const sdkHandle = { fake: 'sdk' }
vi.mock('@/lib/services/wasm-sdk-service', async (importOriginal) => {
    const actual = await importOriginal<any>()
    return {
        ...actual,
        /* HERMETIC: no live trusted-context prefetch inside unit tests —
         * ensureWasmSdkService() sees an uninitialized service and calls
         * this initialize; the sdk handle below is what the search
         * functions receive. */
        wasmSdkService: {
            initializedNetwork: () => null,
            initialize: vi.fn(async () => {}),
        },
        getWasmSdk: async () => sdkHandle,
    }
})

import { getIdentities, searchByHash160, searchBySecp256k1 } from '../../src/lib/identity-manager'

/* The wasm returns class instances; consumers call toJSON(). */
const identityInstance = (json: any) => ({ toJSON: () => json })

beforeEach(() => {
    nonUniqueMock.mockReset()
    uniqueMock.mockReset()
    /* The scan queries 3 indices × 2 schemes — default to a clean miss
     * (the null path) so no call ever returns bare undefined. */
    nonUniqueMock.mockResolvedValue(null)
    uniqueMock.mockResolvedValue(null)
})

describe('identity-manager (desktop wiring of the ported seed scan)', () => {
    it('maps a found identity with keyType names + base64→hex dataBytes (both schemes)', async () => {
        const identJson = {
            id: 'EcbXLyhWeMB3BLmpVk1sWgtwQjUzaFASwhL3ShxXqdVa',
            publicKeys: [
                { id: 0, type: 0, purpose: 0, securityLevel: 0, data: Buffer.from([0x01, 0x02]).toString('base64'), readOnly: false, disabledAt: null },
                { id: 1, type: 2, purpose: 0, securityLevel: 0, data: Buffer.from([0x03]).toString('base64'), readOnly: true, disabledAt: null },
            ],
        }
        nonUniqueMock.mockResolvedValueOnce([identityInstance(identJson)])
        uniqueMock.mockResolvedValueOnce(identityInstance(identJson))

        const result = await getIdentities('testnet')
        expect(result).not.toBeNull()
        expect(result!.length).toBe(2) // index 0 found by BOTH schemes

        const first = result![0]
        expect(first.id).toBe('EcbXLyhWeMB3BLmpVk1sWgtwQjUzaFASwhL3ShxXqdVa')
        expect(first.idx).toBe(0)

        const mapped = first.publicKeys[0]
        expect(mapped.keyType).toBe('ECDSA_SECP256K1') // enum 0
        expect(mapped.purpose).toBe(0)
        expect(mapped.securityLevel).toBe(0)
        expect(mapped.dataBytes).toBe('0102') // base64 → hex

        const second = first.publicKeys[1]
        expect(second.keyType).toBe('ECDSA_HASH160') // enum 2
        expect(second.dataBytes).toBe('03')
        expect(second.readOnly).toBe(true)
    })

    it('passes the REAL derived master key hash to BOTH queries', async () => {
        nonUniqueMock.mockResolvedValueOnce(null)
        uniqueMock.mockResolvedValueOnce(null)

        await getIdentities('testnet')

        expect(nonUniqueMock).toHaveBeenCalled()
        expect(uniqueMock).toHaveBeenCalled()
        const hash = nonUniqueMock.mock.calls[0][1]
        expect(hash).toMatch(/^[0-9a-f]{40}$/) // hash160 = 20 bytes
    })

    it('returns null when no index holds an identity', async () => {
        nonUniqueMock.mockResolvedValue(null)
        uniqueMock.mockResolvedValue(null)

        expect(await getIdentities('testnet')).toBeNull()
    })

    it('tolerates query rejection (caught → null → no identity pushed)', async () => {
        nonUniqueMock.mockRejectedValueOnce(new Error('offline'))
        nonUniqueMock.mockResolvedValueOnce(null)
        uniqueMock.mockResolvedValueOnce(null)
        uniqueMock.mockRejectedValueOnce(new Error('offline'))

        expect(await getIdentities('testnet')).toBeNull()
    })

    it('searchByHash160 normalizes the 4.1.1 class instance via toJSON()', async () => {
        const identJson = {
            id: '8Yj6VuAEr5VMRhYeume9fNgCueYNv2oUJmWeBqX5UUXy',
            publicKeys: [{ id: 0, type: 2, purpose: 0, securityLevel: 0, data: Buffer.from([0x0a]).toString('base64') }],
        }
        nonUniqueMock.mockResolvedValueOnce([identityInstance(identJson)])

        const result = await searchByHash160('testnet', 0)
        expect(result).not.toBeNull()
        expect(result!.identityId).toBe('8Yj6VuAEr5VMRhYeume9fNgCueYNv2oUJmWeBqX5UUXy')
        expect(result!.regPubKeys).toHaveLength(1)
    })

    it('searchBySecp256k1 treats a null response as not-found', async () => {
        uniqueMock.mockResolvedValueOnce(null)
        expect(await searchBySecp256k1('testnet', 1)).toBeNull()
    })
})
