// src/types/transactions.ts

import { GasFeesPaidByWASM } from 'pshenmic-dpp'

// Re-export it so the rest of your app can use it via '@/types'
export { GasFeesPaidByWASM }

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
