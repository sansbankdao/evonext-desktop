// src/types/wallet.ts

export interface IdentityTransfer {
    recipient: string;
    amount: number;
    timestamp: number;
    type: 'credit' | 'debit';
}

export interface TokenTransition {
    token: string;
    amount: number;
    type: 'mint' | 'burn' | 'transfer';
    timestamp: number;
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
