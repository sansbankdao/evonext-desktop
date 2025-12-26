// src/types/wallet.ts

import type {
    IAsset,
    ITransaction,
    IBalanceChange,
    IUser2,
    ITxSuccess,
    ITxError,
} from './index'

export interface IWalletState {
    user: IUser2 | null;
    assets: IAsset[];
    transactions: ITransaction[];
    balanceChange: IBalanceChange | null;
    isLoading: boolean;
}

// Wallet-specific API types
export interface IdentityTransfer {
    amount: number;
    sender: string | null;
    recipient: string;
    timestamp: string;
    txHash: string;
    type: string;
    blockHash: string;
    gasUsed: number;
}

export interface TokenTransition {
    amount: number;
    recipient: string;
    owner: {
        identifier: string;
        aliases: Array<{
            alias: string;
            contested: boolean;
            documentId: string;
            status: string;
            timestamp: string;
        }>
    }
    action: string;
    stateTransitionHash: string;
    timestamp: string;
    publicNote: string | null;
}

export interface ApiResponse<T> {
    resultSet: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
    }
}

export interface TokenBalance {
    tokenId: {
        base58: () => string;
    }
    balance: bigint;
}

export interface BalanceResult {
    credits: bigint;
    dash: bigint;
    tokens: TokenBalance[];
}

export interface NetworkConfig {
    isTestnet: boolean;
    platformEndpoint: string;
    dapiEndpoint: string;
}

export interface TokenBalanceResponse {
    tokenId: string;
    balance: bigint;
    formattedBalance: string;
}

export interface AssetPriceUpdate {
    ticker: string;
    usdValue: number;
}

// Wallet operation types
export interface SendCreditParams {
    identityId: string;
    identityIdx: number;
    receiver: string;
    credits: bigint;
}

export interface SendTokenParams {
    identityId: string;
    identityIdx: number;
    tokenId: string;
    receiver: string;
    atomicUnits: bigint;
}

export interface TransactionResult {
    success: boolean;
    data?: ITxSuccess;
    error?: ITxError;
    hash?: string;
}

// Wallet client types
export interface IWalletClient {
    sendCredits(params: SendCreditParams): Promise<TransactionResult>;
    sendToken(params: SendTokenParams): Promise<TransactionResult>;
    getBalances(identityId: string): Promise<BalanceResult>;
    getTokenBalance(identityId: string, tokenId: string): Promise<bigint>;
    hasSufficientBalance(identityId: string, requiredCredits: bigint): Promise<boolean>;
}

// Constants
export const MIN_CREDIT_TRANSFER = BigInt(100000) // 0.000001 DASH

// Export the base types from index for convenience
export type { IAsset, ITransaction, IBalanceChange, IUser2 }
