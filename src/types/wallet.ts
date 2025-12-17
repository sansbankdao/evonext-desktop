// src/types/wallet.ts
import type { IAsset, ITransaction, IBalanceChange, IUser2 } from './index'
export interface IWalletState {
    user: IUser2 | null
    assets: IAsset[]
    transactions: ITransaction[]
    balanceChange: IBalanceChange | null
    isLoading: boolean
}
// Wallet-specific API types
export interface IdentityTransfer {
    amount: number
    sender: string | null
    recipient: string
    timestamp: string
    txHash: string
    type: string
    blockHash: string
    gasUsed: number
}
export interface TokenTransition {
    amount: number
    recipient: string
    owner: {
        identifier: string
        aliases: Array<{
            alias: string
            contested: boolean
            documentId: string
            status: string
            timestamp: string
        }>
    }
    action: string
    stateTransitionHash: string
    timestamp: string
    publicNote: string | null
}
export interface ApiResponse<T> {
    resultSet: T[]
    pagination: {
        page: number
        limit: number
        total: number
    }
}
export interface TokenBalance {
    tokenId: {
        base58: () => string
    }
    balance: bigint
}
export interface BalanceUpdateResult {
    DASH: number
    CREDITS: number
    DUSD: number
    SANS: number
    updatedAssets: IAsset[]
}
export interface TokenBalanceResponse {
    tokenId: string
    balance: bigint
    formattedBalance: string
}
export interface AssetPriceUpdate {
    ticker: string
    usdValue: number
}
// Export the base types from index for convenience
export type { IAsset, ITransaction, IBalanceChange, IUser2 }
