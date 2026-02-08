// src/stores/wallet/actions/transforms.test.ts

import { describe, it, expect } from 'vitest'
import {
    createUpdatedAssets,
    processTokenBalances,
    transformIdentityTransfer,
    transformTokenTransitions
} from './transforms'
describe('wallet transforms - Final Consolidated', () => {
    describe('createUpdatedAssets', () => {
        it('should create asset list with calculated values', () => {
            const assets = createUpdatedAssets(10, 5, 100, 200, 30)
            const dash = assets.find(a => a.id === 'DASH')
            expect(dash?.usdValue).toBe(300)
            expect(assets.length).toBe(4)
        })
    })
    describe('processTokenBalances', () => {
        it('should handle Base58 object-style token IDs from raw API', () => {
            const mockBalances = [
                {
                    tokenId: { base58: () => 'yNP7y...' },
                    balance: 1000000n
                }
            ]
            const result = processTokenBalances(mockBalances, 'testnet')
            expect(typeof result.dusdBalance).toBe('number')
        })
    })
    describe('transformIdentityTransfer', () => {
        const id = 'user_123'
        it('should identify IDENTITY_CREDIT_WITHDRAWAL as a specific UI type', () => {
            const raw = { type: 'IDENTITY_CREDIT_WITHDRAWAL', amount: 500, hash: 'tx1' }
            const tx = transformIdentityTransfer(raw, id)
            expect(tx.title).toBe('Withdrawal')
            expect(tx.subtitle).toBe('To Layer 1')
        })
    })
    describe('transformTokenTransitions', () => {
        const id = 'my_id'
        it('should process TOKEN_MINT actions correctly', () => {
            const raw = [{
                action: 'TOKEN_MINT',
                amount: '100',
                owner: { identifier: id },
                stateTransitionHash: 'hash1'
            }]
            const results = transformTokenTransitions(raw, id, 'DUSD', 6)
            expect(results[0]!.title).toBe('Minted DUSD')
            expect(results[0]!.direction).toBe('OUTGOING')
        })
        it('should process TOKEN_BURN actions correctly', () => {
            const raw = [{
                action: 'TOKEN_BURN',
                amount: '50',
                owner: { identifier: id },
                stateTransitionHash: 'hash2'
            }]
            const results = transformTokenTransitions(raw, id, 'DUSD', 6)
            expect(results[0]!.title).toBe('Burnt DUSD')
            expect(results[0]!.direction).toBe('OUTGOING')
        })
        it('should distinguish between Sent and Received transfers', () => {
            const raw = [
                {
                    action: 'TOKEN_TRANSFER',
                    amount: '10',
                    owner: { identifier: id },
                    recipient: 'other',
                    stateTransitionHash: 'h3'
                },
                {
                    action: 'TOKEN_TRANSFER',
                    amount: '20',
                    owner: { identifier: 'other' },
                    recipient: id,
                    stateTransitionHash: 'h4'
                }
            ]
            const results = transformTokenTransitions(raw, id, 'DUSD', 6)
            expect(results[0]!.direction).toBe('OUTGOING')
            expect(results[1]!.direction).toBe('INCOMING')
        })
    })
})
