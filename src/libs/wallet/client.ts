// src/libs/wallet/client.ts
import { CreditTransfer } from './credits'
import { TokenTransfer } from './tokens'
import { BalanceChecker } from './balances'
import type { SendCreditParams, SendTokenParams, BalanceResult, TransactionResult } from '@/types'
export class WalletClient {
    private creditTransfer: CreditTransfer
    private tokenTransfer: TokenTransfer
    private balanceChecker: BalanceChecker
    constructor() {
        this.creditTransfer = new CreditTransfer()
        this.tokenTransfer = new TokenTransfer()
        this.balanceChecker = new BalanceChecker()
    }
    async initialize(): Promise<void> {
        await Promise.all([
            this.creditTransfer.initialize(),
            this.tokenTransfer.initialize(),
            this.balanceChecker.initialize()
        ])
    }
    // Credit operations
    async sendCredits(params: SendCreditParams): Promise<TransactionResult> {
        return this.creditTransfer.send(params)
    }
    // Token operations
    async sendToken(params: SendTokenParams): Promise<TransactionResult> {
        return this.tokenTransfer.send(params)
    }
    // Balance operations
    async getBalances(identityId: string): Promise<BalanceResult> {
        return this.balanceChecker.getBalances(identityId)
    }
    async getTokenBalance(identityId: string, tokenId: string): Promise<bigint> {
        return this.balanceChecker.getBalanceForToken(identityId, tokenId)
    }
    async hasSufficientBalance(identityId: string, requiredCredits: bigint): Promise<boolean> {
        return this.balanceChecker.hasSufficientBalance(identityId, requiredCredits)
    }
    // Convenience methods
    async sendCredit(
        identityId: string,
        identityIdx: number,
        receiver: string,
        credits: bigint
    ): Promise<TransactionResult> {
        return this.creditTransfer.sendCredit(identityId, identityIdx, receiver, credits)
    }
    async sendTokenTransfer(
        identityId: string,
        identityIdx: number,
        tokenId: string,
        receiver: string,
        atomicUnits: bigint
    ): Promise<TransactionResult> {
        return this.tokenTransfer.sendToken(identityId, identityIdx, tokenId, receiver, atomicUnits)
    }
}
// Singleton instance
let walletClient: WalletClient | null = null
export function getWalletClient(): WalletClient {
    if (!walletClient) {
        walletClient = new WalletClient()
    }
    return walletClient
}
