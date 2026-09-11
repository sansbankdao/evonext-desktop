// src/composables/useTransactions.ts

import { computed, ref } from 'vue'
import { usePlatform } from './usePlatform'
import {
    IdentityCreditTransfer,
    IdentityCreditWithdrawalTransition,
    TokenBaseTransition,
    TokenTransferTransition,
    TokenTransition as EvoTokenTransition,
} from '@dashevo/evo-sdk'
import {
    batchStateTransition,
    connectEvoSdk,
    coreScriptFromAddress,
    nextIdentityContractNonce,
    nextIdentityNonce,
    resolveSigningContext,
    signBroadcastAndHash,
} from '@/services/platform'
import { useKeyManagement } from './useKeyManagement'
import { useNetwork } from './useNetwork'
import { useTransactionHistory } from './useTransactionHistory'
import { ErrorBoundary, type ActionResponse } from '@/utils/errors'
import { log } from '@/utils/env'
import { MIN_CREDIT_TRANSFER } from '@/constants'
import type {
    ITransaction,
    TokenTransition
} from '@/types'

// FIXED: Made privateKey explicitly optional to prevent 'exactOptionalPropertyTypes' errors
interface SendCreditParams {
    identityId: string
    identityIdx: number
    receiver: string
    credits: bigint
    privateKey?: string | undefined // Added | undefined
}

