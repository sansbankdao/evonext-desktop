// src/types/transactions.ts
import { GasFeesPaidByWASM } from 'pshenmic-dpp'

export { GasFeesPaidByWASM }

/* --- TYPES & ENUMS --- */

export type ITransferType =
    | 'IDENTITY_CREATE'
    | 'IDENTITY_CREDIT_TRANSFER'
    | 'IDENTITY_TOP_UP'
    | 'IDENTITY_TOKEN_TRANSFER'
    | 'DATA_CONTRACT_TRANSFER'
    | 'UNKNOWN'
    | string

export type ITransferStatus =
    | 'PENDING'
    | 'CONFIRMED'
    | 'FAILED'
    | 'REJECTED'
    | 'Completed' // String fallback for UI simplicity
    | 'Pending...'
    | string

/* --- RESULT & ERROR TYPES --- */

/**
 * Result structure returned by the Wallet Composable after a transaction attempt.
 */
export interface ITransactionResult {
    success: boolean
    data?: ITxSuccess
    error?: ITxError
}

export interface ITxSuccess {
    txid: string
    message?: string
}

export interface ITxError {
    code: number
    message: string
    step?: string
    suggestions?: string[]
}

export type TransactionResult = ITxSuccess | ITxError

/* --- UI DISPLAY TYPES --- */

export interface ITokenPaymentInfo {
    tokenContractId: string
    tokenContractPosition: number
    minimumTokenCost: bigint
    maximumTokenCost: bigint
    gasFeesPaidBy: GasFeesPaidByWASM
}

/**
 * Base interface defining the expected structure of an object
 * to be displayed in the Transaction History list.
 */
export interface ITransactionBase {
    // Core Transaction Data
    hash: string
    blockHeight?: number
    confirmations: number

    // Sender / Receiver Info
    senderId: string
    receiverId: string

    // Amount and Asset Identification
    amount: number | string
    amountFormatted?: string
    assetType: 'COIN' | 'TOKEN'
    assetId?: string
    assetSymbol: string // FIXED: This is required by the TSX map

    // Fees
    fee?: number
    feeFormatted?: string

    // Transaction Status
    status: ITransferStatus

    // Type of Transaction (Action)
    type: ITransferType

    // Direction (Relative to the user)
    direction: 'INCOMING' | 'OUTGOING' | 'SELF'

    // Metadata
    memo?: string
    attachments?: Record<string, any>[]

    // Network Info
    network: 'mainnet' | 'testnet'

    // Platform Specifics
    proof?: {
        rootTreeProof?: string
        signature?: string
        signaturePubKey?: string
    }
    dataContractId?: string
    documentId?: string

    // Display / UI Helper Fields
    explorerUrl?: string
    isRead?: boolean
    tags?: string[]
    category?: 'payment' | 'exchange' | 'staking' | 'governance' | 'nft'

    // Timestamps
    timestamp?: number
    date: number
    createdAt: number

    // Human Readable Titles
    title?: string
    subtitle?: string
}

/**
 * Main interface used by the Store and UI components.
 * Extends the Base to include a unique ID (usually the hash).
 */
export interface ITransaction extends ITransactionBase {
    id: string // FIX: Ensures 'id' is explicitly defined
}

/* --- LEGACY TYPES (kept for reference if needed) --- */

export interface IdentityTransfer {
    recipient: string;
    sender?: string | null;
    amount: number | string;
    type: ITransferType;
    txHash?: string;
    blockHash?: string;
    gasUsed?: number;
    createdAt: number;
}
// export interface IdentityTransfer {
//     recipient: string;
//     sender?: string | null;
//     amount: number | string; // BigInt as string
//     type: ITransferType;
//     txHash?: string;
//     blockHash?: string;
//     gasUsed?: number;
//     createdAt: number;
// }

// export interface TokenTransition {
//     identityId?: string;
//     addressId?: string;
//     recipientId?: string;
//     token: string;
//     amount: number;
//     type: 'TOKEN_MINT' | 'token_burn' | 'IDENTITY_TOKEN_TRANSFER';
//     txHash?: string;
//     createdAt: number;
// }

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

export interface ApiResponse<T = any> {
    data?: T;
    result?: T[];
    resultSet?: T[];
    error?: string;
    success: boolean;
}
