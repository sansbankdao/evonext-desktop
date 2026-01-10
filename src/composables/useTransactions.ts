// src/composables/useTransactions.ts
import { computed, ref } from 'vue'
import { PrivateKeyWASM } from 'pshenmic-dpp'
import { usePlatform } from './usePlatform'
import { useKeyManagement } from './useKeyManagement'
import { ErrorBoundary } from '@/utils/errors'
import { log } from '@/utils/env'
import { MIN_CREDIT_TRANSFER } from '@/constants'
import type {
    ITransaction,
    TokenTransition
} from '@/types'
// Local type definitions for missing exports
interface SendCreditParams {
    identityId: string
    identityIdx: number
    receiver: string
    credits: bigint
    privateKey?: string
}
interface SendTokenParams {
    identityId: string
    identityIdx: number
    tokenId: string
    receiver: string
    atomicUnits: bigint
    privateKey?: string
}
interface TransactionResult {
    success: boolean
    data?: ITxSuccess
    error?: ITxError
    debugLog?: string[] // <-- Added Debug Logs
}
interface ITxSuccess {
    txid: string
    message?: string
}
interface ITxError {
    code: number
    message: string
    step?: string // <-- Added Step Context (FIXED MISSING PROPERTY)
    suggestions?: string[]
}
const EXPLORER_API_URL = 'https://platform-explorer.pshenmic.dev'
export function useTransactions() {
    const platform = usePlatform()
    const keys = useKeyManagement()
    const loading = ref(false)
    const error = ref<string | null>(null)
    const transactions = ref<ITransaction[]>([])
    const tokenTransitions = ref<TokenTransition[]>([])
    /**
     * Formatting utils
     */
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
    /**
     * Transaction fetching
     */
    const fetchIdentityTransfers = async (
        identityId: string,
        limit: number = 50
    ): Promise<ITransaction[]> => {
        return ErrorBoundary.wrap(async () => {
            loading.value = true
            error.value = null
            await platform.getSDK()
            log('info', `Fetching transfers for ${identityId}`, { limit })
            try {
                const response = await fetch(`${EXPLORER_API_URL}/identity/${identityId}/transactions?page=1&limit=${limit}&order=desc`)
                if (!response.ok) throw new Error(`Explorer API error: ${response.statusText}`)
                const data = await response.json()
                const resultSet = data.resultSet || []
                transactions.value = resultSet
                    .filter((t: any) => t.type === 'IDENTITY_CREDIT_TRANSFER')
                    .map((t: any) => ({
                        type: 'credit',
                        amount: BigInt(0), // Placeholder
                        recipient: 'Unknown',
                        timestamp: new Date(t.timestamp).getTime(),
                        confirmations: t.status === 'SUCCESS' ? 1 : 0,
                        txid: t.hash
                    }))
            } catch (err: any) {
                console.error('Failed to fetch from explorer:', err)
                throw err
            }
            log('debug', `Found ${transactions.value.length} transfers`)
            return transactions.value
        }, 'FETCH_IDENTITY_TRANSFERS_FAILED')
    }
    const fetchTokenTransitions = async (
        tokenId: string,
        identityId?: string,
        limit: number = 50
    ): Promise<TokenTransition[]> => {
        return ErrorBoundary.wrap(async () => {
            loading.value = true
            error.value = null
            await platform.getSDK()
            log('info', `Fetching token transitions for ${tokenId}`, { identityId, limit })
            if (!identityId) {
                console.warn('fetchTokenTransitions: identityId required for Explorer API lookup')
                tokenTransitions.value = []
                return []
            }
            try {
                const response = await fetch(`${EXPLORER_API_URL}/identity/${identityId}/transactions?page=1&limit=${limit}&order=desc`)
                if (!response.ok) throw new Error(`Explorer API error: ${response.statusText}`)
                const data = await response.json()
                const resultSet = data.resultSet || []
                tokenTransitions.value = resultSet
                    .filter((t: any) => t.type === 'BATCH' && t.batchType === 'TOKEN_TRANSFER')
                    .map((tt: any) => ({
                        tokenId: tokenId,
                        type: 'transfer',
                        amount: BigInt(0),
                        recipient: 'Unknown',
                        sender: identityId,
                        timestamp: new Date(tt.timestamp).getTime(),
                        txid: tt.hash
                    }))
            } catch (err: any) {
                console.error('Failed to fetch token transitions:', err)
                throw err
            }
            log('debug', `Found ${tokenTransitions.value.length} transitions`)
            return tokenTransitions.value
        }, 'FETCH_TOKEN_TRANSITIONS_FAILED')
    }
    /**
     * Send operations
     */
    const sendCredits = async (params: SendCreditParams): Promise<TransactionResult> => {
        const logs: string[] = []
        try {
            logs.push('[Transactions] Starting sendCredits process...')
            // Validation
            if (params.credits < MIN_CREDIT_TRANSFER) {
                logs.push(`[Transactions] Validation Failed: Amount (${params.credits}) below minimum (${MIN_CREDIT_TRANSFER})`)
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
            logs.push('[Transactions] Validating transfer amount... OK')
            // 1. Get SDK
            const sdk = await platform.getSDK()
            logs.push('[Transactions] SDK Instance created')
            // 2. Retrieve Key
            let transferWif = params.privateKey
            if (!transferWif) {
                const keyResult = await keys.getTransferKey(params.identityIdx)
                transferWif = keyResult !== null ? keyResult : undefined
            }
            if (!transferWif) {
                logs.push('[Transactions] Error: No transfer key found (None passed, and retrieval failed)')
                return {
                    success: false,
                    error: {
                        code: 401,
                        message: 'No transfer key found',
                        suggestions: ['Ensure you are logged in or provide a key']
                    } as ITxError,
                    debugLog: logs
                }
            }
            logs.push('[Transactions] Private Key retrieved and ready')
            // 3. Get Identity & Public Keys
            logs.push(`[Transactions] Fetching Identity details for ${params.identityId}...`)
            const identity = await sdk.identities.getIdentityByIdentifier(params.identityId)
            logs.push('[Transactions] Identity details retrieved successfully')
            // 4. Get Identity Nonce
            let identityNonce
            try {
                logs.push('[Transactions] Fetching Identity Nonce...')
                const currentNonce = await sdk.identities.getIdentityNonce(params.identityId)
                identityNonce = currentNonce + BigInt(1)
                logs.push(`[Transactions] Current Nonce: ${currentNonce}. Using: ${identityNonce}`)
            } catch (err: any) {
                logs.push(`[Transactions] CRITICAL: Failed to get Nonce. Error: ${err.message}`)
                return {
                    success: false,
                    error: {
                        code: 500,
                        message: `Failed to get identity nonce: ${err.message}`,
                        step: 'GET_NONCE',
                        suggestions: ['Check Network Connection']
                    } as ITxError,
                    debugLog: logs
                }
            }
            // 5. Create, Sign & Broadcast State Transition
            try {
                logs.push('[Transactions] Creating Credit Transfer State Transition...')
                const payload = {
                    identityId: params.identityId,
                    amount: params.credits,
                    recipientId: params.receiver,
                    identityNonce: identityNonce
                }
                const stateTransition = sdk.identities.createStateTransition('creditTransfer', payload)
                logs.push('[Transactions] State Transition created')
                // 6. Sign Transaction
                logs.push('[Transactions] Signing transaction...')
                const privKey = PrivateKeyWASM.fromWIF(transferWif)
                const identityPublicKeys = identity.getPublicKeys()
                let pubKey = identityPublicKeys.find(key => {
                    const purpose = typeof key.purpose === 'string' ? parseInt(key.purpose) : key.purpose
                    return purpose === 1 || purpose === 3
                })
                if (!pubKey && identityPublicKeys.length > 3) {
                    pubKey = identityPublicKeys[3]
                }
                if (!pubKey) {
                    logs.push('[Transactions] Error: No transfer public key found in identity')
                    return {
                        success: false,
                        error: {
                            code: 500,
                            message: 'No transfer public key found in identity',
                            step: 'SIGNING',
                            suggestions: ['Ensure identity has a transfer key registered']
                        } as ITxError,
                        debugLog: logs
                    }
                }
                stateTransition.sign(privKey, pubKey)
                logs.push('[Transactions] Transaction signed successfully')
                // 7a. Broadcast (separate try for pinpoint)
                logs.push('[Transactions] Broadcasting transaction...')
                try {
                    await sdk.stateTransitions.broadcast(stateTransition)
                    logs.push('[Transactions] Broadcast accepted')
                } catch (broadcastErr: any) {
                    const bMsg = broadcastErr?.message ?? 'Broadcast failed (WASM error?)'
                    logs.push(`[Transactions] BROADCAST FAILED: ${bMsg}`)
                    logs.push(`[Transactions] Broadcast Error: ${JSON.stringify(broadcastErr ?? {}, null, 2)}`)
                    return {
                        success: false,
                        error: {
                            code: 500,
                            message: `Broadcast failed: ${bMsg}`,
                            step: 'BROADCAST',
                            suggestions: ['Check DASH balance for fees', 'Verify network']
                        } as ITxError,
                        debugLog: logs
                    }
                }
                // 7b. Wait Confirmation (separate try)
                logs.push('[Transactions] Waiting for confirmation...')
                try {
                    await sdk.stateTransitions.waitForStateTransitionResult(stateTransition)
                    logs.push('[Transactions] Transaction confirmed on chain')
                } catch (waitErr: any) {
                    const wMsg = waitErr?.message ?? 'Confirmation timeout/rejected'
                    logs.push(`[Transactions] CONFIRM WAIT FAILED: ${wMsg}`)
                    logs.push(`[Transactions] Wait Error: ${JSON.stringify(waitErr ?? {}, null, 2)}`)
                    return {
                        success: false,
                        error: {
                            code: 500,
                            message: `Confirmation failed: ${wMsg}`,
                            step: 'WAIT_CONFIRMATION',
                            suggestions: ['Tx may be pending; check explorer']
                        } as ITxError,
                        debugLog: logs
                    }
                }
                const hash = stateTransition.hash(false)
                console.log('info', `Credit transfer successful. Hash: ${hash}`)
                return {
                    success: true,
                    data: { txid: hash, message: 'Transaction successful' } as ITxSuccess,
                    debugLog: logs
                }
            } catch (err: any) {
                const errMsg = err?.message ?? 'Unknown state transition error'
                logs.push(`[Transactions] STATE TRANSITION FAILED: ${errMsg}`)
                logs.push(`[Transactions] Error Object: ${JSON.stringify(err ?? {}, null, 2)}`)
                // SAFE: No .includes() on undefined
                let msg = errMsg
                if (typeof msg === 'string' && msg.includes('Duplicate')) {
                    msg = 'Duplicate transaction or invalid nonce'
                }
                return {
                    success: false,
                    error: {
                        code: 500,
                        message: msg,
                        step: 'STATE_TRANSITION',
                        suggestions: ['Check nonce', 'Verify recipient']
                    } as ITxError,
                    debugLog: logs
                }
            }
        } catch (err: any) {
            // SAFE ERROR EXTRACTION (no crash on undefined)
            const errObj = err ?? {}
            const errMsg = errObj.message ?? errObj.toString?.() ?? 'Unknown WASM/Runtime Error'
            logs.push(`[Transactions] CRITICAL: Outer failure.`)
            logs.push(`[Transactions] Full Error: ${JSON.stringify(errObj, null, 2)}`)
            logs.push(`[Transactions] Error Message: ${errMsg}`)
            // SAFE duplicate check
            let msg = errMsg
            if (typeof msg === 'string' && msg.includes('Duplicate')) {
                msg = 'Duplicate transaction or invalid nonce - retry later'
            }
            return {
                success: false,
                error: {
                    code: 500,
                    message: msg,
                    step: 'GENERAL',
                    suggestions: ['Check console', 'Verify balances/network']
                } as ITxError,
                debugLog: logs
            }
        }
    }
    const sendToken = async (params: SendTokenParams): Promise<TransactionResult> => {
        loading.value = true
        error.value = null
        const logs: string[] = ['Starting Token Transfer...']
        try {
            const sdk = await platform.getSDK()
            // KEY RETRIEVAL LOGIC: Explicit > Store
            let transferWif = params.privateKey
            if (!transferWif) {
                const keyResult = await keys.getTransferKey(params.identityIdx)
                transferWif = keyResult !== null ? keyResult : undefined
            }
            if (!transferWif) {
                throw new Error('No transfer key found')
            }
            logs.push('Key retrieved')
            const tokenBaseTransition = await sdk.tokens
                .createBaseTransition(params.tokenId, params.identityId)
            const stateTransition = sdk.tokens
                .createStateTransition(
                    tokenBaseTransition,
                    params.identityId,
                    'transfer',
                    {
                        identityId: params.receiver,
                        amount: params.atomicUnits,
                    },
                )
            const privKey = PrivateKeyWASM.fromWIF(transferWif)
            const identity = await sdk.identities.getIdentityByIdentifier(params.identityId)
            const identityPublicKeys = identity.getPublicKeys()
            let pubKey = identityPublicKeys.find(key => {
                const purpose = typeof key.purpose === 'string' ? parseInt(key.purpose) : key.purpose
                return purpose === 1 || purpose === 3
            })
            if (!pubKey && identityPublicKeys.length > 3) {
                pubKey = identityPublicKeys[3]
            }
            if (!pubKey) {
                throw new Error('No transfer public key found in identity')
            }
            stateTransition.sign(privKey, pubKey)
            // Separate Broadcast & Wait to pinpoint failures
            logs.push('[Token] Broadcasting...')
            try {
                await sdk.stateTransitions.broadcast(stateTransition)
                logs.push('[Token] Broadcast OK')
            } catch (bErr: any) {
                const bMsg = bErr?.message ?? 'Token broadcast failed'
                logs.push(`[Token] BROADCAST FAIL: ${bMsg}`)
                throw new Error(`Broadcast: ${bMsg}`)
            }
            logs.push('[Token] Waiting confirmation...')
            try {
                await sdk.stateTransitions.waitForStateTransitionResult(stateTransition)
                logs.push('[Token] Confirmed!')
            } catch (wErr: any) {
                const wMsg = wErr?.message ?? 'Token confirmation failed'
                logs.push(`[Token] WAIT FAIL: ${wMsg}`)
                throw new Error(`Wait: ${wMsg}`)
            }
            const hash = stateTransition.hash(false)
            console.log('info', `Token transfer successful. Hash: ${hash}, Token: ${params.tokenId}`)
            return {
                success: true,
                data: { txid: hash } as ITxSuccess,
                debugLog: logs
            }
        } catch (err: any) {
            const errObj = err ?? {}
            const errMsg = errObj.message ?? errObj.toString?.() ?? 'Token transfer failed (WASM?)'
            logs.push(`Token Transfer Failed: ${errMsg}`)
            logs.push(`Full Token Error: ${JSON.stringify(errObj, null, 2)}`)
            return {
                success: false,
                error: {
                    code: 500,
                    message: errMsg,
                    step: 'TOKEN_TRANSFER',
                    suggestions: ['Check token approval', 'Verify recipient', 'DASH for fees']
                } as ITxError,
                debugLog: logs
            }
        } finally {
            loading.value = false
        }
    }
    // Wrappers updated to accept optional private key
    const sendCredit = async (
        identityId: string,
        identityIdx: number,
        receiver: string,
        credits: bigint,
        privateKey?: string
    ): Promise<TransactionResult> => {
        const params: SendCreditParams = {
            identityId,
            identityIdx,
            receiver,
            credits,
            ...(privateKey !== undefined ? { privateKey } : {})
        }
        return await sendCredits(params)
    }
    const sendTokenTransfer = async (
        identityId: string,
        identityIdx: number,
        tokenId: string,
        receiver: string,
        atomicUnits: bigint,
        privateKey?: string
    ): Promise<TransactionResult> => {
        const params: SendTokenParams = {
            identityId,
            identityIdx,
            tokenId,
            receiver,
            atomicUnits,
            ...(privateKey !== undefined ? { privateKey } : {})
        }
        return await sendToken(params)
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
        sendTokenTransfer
    }
}
