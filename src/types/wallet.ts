// src/types/wallet.ts

export type ITransferType = 'IDENTITY_CREATE' | 'IDENTITY_CREDIT_TRANSFER' | 'UNKNOWN';
export type ITransferStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REJECTED';

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
    token: string;
    amount: number;
    type: 'token_mint' | 'token_burn' | 'IDENTITY_TOKEN_TRANSFER';
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

export interface ITransaction {
    // Core transaction data
    id: string;
    hash: string;
    blockHeight?: number;
    confirmations: number;

    // Sender/Receiver info
    senderId: string;
    receiverId: string;

    // Amount and asset
    amount: number | string; // NOTE: Use string for BigInts.
    amountFormatted?: string;
    assetType: 'COIN' | 'TOKEN';
    assetId?: string; // For tokens
    assetSymbol: string; // e.g., 'DASH', 'USD', 'USDC'

    // Fees
    fee?: number;
    feeFormatted?: string;

    // Transaction status
    status: ITransferStatus;

    // Type of transaction
    type: ITransferType;
    // type: 'transfer' | 'deposit' | 'withdrawal' | 'swap' | 'claim' | 'mint' | 'burn';

    // Direction (relative to the user)
    direction: 'INCOMING' | 'OUTGOING' | 'SELF';

    // Metadata
    memo?: string;
    attachments?: Record<string, any>[];

    // Network info
    network: 'mainnet' | 'testnet';

    // Platform-specific fields (for Dash/L1)
    proof?: {
        rootTreeProof?: string;
        signature?: string;
        signaturePubKey?: string;
    };

    // Optional data contract info (for DApps)
    dataContractId?: string;
    documentId?: string;

    // Display/UI fields
    explorerUrl?: string;
    isRead?: boolean;

    // Additional metadata for filtering/sorting
    tags?: string[];
    category?: 'payment' | 'exchange' | 'staking' | 'governance' | 'nft';
    timestamp?: number;
    createdAt: number;
}

// You might also want these related types:
export interface TransactionGroup {
    date: string; // YYYY-MM-DD format
    transactions: ITransaction[];
}

export interface TransactionFilters {
    assetType?: 'COIN' | 'TOKEN' | 'ALL';
    direction?: 'incoming' | 'outgoing' | 'all';
    status?: 'pending' | 'confirmed' | 'all';
    type?: string;
    dateFrom?: Date;
    dateTo?: Date;
    minAmount?: number;
    maxAmount?: number;
}

export interface TransactionStats {
    totalTransactions: number;
    totalVolume: number;
    pendingCount: number;
    todayCount: number;
    byAsset: Record<string, { count: number; volume: number }>;
    byType: Record<string, number>;
}

// If you need DPP (Dash Platform Protocol) specific transaction types:
export interface DPPTransaction extends ITransaction {
    identityId: string;
    revision?: number;
    contractId?: string;
    documentType?: string;
}

// For UTXO/L1 transactions
export interface L1Transaction extends ITransaction {
    inputs?: TransactionInput[];
    outputs?: TransactionOutput[];
    locktime?: number;
    version?: number;
}

interface TransactionInput {
    address: string;
    amount: number;
    prevTxId: string;
    outputIndex: number;
}

interface TransactionOutput {
    address: string;
    script: string;
    amount: number;
    satoshis: number;
}
