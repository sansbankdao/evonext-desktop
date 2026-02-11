// src/composables/useTransactions.ts

import { computed, ref } from 'vue'
import { PrivateKeyWASM } from 'pshenmic-dpp'
import { usePlatform } from './usePlatform'
import { EvoSDK } from '@dashevo/evo-sdk'
import { useKeyManagement } from './useKeyManagement'
import { useNetwork } from './useNetwork'
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
            const sdk = await platform.getSDK(network.value)
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
            const identity = await sdk.identities.getIdentityByIdentifier(params.identityId)
            logs.push('[Transactions] Fetching Identity Nonce...')
            const currentNonce = await sdk.identities.getIdentityNonce(params.identityId)
            const identityNonce = currentNonce + BigInt(1)
            logs.push(`[Transactions] Current Nonce: ${currentNonce}. Using: ${identityNonce}`)
            logs.push('[Transactions] Creating Credit Transfer ST...')
            const payload = {
                identityId: params.identityId,
                amount: params.credits,
                recipientId: params.receiver,
                identityNonce: identityNonce
            }
            const stateTransition = sdk.identities.createStateTransition('creditTransfer', payload)
            logs.push('[Transactions] Signing transaction...')
            const privKey = PrivateKeyWASM.fromWIF(signingKey.privateKey)
            const identityPublicKeys = identity.getPublicKeys()
            let pubKey: any | undefined
            for (const key of identityPublicKeys) {
                const currentKeyId = (key as any).keyIdNumber ?? (key as any).keyId
                if (currentKeyId === signingKey!.keyId) {
                    pubKey = key
                    break
                }
            }
            if (!pubKey) {
                logs.push(`[Transactions] Error: Public Key ID ${signingKey.keyId} not found in Identity.`)
                return {
                    success: false,
                    error: { code: 500, message: `Public Key ID ${signingKey.keyId} missing` } as ITxError,
                    debugLog: logs
                }
            }
            stateTransition.signaturePublicKeyId = signingKey.keyId
            stateTransition.sign(privKey, pubKey)
            logs.push('[Transactions] Broadcasting...')
            await sdk.stateTransitions.broadcast(stateTransition)
            logs.push('[Transactions] Waiting for confirmation...')
            await sdk.stateTransitions.waitForStateTransitionResult(stateTransition)
            const hash = stateTransition.hash(false)
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
            const sdk = await platform.getSDK(network.value)
            let signingKey: { privateKey: string, keyId: number } | undefined;
            if (params.privateKey) {
                signingKey = { privateKey: params.privateKey, keyId: 3 };
            } else {
                const keyResult = await keys.getTransferKey(params.identityId)
                if (keyResult) signingKey = keyResult;
            }
            if (!signingKey) throw new Error('No transfer key found')
            const tokenBaseTransition = await sdk.tokens.createBaseTransition(params.tokenId, params.identityId)
            const stateTransition = sdk.tokens.createStateTransition(
                tokenBaseTransition,
                params.identityId,
                'transfer',
                {
                    identityId: params.receiver,
                    amount: params.atomicUnits,
                },
            )
            const privKey = PrivateKeyWASM.fromWIF(signingKey.privateKey)
            const identity = await sdk.identities.getIdentityByIdentifier(params.identityId)
            const identityPublicKeys = identity.getPublicKeys()
            let pubKey: any | undefined
            for (const key of identityPublicKeys) {
                const currentKeyId = (key as any).keyIdNumber ?? (key as any).keyId
                if (currentKeyId === signingKey!.keyId) {
                    pubKey = key
                    break
                }
            }
            if (!pubKey) throw new Error(`Public Key ID ${signingKey!.keyId} missing`)
            stateTransition.sign(privKey, pubKey)
            logs.push('[Token] Broadcasting...')
            await sdk.stateTransitions.broadcast(stateTransition)
            const stateTransitionHash = stateTransition.hash(false)
            return {
                success: true,
                data: { txid: stateTransitionHash, message: 'Broadcast OK' } as ITxSuccess,
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
            const sdk = network.value === 'mainnet' ? EvoSDK.mainnetTrusted() : EvoSDK.testnetTrusted()
            await sdk.connect()
            const creditAmount = BigInt(Math.floor(params.amountDash * 100_000_000_000))
            const result = await sdk.identities.creditWithdrawal({
                identityId: params.identityId,
                toAddress: params.recipientAddress,
                amount: creditAmount,
                coreFeePerByte: 1.2,
                privateKeyWif: keyPair.privateKey,
                keyId: keyPair.keyId
            })
            const txHash = typeof result === 'string' ? result : (result as any).hash
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
