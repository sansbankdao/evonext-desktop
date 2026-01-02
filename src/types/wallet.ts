// src/types/wallet.ts

export type ITransferType = 'IDENTITY_CREATE' | 'IDENTITY_CREDIT_TRANSFER' | 'UNKNOWN' | string; // <--- Loosen type to allow string comparison

export interface IdentityTransfer {
    recipient: string;
    sender?: string | null;
    amount: number | string; // BigInt as string
    type: ITransferType;
    txHash?: string;
    blockHash?: string;
    gasUsed?: number;
    createdAt: number;
}

export interface TokenTransition {
    identityId?: string;
    addressId?: string;
    recipientId?: string;
    token: string;
    amount: number;
    type: 'TOKEN_MINT' | 'token_burn' | 'IDENTITY_TOKEN_TRANSFER';
    txHash?: string;
    createdAt: number;
}

export interface ApiResponse<T> {
    data?: T;
    error?: string;
    success: boolean;
}

export interface TokenBalance {
    tokenId: string;
    amount: number;
}

// If BalanceResult and TokenBalance are also needed from imports
export interface BalanceResult {
    credits: bigint
    tokens: TokenBalance[]
}
export interface TokenBalance {
    tokenId: string
    symbol: string
    balance: bigint
    decimals: number
    name?: string
}
