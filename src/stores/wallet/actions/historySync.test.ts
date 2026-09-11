// src/stores/wallet/actions/historySync.test.ts

import { describe, it, expect } from 'vitest'
import {
    normalizeTimestampSeconds,
    transactionToRecord,
    recordToTransaction,
} from './historySync'
import type { ITransaction } from '@/types'

function sampleTx(overrides: Partial<ITransaction> = {}): ITransaction {
    return {
        id: 'abc123',
        hash: 'abc123',
        confirmations: 12,
        senderId: 'senderIdentity',
        receiverId: 'receiverIdentity',
        amount: 250000,
        assetType: 'COIN',
        assetSymbol: 'CREDITS',
        fee: 226,
        status: 'CONFIRMED',
        type: 'IDENTITY_CREDIT_TRANSFER',
        direction: 'INCOMING',
        network: 'testnet',
        timestamp: 1_700_000_000,
        date: 1_700_000_000,
        createdAt: 1_700_000_000,
        ...overrides,
    } as ITransaction
}

describe('normalizeTimestampSeconds', () => {
    it('keeps second-precision timestamps', () => {
        expect(normalizeTimestampSeconds(1_700_000_000)).toBe(1_700_000_000)
    })

    it('converts millisecond timestamps', () => {
        expect(normalizeTimestampSeconds(1_700_000_000_000)).toBe(1_700_000_000)
    })

    it('uses the first valid candidate', () => {
        expect(normalizeTimestampSeconds(undefined, 1_700_000_000_000, 5)).toBe(1_700_000_000)
    })

    it('falls back to now when all candidates are invalid', () => {
        const before = Math.floor(Date.now() / 1000)
        const got = normalizeTimestampSeconds(undefined, null, -1, NaN)
        expect(got).toBeGreaterThanOrEqual(before)
    })
})

describe('transactionToRecord', () => {
    it('maps incoming transfers to positive receive records', () => {
        const rec = transactionToRecord(sampleTx())
        expect(rec.direction).toBe('receive')
        expect(rec.amount).toBe(250000)
        expect(rec.counterparty).toBe('senderIdentity')
        expect(rec.status).toBe('confirmed')
        expect(rec.network).toBe('testnet')
        expect(rec.fee).toBe(226)
    })

    it('maps outgoing transfers to negative send records', () => {
        const rec = transactionToRecord(sampleTx({ direction: 'OUTGOING' }))
        expect(rec.direction).toBe('send')
        expect(rec.amount).toBe(-250000)
        expect(rec.counterparty).toBe('receiverIdentity')
    })

    it('treats SELF transfers as sends', () => {
        const rec = transactionToRecord(sampleTx({ direction: 'SELF' }))
        expect(rec.direction).toBe('send')
        expect(rec.amount).toBe(-250000)
    })

    it('lowercases status into the wire enum, unknown -> pending', () => {
        expect(transactionToRecord(sampleTx({ status: 'PENDING' })).status).toBe('pending')
        expect(transactionToRecord(sampleTx({ status: 'FAILED' })).status).toBe('failed')
        expect(transactionToRecord(sampleTx({ status: 'WHATEVER' as never })).status).toBe('pending')
    })

    it('prefers hash over id and embeds rawJson for the reverse mapping', () => {
        const rec = transactionToRecord(sampleTx({ id: 'x', hash: 'realhash' }))
        expect(rec.txid).toBe('realhash')
        expect(rec.rawJson).toBeTruthy()
        expect(JSON.parse(rec.rawJson!).hash).toBe('realhash')
    })
})

describe('recordToTransaction', () => {
    it('round-trips through rawJson when present', () => {
        const original = sampleTx({ title: 'Credits Received' })
        const back = recordToTransaction(transactionToRecord(original))
        expect(back.hash).toBe(original.hash)
        expect(back.title).toBe('Credits Received')
        expect(back.amount).toBe(original.amount)
    })

    it('builds a minimal honest shape without rawJson', () => {
        const tx = recordToTransaction({
            txid: 'deadbeef',
            network: 'testnet',
            direction: 'send',
            amount: -42,
            fee: null,
            timestamp: 1_700_000_000,
            blockHeight: null,
            counterparty: 'someoneElse',
            status: 'pending',
            rawJson: null,
        })
        expect(tx.hash).toBe('deadbeef')
        expect(tx.direction).toBe('OUTGOING')
        expect(tx.receiverId).toBe('someoneElse')
        expect(tx.amount).toBe(42)
        expect(tx.status).toBe('PENDING')
        expect(tx.subtitle).toContain('offline')
    })

    it('survives corrupt rawJson', () => {
        const tx = recordToTransaction({
            txid: 'corrupt',
            network: 'mainnet',
            direction: 'receive',
            amount: 7,
            fee: 1,
            timestamp: 1_600_000_000,
            blockHeight: 99,
            counterparty: 'senderX',
            status: 'confirmed',
            rawJson: '{not json',
        })
        expect(tx.hash).toBe('corrupt')
        expect(tx.direction).toBe('INCOMING')
        expect(tx.senderId).toBe('senderX')
        expect(tx.blockHeight).toBe(99)
    })
})
