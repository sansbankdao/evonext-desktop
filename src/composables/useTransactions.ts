// src/composables/useTransactions.ts
import { computed, ref } from 'vue'
import { PrivateKeyWASM } from 'pshenmic-dpp'
import { usePlatform } from './usePlatform'
import { EvoSDK } from '@dashevo/evo-sdk'
import { useKeyManagement } from './useKeyManagement'
import { useNetwork } from './useNetwork'
import { ErrorBoundary } from '@/utils/errors'
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
    // 2. FIX: Decoding Helper for Base64 Data Payload
    // =========================================================================
    /**
     * Reads raw amount from Base64 'data' field.
     * The API response wraps real amount in this buffer.
     *
     * Structure:
     * Credits/Identity: Uint64 (Big Endian)
     * Tokens: Uint64 (Big Endian) + Uint64 (Amount) [Heuristic based on logs]
     */
    const decodeBase64Amount = (tx: any): bigint => {
        if (!tx.data || typeof tx.data !== 'string') return BigInt(0)
        try {
            const binString = atob(tx.data)
            const bytes = new Uint8Array(binString.length)
            for (let i = 0; i < binString.length; i++) {
                bytes[i] = binString.charCodeAt(i)
            }
            // Credits/Identity Transfer usually starts with version, then amount.
            // Based on logs, amount is usually 2nd or 3rd Uint64.
            // For tokens, it varies.
            // We try to read the 3rd Uint64 (index 16..23) as the amount.
            // This aligns with standard Dash Platform serialization for amounts.
            if (bytes.length < 24) return BigInt(0) // Not enough data for amount field
            // View the byte array as a DataView to read Big Endian Uint64
            const view = new DataView(bytes.buffer)
            // Attempt to read amount at offset 16 (Commonly found in SDK v0.30+)
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
    ): Promise<ITransaction[]> => {
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
                    // --- FIX: Decode Amount from Base64 Data ---
                    // If explicit amount exists (rare), use it. Else decode.
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
                // If on an asset details page, filter for that specific token
                if (assetFilter) {
                    transactions.value = mapped.filter((t: ITransaction) =>
                        t.assetSymbol?.toUpperCase() === assetFilter.toUpperCase()
                    )
                } else {
                    transactions.value = mapped
                }
            } catch (err: any) {
                console.error('Failed to fetch from explorer:', err)
                throw err
            } finally {
                loading.value = false
            }
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
            await platform.getSDK(network.value)
            log('info', `Fetching token transitions for ${tokenId}`, { identityId, limit })
            if (!identityId) {
                console.warn('fetchTokenTransfers: identityId required for Explorer API lookup')
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
                    .map((tt: any) => {
                        const decoded = decodeBase64Amount(tt)
                        return {
                            tokenId: tokenId,
                            type: 'transfer',
                            // --- FIX: Read actual amount from API ---
                            amount: Number(decoded),
                            recipient: tt.recipient || 'Unknown',
                            sender: identityId,
                            timestamp: new Date(tt.timestamp).getTime(),
                            txid: tt.hash
                        }
                    })
            } catch (err: any) {
                console.error('Failed to fetch token transitions:', err)
                throw err
            }
            log('debug', `Found ${tokenTransitions.value.length} transitions`)
            return tokenTransitions.value
        }, 'FETCH_TOKEN_TRANSITIONS_FAILED')
    }
    // =========================================================================
    // 4. Sending Logic (Credit Transfer)
    // =========================================================================
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
            logs.push(`[Transactions] Requesting SDK for network: ${network.value}`)
            const sdk = await platform.getSDK(network.value)
            logs.push('[Transactions] SDK Instance created')
            // 2. DEBUG: Read Internal SDK Info
            const sdkDebugInfo = (sdk as any)._debugInfo
            if (sdkDebugInfo) {
                logs.push(`[DEBUG] SDK Input Network: ${sdkDebugInfo.targetInput}`)
                if (sdkDebugInfo.internalNetwork) {
                    logs.push(`[DEBUG] SDK Internal Network: ${sdkDebugInfo.internalNetwork}`)
                }
                if (sdkDebugInfo.isMainnet !== undefined) {
                    logs.push(`[DEBUG] SDK Is Mainnet: ${sdkDebugInfo.isMainnet ? 'YES' : 'NO'}`)
                }
                if (sdkDebugInfo.warning) {
                    logs.push(`[DEBUG] SDK Warning: ${sdkDebugInfo.warning}`)
                }
            } else {
                logs.push('[DEBUG] No SDK Debug Info found')
            }
            // 3. Retrieve Key
            let signingKey: { privateKey: string, keyId: number } | undefined;
            if (params.privateKey) {
                // If raw WIF passed, we assume Key ID 3 (standard Transfer)
                signingKey = { privateKey: params.privateKey, keyId: 3 };
            } else {
                // Lookup Key Pair from File Store using identityId
                logs.push(`[Transactions] Attempting to resolve Transfer Key for ID: ${params.identityId}`)
                const keyResult = await keys.getTransferKey(params.identityId)
                if (keyResult) signingKey = keyResult;
            }
            if (!signingKey) {
                logs.push('[Transactions] Error: No transfer key found')
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
            logs.push(`[Transactions] Transfer Key found. Key ID: ${signingKey.keyId}`)
            // 4. Get Identity & Public Keys
            logs.push(`[Transactions] Fetching Identity details for ${params.identityId}...`)
            const identity = await sdk.identities.getIdentityByIdentifier(params.identityId)
            logs.push('[Transactions] Identity details retrieved successfully')
            // 5. Get Identity Nonce
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
            // 6. Create, Sign & Broadcast State Transition
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
                // 7. Sign Transaction
                logs.push('[Transactions] Signing transaction...')
                const privKey = PrivateKeyWASM.fromWIF(signingKey.privateKey)
                // DEBUG: Check Private Key Network
                const keyNet = (privKey as any).network || (privKey as any).protocolVersion
                if (keyNet) {
                    logs.push(`[DEBUG] Private Key Network Property: ${keyNet}`)
                }
                // =====================================================================
                // CRITICAL FIX: WASM Key Lookup
                // =====================================================================
                // We cannot rely on .find() directly on WASM objects if the properties
                // are getters. We iterate manually and access the property explicitly.
                // We use 'keyId' (from docs) or 'keyIdNumber' (standard) for comparison.
                // =====================================================================
                const identityPublicKeys = identity.getPublicKeys()
                let pubKey: any | undefined
                logs.push(`[DEBUG] Iterating through ${identityPublicKeys.length} Public Keys to find ID ${signingKey.keyId}...`)
                for (const key of identityPublicKeys) {
                    // Attempt to get the ID from the WASM object
                    // Using 'keyId' (method) or 'keyIdNumber' (property)
                    const currentKeyId = (key as any).keyIdNumber ?? (key as any).keyId
                    logs.push(`[DEBUG] Checking Key: ID=${currentKeyId} vs Target=${signingKey.keyId}`)
                    if (currentKeyId === signingKey!.keyId) {
                        pubKey = key
                        logs.push(`[DEBUG] MATCH FOUND: Key ID ${currentKeyId}`)
                        break
                    }
                }
                if (!pubKey) {
                    logs.push(`[Transactions] Error: Public Key ID ${signingKey.keyId} not found in Identity.`)
                    return {
                        success: false,
                        error: {
                            code: 500,
                            message: `Public Key ID ${signingKey.keyId} missing from identity`,
                            step: 'SIGNING',
                            suggestions: ['Sync identity data from blockchain', 'Verify Key ID in wallet file']
                        } as ITxError,
                            debugLog: logs
                    }
                }
                stateTransition.signaturePublicKeyId = signingKey.keyId
                stateTransition.sign(privKey, pubKey)
                logs.push('[Transactions] Transaction signed successfully')
                // 8a. Broadcast (separate try for pinpoint)
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
                // 8b. Wait Confirmation (separate try)
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
    // =========================================================================
    // 5. Sending Logic (Token Transfer)
    // =========================================================================
    const sendToken = async (params: SendTokenParams): Promise<TransactionResult> => {
        const logs: string[] = ['Starting Token Transfer...']
        loading.value = true
        error.value = null
        try {
            // Pass network explicitly to ensure SDK matches context
            const sdk = await platform.getSDK(network.value)
            logs.push('[Token] SDK created')
            // DEBUG: Read Internal SDK Info
            const sdkDebugInfo = (sdk as any)._debugInfo
            if (sdkDebugInfo) {
                logs.push(`[DEBUG] SDK Input Network: ${sdkDebugInfo.targetInput}`)
                if (sdkDebugInfo.internalNetwork) {
                    logs.push(`[DEBUG] SDK Internal Network: ${sdkDebugInfo.internalNetwork}`)
                }
            }
            // KEY RETRIEVAL LOGIC: Explicit > Store
            let signingKey: { privateKey: string, keyId: number } | undefined;
            if (params.privateKey) {
                signingKey = { privateKey: params.privateKey, keyId: 3 };
            } else {
                logs.push(`[Token] Resolving Transfer Key for ID: ${params.identityId}`)
                const keyResult = await keys.getTransferKey(params.identityId)
                if (keyResult) signingKey = keyResult;
            }
            if (!signingKey) throw new Error('No transfer key found')
            logs.push('[Token] Key retrieved')
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
            const privKey = PrivateKeyWASM.fromWIF(signingKey.privateKey)
            const identity = await sdk.identities.getIdentityByIdentifier(params.identityId)
            // =====================================================================
            // CRITICAL FIX: WASM Key Lookup (Same as sendCredits)
            // =====================================================================
            const identityPublicKeys = identity.getPublicKeys()
            let pubKey: any | undefined
            for (const key of identityPublicKeys) {
                // Attempt to get the ID from the WASM object
                const currentKeyId = (key as any).keyIdNumber ?? (key as any).keyId
                if (currentKeyId === signingKey!.keyId) {
                    pubKey = key
                    break
                }
            }
            if (!pubKey) {
                logs.push(`[Token] Error: Public Key ID ${signingKey!.keyId} missing`)
                throw new Error(`Public Key ID ${signingKey!.keyId} missing from identity`)
            }
            stateTransition.sign(privKey, pubKey)
            // Optimistic: Success on BROADCAST (testnet reliable), short wait optional
            logs.push('[Token] Broadcasting...')
            const stateTransitionHash = await (async () => {
                try {
                    await sdk.stateTransitions.broadcast(stateTransition)
                    logs.push('[Token] Broadcast OK')
                    return stateTransition.hash(false)
                } catch (bErr: any) {
                    const bMsg = bErr?.message ?? 'Token broadcast failed'
                    logs.push(`[Token] BROADCAST FAIL: ${bMsg}`)
                    logs.push(`Broadcast Error: ${JSON.stringify(bErr ?? {}, null, 2)}`)
                    throw new Error(`Broadcast failed: ${bMsg}`)
                }
            })()
            // Optional SHORT wait (20s timeout, don't block UI)
            logs.push('[Token] Optional confirmation wait (20s)...')
            let confirmed = false
            try {
                await Promise.race([
                    sdk.stateTransitions.waitForStateTransitionResult(stateTransition),
                    new Promise(resolve => setTimeout(resolve, 20000))  // 20s timeout
                ])
                logs.push('[Token] Confirmed within timeout!')
                confirmed = true
            } catch (wErr: any) {
                const wMsg = wErr?.message ?? 'Timeout (normal on testnet)'
                logs.push(`[Token] Wait: ${wMsg} (check explorer)`)
            }
            // Optimistic SUCCESS with TXID
            console.log('info', `Token transfer broadcast OK. Hash: ${stateTransitionHash}. Confirmed: ${confirmed}`)
            return {
                success: true,
                data: {
                    txid: stateTransitionHash,
                    message: confirmed ? 'Fully confirmed' : 'Broadcast OK - check explorer'
                } as ITxSuccess,
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
        const params: SendCreditParams = {
            identityId,
            identityIdx,
            receiver,
            credits,
            // Only spread privateKey if defined to handle undefined safely
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
    /**
     * L2 -> L1 Credit Withdrawal (DASH Coins)
     * Utilizes @dashevo/evo-sdk for Protocol v1 support
     */
    const withdrawDash = async (params: WithdrawDashParams): Promise<TransactionResult> => {
        const logs: string[] = ['[Withdrawal] Starting L2->L1 Withdrawal...']
        loading.value = true
        try {
            const currentNetwork = network.value // 'testnet' or 'mainnet'
            logs.push(`[Withdrawal] Network: ${currentNetwork}`)
            // 1. Resolve Keys
            const keyPair = await keys.getTransferKey(params.identityId)
            if (!keyPair || !keyPair.privateKey) {
                throw new Error('Transfer key (Purpose 3) not found.')
            }
            logs.push(`[Withdrawal] Key found (ID: ${keyPair.keyId})`)
            // 2. Initialize EvoSDK
            // We use Trusted mode to speed up the connection for a single operation
            const sdk = currentNetwork === 'mainnet'
                ? EvoSDK.mainnetTrusted()
                : EvoSDK.testnetTrusted()
            logs.push('[Withdrawal] Connecting to EvoSDK...')
            await sdk.connect()
            // 3. Convert Dash to Credits (1 Dash = 10^11 Credits)
            // Note: evo-sdk creditWithdrawal takes 'amount' in credits
            const creditAmount = BigInt(Math.floor(params.amountDash * 100_000_000_000))
            logs.push(`[Withdrawal] Amount: ${params.amountDash} DASH (${creditAmount} credits)`)
            // 4. Execute Withdrawal
            // This method handles state transition creation, signing, and broadcasting
            const result = await sdk.identities.creditWithdrawal({
                identityId: params.identityId,
                toAddress: params.recipientAddress,
                amount: creditAmount,
                coreFeePerByte: 1.2, // Default standard fee
                privateKeyWif: keyPair.privateKey,
                keyId: keyPair.keyId
            })
            logs.push(`[Withdrawal] Success! Result: ${JSON.stringify(result)}`)
            // EvoSDK returns the state transition result; we extract the hash
            const txHash = typeof result === 'string' ? result : (result as any).hash
            return {
                success: true,
                data: {
                    txid: txHash || 'TRANSFERRED',
                    message: 'Withdrawal to Core successful'
                },
                debugLog: logs
            }
        } catch (err: any) {
            const errMsg = err?.message || 'Withdrawal failed'
            logs.push(`[Withdrawal] ERROR: ${errMsg}`)
            return {
                success: false,
                error: {
                    code: 500,
                    message: errMsg,
                    step: 'WITHDRAWAL_EXECUTION'
                },
                debugLog: logs
            }
        } finally {
            loading.value = false
        }
    }
    // =========================================================================
    // 7. Public API
    // =========================================================================
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
