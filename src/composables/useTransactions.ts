// src/composables/useTransactions.ts
import { computed, ref } from 'vue'
import { PrivateKeyWASM } from 'pshenmic-dpp'
import { usePlatform } from './usePlatform'
import { useKeyManagement } from './useKeyManagement'
import { useBalances } from './useBalances' // For fromSatoshi reuse
import { ErrorBoundary } from '@/utils/errors'
import { log } from '@/utils/env'
import { MIN_CREDIT_TRANSFER } from '@/constants'
// import type {
//     SendCreditParams,
//     SendTokenParams,
//     TransactionResult,
//     ITxSuccess,
//     ITxError,
//     Transaction,
//     TokenTransition
// } from '@/types'
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
}
interface SendTokenParams {
    identityId: string
    identityIdx: number
    tokenId: string
    receiver: string
    atomicUnits: bigint
}
interface TransactionResult {
    success: boolean
    data?: ITxSuccess
    error?: ITxError
}
interface ITxSuccess {
    txid: string
}
interface ITxError {
    code: number
    message: string
    suggestions?: string[]
}

const EXPLORER_API_URL = 'https://platform-explorer.pshenmic.dev'
export function useTransactions() {
    const platform = usePlatform()
    const keys = useKeyManagement()
    const balances = useBalances()
    const loading = ref(false)
    const error = ref<string | null>(null)
    const transactions = ref<ITransaction[]>([])
    const tokenTransitions = ref<TokenTransition[]>([])
    /**
     * Transaction fetching (merged from libs/getTransactions.ts)
     */
    const fetchIdentityTransfers = async (
        identityId: string,
        limit: number = 50
    ): Promise<ITransaction[]> => {
        return ErrorBoundary.wrap(async () => {
            loading.value = true
            error.value = null
            // SDK init kept to ensure platform readiness, though not used for REST call
            await platform.getSDK()
            log('info',`Fetching transfers for ${identityId}`, { limit })
            try {
                const response = await fetch(`${EXPLORER_API_URL}/identity/${identityId}/transactions?page=1&limit=${limit}&order=desc`)
                if (!response.ok) throw new Error(`Explorer API error: ${response.statusText}`)
                const data = await response.json()
                const resultSet = data.resultSet || []
                // Map explorer results to ITransaction
                transactions.value = resultSet
                    .filter((t: any) => t.type === 'IDENTITY_CREDIT_TRANSFER')
                    .map((t: any) => ({
                        type: 'credit',
                        // Note: actual amount and recipient are encoded in t.data (Base64)
                        // Without decoding the state transition, we use placeholders:
                        amount: BigInt(0),
                        recipient: 'Unknown',
                        timestamp: new Date(t.timestamp).getTime(),
                        confirmations: t.status === 'SUCCESS' ? 1 : 0,
                        txid: t.hash
                    }))
            } catch (err: any) {
                console.error('Failed to fetch from explorer:', err)
                throw err
            }
            log('debug',`Found ${transactions.value.length} transfers`)
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
            log('info',`Fetching token transitions for ${tokenId}`, { identityId, limit })
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
                // Filter for BATCH transactions of type TOKEN_TRANSFER
                tokenTransitions.value = resultSet
                    .filter((t: any) => t.type === 'BATCH' && t.batchType === 'TOKEN_TRANSFER')
                    .map((tt: any) => ({
                        tokenId: tokenId, // Assumed from context
                        type: 'transfer',
                        // Note: actual amount and details are encoded in tt.data (Base64)
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
            log('debug',`Found ${tokenTransitions.value.length} transitions`)
            return tokenTransitions.value
        }, 'FETCH_TOKEN_TRANSITIONS_FAILED')
    }
    /**
     * Formatting utils (merged from libs/getTransactions.ts)
     */
    const atomicToDash = (atomic: bigint | number): number => {
        return balances.fromSatoshi(atomic) // Reuse satoshi utils
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
     * Send operations (existing)
     */
    const sendCredits = async (params: SendCreditParams): Promise<TransactionResult> => {
        loading.value = true
        error.value = null
        try {
            // Validate minimum credit transfer amount
            if (params.credits < MIN_CREDIT_TRANSFER) {
                return {
                    success: false,
                    error: {
                        code: 400,
                        message: `Minimum credit transfer amount is ${MIN_CREDIT_TRANSFER.toLocaleString()} credits`,
                        suggestions: ['Increase transfer amount to meet minimum requirements']
                    } as ITxError
                }
            }
            const sdk = await platform.getSDK()
            const transferWif = await keys.getTransferKey(params.identityIdx)
            if (!transferWif) {
                throw new Error('No transfer key found')
            }
            const privKey = PrivateKeyWASM.fromWIF(transferWif)
            const identity = await sdk.identities.getIdentityByIdentifier(params.identityId)
            const identityNonce = await sdk.identities.getIdentityNonce(params.identityId)
            const payload = {
                identityId: params.identityId,
                amount: params.credits,
                recipientId: params.receiver,
                identityNonce: (identityNonce + BigInt(1))
            }
            const stateTransition = sdk.identities.createStateTransition('creditTransfer', payload)
            const identityPublicKeys = identity.getPublicKeys()
            // Find the TRANSFER key (purpose=1 or purpose=3)
            let pubKey = identityPublicKeys.find(key => {
                const purpose = typeof key.purpose === 'string' ? parseInt(key.purpose) : key.purpose
                return purpose === 1 || purpose === 3
            })
            // Fallback to key at index 3 if no TRANSFER key found
            if (!pubKey && identityPublicKeys.length > 3) {
                pubKey = identityPublicKeys[3]
            }
            if (!pubKey) {
                throw new Error('No transfer public key found in identity')
            }
            stateTransition.sign(privKey, pubKey)
            await sdk.stateTransitions.broadcast(stateTransition)
            await sdk.stateTransitions.waitForStateTransitionResult(stateTransition)
            const hash = stateTransition.hash(false)
            console.log('info', `Credit transfer successful. Hash: ${hash}`)
            return {
                success: true,
                data: { txid: hash } as ITxSuccess
            }
        } catch (err: any) {
            error.value = err.message || 'Credit transfer failed'
            console.error('Credit transfer error:', err)
            return {
                success: false,
                error: {
                    code: 500,
                    message: error.value!,
                    suggestions: ['Check your network connection', 'Verify your identity has sufficient balance']
                } as ITxError
            }
        } finally {
            loading.value = false
        }
    }
    const sendToken = async (params: SendTokenParams): Promise<TransactionResult> => {
        loading.value = true
        error.value = null
        try {
            const sdk = await platform.getSDK()
            const transferWif = await keys.getTransferKey(params.identityIdx)
            if (!transferWif) {
                throw new Error('No transfer key found')
            }
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
            // Find the TRANSFER key (purpose=1 or purpose=3)
            let pubKey = identityPublicKeys.find(key => {
                const purpose = typeof key.purpose === 'string' ? parseInt(key.purpose) : key.purpose
                return purpose === 1 || purpose === 3
            })
            // Fallback to key at index 3 if no TRANSFER key found
            if (!pubKey && identityPublicKeys.length > 3) {
                pubKey = identityPublicKeys[3]
            }
            if (!pubKey) {
                throw new Error('No transfer public key found in identity')
            }
            stateTransition.sign(privKey, pubKey)
            await sdk.stateTransitions.broadcast(stateTransition)
            await sdk.stateTransitions.waitForStateTransitionResult(stateTransition)
            const hash = stateTransition.hash(false)
            console.log('info', `Token transfer successful. Hash: ${hash}, Token: ${params.tokenId}`)
            return {
                success: true,
                data: { txid: hash } as ITxSuccess
            }
        } catch (err: any) {
            error.value = err.message || 'Token transfer failed'
            console.error('Token transfer error:', err)
            return {
                success: false,
                error: {
                    code: 500,
                    message: error.value!,
                    suggestions: ['Check your network connection', 'Verify you have sufficient token balance']
                } as ITxError
            }
        } finally {
            loading.value = false
        }
    }
    const sendCredit = async (
        identityId: string,
        identityIdx: number,
        receiver: string,
        credits: bigint
    ): Promise<TransactionResult> => {
        const params: SendCreditParams = {
            identityId,
            identityIdx,
            receiver,
            credits
        }
        return await sendCredits(params)
    }
    const sendTokenTransfer = async (
        identityId: string,
        identityIdx: number,
        tokenId: string,
        receiver: string,
        atomicUnits: bigint
    ): Promise<TransactionResult> => {
        const params: SendTokenParams = {
            identityId,
            identityIdx,
            tokenId,
            receiver,
            atomicUnits
        }
        return await sendToken(params)
    }
    return {
        // State
        loading: computed(() => loading.value),
        error: computed(() => error.value),
        transactions: computed(() => transactions.value),
        tokenTransitions: computed(() => tokenTransitions.value),
        // Fetching (merged)
        fetchIdentityTransfers,
        fetchTokenTransitions,
        // Formatting (merged)
        atomicToDash,
        formatDashAmount,
        formatDate,
        shortTxid,
        // Send operations
        sendCredits,
        sendToken,
        sendCredit,
        sendTokenTransfer
    }
}
