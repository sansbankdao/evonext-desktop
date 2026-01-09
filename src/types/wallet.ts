// src/types/wallet.ts

import type { ITransferType } from './transactions'

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

export interface ApiResponse {
    data?: any;
    error?: string;
    success: boolean;
}

export interface TokenBalance {
    tokenId: string
    symbol: string
    amount?: number | string;
    balance?: number | string
    decimals: number
    name?: string
}

export interface BalanceResult {
    credits: number | string
    tokens: TokenBalance[]
}

// --- UPDATE IAsset DEFINITION ---

export interface IAsset {
    // FIXED: This field must match the 'id' field in Rust struct
    id?: string;

    name: string;
    symbol: string;

    // Rust uses snake_case, keep camelCase here for TS consistency
    asset_id: string;

    precision: number;
    verified: boolean;

    // Optional fields not strictly defined in the minimal struct above but present in full model
    blocked?: boolean;
    transferable?: boolean;
    divisible?: boolean;

    // Optional fields mapped from discovery/API
    ownerIdentityId?: string;
    isOwned?: boolean;
    contractId?: string; // Derived/Normalized ID

    // Calculated fields for UI
    balance?: string | number;
    balanceFormatted?: string;
    usdValue?: number;
    network?: string;
    category?: 'currency' | 'utility' | 'governance';
    type?: 'native' | 'token';
}
