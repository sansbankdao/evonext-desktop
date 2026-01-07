// src/types/transactions.ts

import { GasFeesPaidByWASM } from 'pshenmic-dpp'

export { GasFeesPaidByWASM }

export type ITransferType = 'IDENTITY_CREATE' | 'IDENTITY_CREDIT_TRANSFER' | 'IDENTITY_TOP_UP' | 'UNKNOWN' | string
export type ITransferStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REJECTED' | string

export interface ITokenPaymentInfo {
    tokenContractId: string
    tokenContractPosition: number
    minimumTokenCost: bigint
    maximumTokenCost: bigint
    gasFeesPaidBy: GasFeesPaidByWASM
}

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
    message: string
    code?: number
    details?: any
}

export type TransactionResult = ITxSuccess | ITxError

// Base interface definition
export interface ITransactionBase {
    // Core transaction data
    hash: string
    blockHeight?: number
    confirmations: number
    // Sender/Receiver info
    senderId: string
    receiverId: string
    // Amount and asset
    amount: number | string
    amountFormatted?: string
    assetType: 'COIN' | 'TOKEN'
    assetId?: string
    assetSymbol: string
    // Fees
    fee?: number
    feeFormatted?: string
    // Transaction status
    status: ITransferStatus
    // Type of transaction
    type: ITransferType
    // Direction (relative to the user)
    direction: 'INCOMING' | 'OUTGOING' | 'SELF'
    // Metadata
    memo?: string
    attachments?: Record<string, any>[]
    // Network info
    network: 'mainnet' | 'testnet'
    // Platform-specific fields
    proof?: {
        rootTreeProof?: string
        signature?: string
        signaturePubKey?: string
    }
    // Optional data contract info
    dataContractId?: string
    documentId?: string
    // Display/UI fields
    explorerUrl?: string
    isRead?: boolean
    // Additional metadata for filtering/sorting
    tags?: string[]
    category?: 'payment' | 'exchange' | 'staking' | 'governance' | 'nft'
    timestamp?: number
    // UI Specific fields
    title?: string
    subtitle?: string
    date: number
    createdAt: number
}

// We define ITransaction by extending Base and adding ID.
// This ensures the 'id' property exists for the UI.
export interface ITransaction extends ITransactionBase {
    id: string // <--- FIX: Restore 'id' property
}
