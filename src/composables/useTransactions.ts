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
        loading.value = true
        error.value = null
        try {
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
            // KEY RETRIEVAL LOGIC: Explicit > Store
            // Fix 1: Ensure undefined is the fallback, not null, for strict types
            let transferWif = params.privateKey
            if (!transferWif) {
                const keyResult = await keys.getTransferKey(params.identityIdx)
                transferWif = keyResult !== null ? keyResult : undefined
            }
            if (!transferWif) {
                throw new Error('No transfer key found. Please ensure you are logged in or provide a key.')
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
            let pubKey = identityPublicKeys.find(key => {
                const purpose = typeof key.purpose === 'string' ? parseInt(key.purpose) : key.purpose
                return purpose === 1 || purpose === 3
            })
            if (!pubKey && identityPublicKeys.length > 3) {
                pubKey = identityPublicKeys[3]
            }
            if (!pubKey) {
                throw new Error('No transfer public key found in identity to match the private key')
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
            // KEY RETRIEVAL LOGIC: Explicit > Store
            // Fix 2: Ensure undefined is the fallback
            let transferWif = params.privateKey
            if (!transferWif) {
                const keyResult = await keys.getTransferKey(params.identityIdx)
                transferWif = keyResult !== null ? keyResult : undefined
            }
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
    // Wrappers updated to accept optional private key
    const sendCredit = async (
        identityId: string,
        identityIdx: number,
        receiver: string,
        credits: bigint,
        privateKey?: string
    ): Promise<TransactionResult> => {
        // Fix 3: ExactOptionalPropertyTypes compatibility
        // We conditionally spread the property to avoid setting 'undefined' explicitly if not provided
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
        // Fix 4: ExactOptionalPropertyTypes compatibility
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