interface SendTokenParams {
    identityId: string
    identityIdx: number
    tokenId: string
    receiver: string
    atomicUnits: bigint
    privateKey?: string | undefined // Added | undefined
}
interface TransactionResult {
    success: boolean
    data?: ITxSuccess
    error?: ITxError
    debugLog?: string[]
}
interface ITxSuccess {
    txid: string
    message?: string
}
interface ITxError {
    code: number
    message: string
    step?: string
    suggestions?: string[]
}
interface WithdrawDashParams {
    identityId: string
    recipientAddress: string
    amountDash: number // The UI passes normalized Dash (e.g., 0.5)
}
const EXPLORER_API_URL = 'https://platform-explorer.pshenmic.dev'
export function useTransactions() {
    const platform = usePlatform()
    const keys = useKeyManagement()
    const { network } = useNetwork()
    const history = useTransactionHistory()

    // Persist our OWN outgoing transfers as pending records the moment they
    // broadcast, so they appear in history instantly; the next Explorer
    // sync upgrades them to confirmed in place (upsert on txid+network).
    // Fire-and-forget: cache writes must never fail a transaction result.
    const recordOwnSend = (
        txid: string,
        amount: bigint,
        counterparty: string
    ): void => {
        history
            .upsertTransaction({
                txid,
                network: network.value,
                direction: 'send',
                amount: -Number(amount),
                fee: null,
                timestamp: Math.floor(Date.now() / 1000),
                blockHeight: null,
                counterparty,
                status: 'pending',
                rawJson: null,
            })
            .catch((e: unknown) =>
                console.warn('[Transactions] history cache upsert failed:', e)
            )
    }
    const loading = ref(false)
    const error = ref<string | null>(null)
    const transactions = ref<ITransaction[]>([])
    const tokenTransitions = ref<TokenTransition[]>([])
    // =========================================================================
    // 1. Formatting Helpers
    // =========================================================================
    const atomicToDash = (atomic: bigint | number): number => {
        const val = typeof atomic === 'bigint' ? Number(atomic) : atomic
        return val / 100000000
    }
    const formatDashAmount = (atomic: bigint | number, decimals: number = 8): string => {
        const dash = atomicToDash(atomic)
        return dash.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: decimals
        })
    }
    const formatDate = (timestamp: number): string => {
        return new Date(timestamp).toLocaleString()
    }
    const shortTxid = (txid: string, length: number = 16): string => {
        if (!txid) return ''
        return txid.slice(0, length / 2) + '...' + txid.slice(-length / 2)
    }
    // =========================================================================
    // 2. Decoding Helper for Base64 Data Payload
    // =========================================================================
    const decodeBase64Amount = (tx: any): bigint => {
        if (!tx.data || typeof tx.data !== 'string') return BigInt(0)
        try {
            const binString = atob(tx.data)
            const bytes = new Uint8Array(binString.length)
            for (let i = 0; i < binString.length; i++) {
                bytes[i] = binString.charCodeAt(i)
            }
            if (bytes.length < 24) return BigInt(0)
            const view = new DataView(bytes.buffer)
            const amountValue = view.getBigUint64(16, false)
            return amountValue
        } catch (e) {
            console.error('Failed to decode amount from tx.data', e)
            return BigInt(0)
        }
    }
    // =========================================================================
    // 3. Fetching Logic
    // =========================================================================
    const fetchIdentityTransfers = async (
        identityId: string,
        limit: number = 50,
        assetFilter?: string
    ): Promise<ActionResponse<ITransaction[]>> => {
        return ErrorBoundary.wrap(async () => {
            loading.value = true
            error.value = null
            await platform.getSDK(network.value)
            log('info', `Fetching transfers for ${identityId}`, { limit, assetFilter })
            try {
                const response = await fetch(`${EXPLORER_API_URL}/identity/${identityId}/transactions?page=1&limit=${limit}&order=desc`)
                if (!response.ok) throw new Error(`Explorer API error: ${response.statusText}`)
                const data = await response.json()
                const resultSet = data.resultSet || []
                const mapped = resultSet.map((t: any): ITransaction => {
                    const isSender = t.sender === identityId
                    const symbol = t.token?.symbol || t.symbol || 'CREDITS'
                    const isToken = t.type === 'BATCH' || t.batchType === 'TOKEN_TRANSFER'
                    let rawAmount = Number(t.amount || t.value || 0)
                    if (rawAmount === 0) {
                        const decoded = decodeBase64Amount(t)
                        rawAmount = Number(decoded)
                    }
                    let title = 'Transaction'
                    if (t.type === 'IDENTITY_CREDIT_TRANSFER') {
                        title = isSender ? 'Sent Credits' : 'Received Credits'
                    } else if (isToken) {
                        title = isSender ? `Sent ${symbol}` : `Received ${symbol}`
                    }
                    return {
                        id: t.hash || t.txHash,
                        hash: t.hash || t.txHash,
                        title,
                        subtitle: new Date(t.timestamp).toLocaleString(),
                        amount: rawAmount,
                        assetSymbol: symbol,
                        direction: isSender ? 'OUTGOING' : 'INCOMING',
                        status: t.status === 'SUCCESS' ? 'Completed' : 'Failed',
                        type: t.type,
                        date: new Date(t.timestamp).getTime(),
                        createdAt: new Date(t.timestamp).getTime(),
                        senderId: t.sender || '',
                        receiverId: t.recipient || '',
                        assetType: symbol === 'CREDITS' ? 'COIN' : 'TOKEN',
                        confirmations: t.status === 'SUCCESS' ? 1 : 0,
                        network: network.value as any
                    }
                })
                if (assetFilter) {
                    const filtered = mapped.filter((t: ITransaction) =>
                        t.assetSymbol?.toUpperCase() === assetFilter.toUpperCase()
                    )
                    transactions.value = filtered
                    return filtered
                } else {
                    transactions.value = mapped
                    return mapped
                }
            } catch (err: any) {
                console.error('Failed to fetch from explorer:', err)
                throw err
            } finally {
                loading.value = false
            }
        }, 'FETCH_IDENTITY_TRANSFERS_FAILED')
    }
    const fetchTokenTransitions = async (
        tokenId: string,
        identityId?: string,
        limit: number = 50
    ): Promise<ActionResponse<TokenTransition[]>> => {
        return ErrorBoundary.wrap(async () => {
            loading.value = true
            error.value = null
            await platform.getSDK(network.value)
            log('info', `Fetching token transitions for ${tokenId}`, { identityId, limit })
            if (!identityId) {
                tokenTransitions.value = []
                return []
            }
            try {
                const response = await fetch(`${EXPLORER_API_URL}/identity/${identityId}/transactions?page=1&limit=${limit}&order=desc`)
                if (!response.ok) throw new Error(`Explorer API error: ${response.statusText}`)
                const data = await response.json()
                const resultSet = data.resultSet || []
                const mapped = resultSet
                    .filter((t: any) => t.type === 'BATCH' && t.batchType === 'TOKEN_TRANSFER')
                    .map((tt: any) => {
                        const decoded = decodeBase64Amount(tt)
                        return {
                            tokenId: tokenId,
                            type: 'transfer',
                            amount: Number(decoded),
                            recipient: tt.recipient || 'Unknown',
                            sender: identityId,
                            timestamp: new Date(tt.timestamp).getTime(),
                            txid: tt.hash
                        }
                    })
                tokenTransitions.value = mapped
                log('debug', `Found ${mapped.length} transitions`)
                return mapped
            } catch (err: any) {
                console.error('Failed to fetch token transitions:', err)
                throw err
            } finally {
                loading.value = false
            }
        }, 'FETCH_TOKEN_TRANSITIONS_FAILED')
    }
    // =========================================================================
    // 4. Sending Logic (Credit Transfer)
    // =========================================================================
    const sendCredits = async (params: SendCreditParams): Promise<TransactionResult> => {
        const logs: string[] = []
        try {
            logs.push('[Transactions] Starting sendCredits process...')
            if (params.credits < MIN_CREDIT_TRANSFER) {
                logs.push(`[Transactions] Validation Failed: Amount (${params.credits}) below minimum`)
                return {
                    success: false,
                    error: {
                        code: 400,
                        message: `Minimum credit transfer amount is ${MIN_CREDIT_TRANSFER.toLocaleString()} credits`,
                        suggestions: ['Increase transfer amount to meet minimum requirements']
                    } as ITxError,
                    debugLog: logs
                }
            }
            const sdk = await connectEvoSdk(network.value)
            logs.push('[Transactions] SDK Instance created')
            let signingKey: { privateKey: string, keyId: number } | undefined;
            if (params.privateKey) {
                signingKey = { privateKey: params.privateKey, keyId: 3 };
            } else {
                logs.push(`[Transactions] Attempting to resolve Transfer Key for ID: ${params.identityId}`)
                const keyResult = await keys.getTransferKey(params.identityId)
                if (keyResult) signingKey = keyResult;
            }
            if (!signingKey) {
                logs.push('[Transactions] Error: No transfer key found')
                return {
                    success: false,
                    error: { code: 401, message: 'No transfer key found' } as ITxError,
                    debugLog: logs
                }
            }
            logs.push(`[Transactions] Fetching Identity details for ${params.identityId}...`)
            const { identityKey } = await resolveSigningContext(sdk, params.identityId, signingKey.keyId)
            logs.push('[Transactions] Fetching Identity Nonce...')
            const identityNonce = await nextIdentityNonce(sdk, params.identityId)
            logs.push(`[Transactions] Using Nonce: ${identityNonce}`)
            logs.push('[Transactions] Creating Credit Transfer ST...')
            // Raw transition path (v4 facades never return the transition
            // hash — build/sign/broadcast ourselves to surface the REAL hash).
            // NOTE: sdk.d.ts declares IdentityCreditTransferOptions twice
            // (facade options + transition options) and TS merges them,
            // forcing identity/signer which the transition constructor does
            // not accept. The transition shape below is the verified one.
            const creditTransfer = new IdentityCreditTransfer({
                amount: params.credits,
                senderId: params.identityId,
                recipientId: params.receiver,
                nonce: identityNonce,
            } as any)
            const stateTransition = creditTransfer.toStateTransition()
            logs.push('[Transactions] Signing + broadcasting...')
            const hash = await signBroadcastAndHash(sdk, stateTransition, signingKey.privateKey, identityKey)
            logs.push(`[Transactions] Confirmed. Hash: ${hash}`)
            recordOwnSend(hash, params.credits, params.receiver)
            return {
                success: true,
                data: { txid: hash, message: 'Transaction successful' } as ITxSuccess,
                debugLog: logs
            }
        } catch (err: any) {
            logs.push(`[Transactions] FAILED: ${err.message}`)
            return {
                success: false,
                error: { code: 500, message: err.message, step: 'EXECUTION' } as ITxError,
                debugLog: logs
            }
        }
    }
    // =========================================================================
    // 5. Sending Logic (Token Transfer)
    // =========================================================================
    const sendToken = async (params: SendTokenParams): Promise<TransactionResult> => {
        const logs: string[] = ['Starting Token Transfer...']
        loading.value = true
        try {
            const sdk = await connectEvoSdk(network.value)
            let signingKey: { privateKey: string, keyId: number } | undefined;
            if (params.privateKey) {
                signingKey = { privateKey: params.privateKey, keyId: 3 };
            } else {
                const keyResult = await keys.getTransferKey(params.identityId)
                if (keyResult) signingKey = keyResult;
            }
            if (!signingKey) throw new Error('No transfer key found')
            // v4: tokens.transfer needs the token's contract id + position,
            // resolved from the token id via the facade.
            const tokenInfo = await sdk.tokens.contractInfo(params.tokenId)
            if (!tokenInfo) throw new Error(`Token contract info not found for ${params.tokenId}`)
            const { identityKey } = await resolveSigningContext(sdk, params.identityId, signingKey.keyId)
            const identityContractNonce = await nextIdentityContractNonce(sdk, params.identityId, tokenInfo.contractId.toBase58())
            // Raw transition path (v4 facades never return the transition
            // hash — build/sign/broadcast ourselves to surface the REAL hash).
            const base = new TokenBaseTransition({
                dataContractId: tokenInfo.contractId,
                identityContractNonce,
                tokenContractPosition: tokenInfo.tokenContractPosition,
                tokenId: params.tokenId,
            })
            const transferTransition = new TokenTransferTransition({
                base,
                recipientId: params.receiver,
                amount: params.atomicUnits,
            })
            const stateTransition = batchStateTransition([new EvoTokenTransition(transferTransition)], params.identityId)
            logs.push('[Token] Signing + broadcasting...')
            const hash = await signBroadcastAndHash(sdk, stateTransition, signingKey.privateKey, identityKey)
            recordOwnSend(hash, params.atomicUnits, params.receiver)
            return {
                success: true,
                data: { txid: hash, message: 'Broadcast OK' } as ITxSuccess,
                debugLog: logs
            }
        } catch (err: any) {
            return {
                success: false,
                error: { code: 500, message: err.message, step: 'TOKEN_TRANSFER' } as ITxError,
                debugLog: logs
            }
        } finally {
            loading.value = false
        }
    }
    // =========================================================================
    // 6. Wrappers
    // =========================================================================
    const sendCredit = async (
        identityId: string,
        identityIdx: number,
        receiver: string,
        credits: bigint,
        privateKey?: string
    ): Promise<TransactionResult> => {
        return await sendCredits({ identityId, identityIdx, receiver, credits, privateKey })
    }
    const sendTokenTransfer = async (
        identityId: string,
        identityIdx: number,
        tokenId: string,
        receiver: string,
        atomicUnits: bigint,
        privateKey?: string
    ): Promise<TransactionResult> => {
        return await sendToken({ identityId, identityIdx, tokenId, receiver, atomicUnits, privateKey })
    }
    const withdrawDash = async (params: WithdrawDashParams): Promise<TransactionResult> => {
        const logs: string[] = ['[Withdrawal] Starting Withdrawal...']
        loading.value = true
        try {
            const keyPair = await keys.getTransferKey(params.identityId)
            if (!keyPair?.privateKey) throw new Error('Transfer key not found.')
            const sdk = await connectEvoSdk(network.value)
            const { identityKey } = await resolveSigningContext(sdk, params.identityId, keyPair.keyId)
            const creditAmount = BigInt(Math.floor(params.amountDash * 100_000_000_000))
            const identityNonce = await nextIdentityNonce(sdk, params.identityId)
            // Raw transition path (v4 facades never return the transition
            // hash — build/sign/broadcast ourselves to surface the REAL hash).
            const withdrawalTransition = new IdentityCreditWithdrawalTransition({
                identityId: params.identityId,
                amount: creditAmount,
                coreFeePerByte: 1.2,
                pooling: 'never',
                outputScript: coreScriptFromAddress(params.recipientAddress),
                nonce: identityNonce,
            })
            const stateTransition = withdrawalTransition.toStateTransition()
            const txHash = await signBroadcastAndHash(sdk, stateTransition, keyPair.privateKey, identityKey)
            if (txHash) recordOwnSend(txHash, creditAmount, params.recipientAddress)
            return {
                success: true,
                data: { txid: txHash || 'TRANSFERRED', message: 'Withdrawal successful' },
                debugLog: logs
            }
        } catch (err: any) {
            return {
                success: false,
                error: { code: 500, message: err.message, step: 'WITHDRAWAL' },
                debugLog: logs
            }
        } finally {
            loading.value = false
        }
    }
    return {
        loading: computed(() => loading.value),
        error: computed(() => error.value),
        transactions: computed(() => transactions.value),
        tokenTransitions: computed(() => tokenTransitions.value),
        fetchIdentityTransfers,
        fetchTokenTransitions,
        atomicToDash,
        formatDashAmount,
        formatDate,
        shortTxid,
        sendCredits,
        sendToken,
        sendCredit,
        sendTokenTransfer,
        withdrawDash,
    }
}
