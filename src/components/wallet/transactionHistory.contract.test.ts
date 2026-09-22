// src/components/wallet/transactionHistory.contract.test.ts
//
// REGRESSION GUARD for the "No recent activity" bug.
//
// WHAT WENT WRONG
// ---------------
// `fetchTokenTransitions` returns a plain ARRAY (`data.resultSet`). The
// component then read `(response as any)?.data || []`. An array has no `.data`
// property, so that expression ALWAYS evaluated to `[]` and every token
// transaction was silently discarded — the wallet showed a balance but the
// history said "No recent activity". There was no error, no log, and no
// failing test, because both halves were individually correct.
//
// This test asserts the CONTRACT between the two, which is the only place the
// bug is visible.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import { fetchTokenTransitions } from '@/stores/wallet/actions/api'
import { transformTokenTransitions } from '@/stores/wallet/actions/transforms'

const COMPONENT_PATH = resolve(__dirname, 'TransactionHistory.vue')

describe('wallet history: api -> component contract', () => {
    it('fetchTokenTransitions resolves to an ARRAY, not an envelope', async () => {
        // This is the fact the component got wrong. If this ever changes to an
        // envelope, the component's unwrapping must change with it.
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ resultSet: [{ id: 't1' }, { id: 't2' }] }),
            } as any),
        )

        const result = await fetchTokenTransitions('contract')

        expect(Array.isArray(result)).toBe(true)
        expect(result).toHaveLength(2)
        // The property the component wrongly read does not exist.
        expect((result as any).data).toBeUndefined()
    })

    it('the component does NOT unwrap the response with `.data`', () => {
        // A static sweep, because the bug is a wrong property access that no
        // type check caught (the value was cast to `any`).
        const source = readFileSync(COMPONENT_PATH, 'utf8')

        // NOTE: The correct unwrap handles BOTH shapes, e.g.
        //       `Array.isArray(r) ? r : (r?.data || [])`.
        const unwrapsWithDataOnly = /\(\s*\w+Response\s+as\s+any\s*\)\s*\?\.\s*data/.test(source)
        expect(
            unwrapsWithDataOnly,
            'TransactionHistory.vue reads `(response as any)?.data` without an '
                + 'Array.isArray() branch. fetchTokenTransitions returns an array, '
                + 'so that always yields [] and history renders empty.',
        ).toBe(false)
    })
})

describe('wallet history: transform -> render contract', () => {
    it('preserves the real transitions it is given', () => {
        // Uses the exact shape returned by the live testnet explorer.
        const identityId = '34vkjdeUTP2z798SiXqoB6EAuobh51kXYURqVa9xkujf'

        const raw = [
            {
                amount: '3330000',
                recipient: 'BC6nzq4iDzknwaUQEei3HSNfVQ9FQgFRDGvUPRCyGEfA',
                owner: { identifier: identityId, aliases: [] },
                action: 'TOKEN_TRANSFER',
                stateTransitionHash: '43BAD17A8E394A3F831A'.padEnd(64, '0'),
                timestamp: '2026-01-19T23:54:43.025Z',
            },
            {
                amount: '10000000',
                recipient: identityId,
                owner: { identifier: 'HXN2cVA9QMCJrTN58SefBKS4sgh9MJ9DNmweje3vhu2i', aliases: [] },
                action: 'TOKEN_TRANSFER',
                stateTransitionHash: '43DF44C33DEC6EFF6A96'.padEnd(64, '0'),
                timestamp: '2026-01-11T22:31:59.348Z',
            },
        ]

        const txs = transformTokenTransitions(raw, identityId, 'DUSD', 6)

        expect(txs).toHaveLength(2)
        expect(txs[0]!.type).toBe('sent')
        expect(txs[1]!.type).toBe('received')
        // An empty id would collapse React/Vue keys and break the detail route.
        expect(txs.every(t => typeof t.id === 'string' && t.id.length > 0)).toBe(true)
    })

    it('produces an id even when the transition hash is absent', () => {
        // The id becomes a route parameter (`/wallet/transaction/:id`). An
        // empty one produces an unroutable link.
        const raw = [
            {
                amount: '1',
                recipient: 'x',
                owner: { identifier: 'y' },
                action: 'TOKEN_TRANSFER',
                timestamp: '2026-01-19T23:54:43.025Z',
            },
        ]

        const txs = transformTokenTransitions(raw, 'y', 'DUSD', 6)

        expect(txs).toHaveLength(1)
        expect(txs[0]!.id.length).toBeGreaterThan(0)
    })
})
