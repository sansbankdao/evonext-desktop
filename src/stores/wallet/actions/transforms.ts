// src/stores/wallet/actions/transforms.ts

/* Import modules. */
import {
    DUSD_CONTRACT_ID_MAINNET,
    DUSD_CONTRACT_ID_TESTNET,
    SANS_CONTRACT_ID_MAINNET,
    SANS_CONTRACT_ID_TESTNET,
    DUSD_DECIMAL_PLACES,
    SANS_DECIMAL_PLACES
} from '@/constants'
/* Import utilities. */
import { atomicToDash, formatDashAmount, formatTokenAmount, truncateAddress } from './utils'
/* Import types. */
import type { ITransaction, IAsset, IdentityTransfer, TokenTransition } from '@/types'

// Define token prices as constants
const TOKEN_PRICES = {
    DUSD: 1.00,
    SANS: 0.16
} as const

// ... (createUpdatedAssets and processTokenBalances functions remain unchanged) ...
export function createUpdatedAssets(
    dashBalance: number,
    creditsBalance: number,
    dusdBalance: number,
    sansBalance: number,
    dashPrice: number
): IAsset[] {
    return [
        {
            id: 'DASH',
            symbol: 'DASH',
            name: 'Dash Coins',
            balance: dashBalance,
            usdValue: dashBalance * dashPrice,
            decimals: 8,
            type: 'native',
            balanceFormatted: '$0.00',
            category: 'currency',
            network: '',
            isOwned: true,
            ownerIdentityId: '',
            verified: true,
            blocked: false,
            transferable: true,
            divisible: true,
        },
        {
            id: 'CREDITS',
            symbol: 'CREDITS',
            name: 'Dash Credits',
            balance: creditsBalance,
            usdValue: creditsBalance * dashPrice,
            decimals: 12,
            type: 'native',
            balanceFormatted: '$0.00',
            category: 'currency',
            network: '',
            isOwned: true,
            ownerIdentityId: '',
            verified: true,
            blocked: false,
            transferable: true,
            divisible: true,
        },
        {
            id: 'DUSD',
            symbol: 'DUSD',
            name: 'Dash USD',
            balance: dusdBalance,
            usdValue: dusdBalance * TOKEN_PRICES.DUSD,
            decimals: 6,
            type: 'native',
            balanceFormatted: '$0.00',
            category: 'currency',
            network: '',
            isOwned: true,
            ownerIdentityId: '',
            verified: true,
            blocked: false,
            transferable: true,
            divisible: true,
        },
        {
            id: 'SANS',
            symbol: 'SANS',
            name: 'Sansnote',
            balance: sansBalance,
            usdValue: sansBalance * TOKEN_PRICES.SANS,
            decimals: 8,
            type: 'native',
            balanceFormatted: '$0.00',
            category: 'currency',
            network: '',
            isOwned: true,
            ownerIdentityId: '',
            verified: true,
            blocked: false,
            transferable: true,
            divisible: true,
        },
    ]
}

export function processTokenBalances(
    tokenBalances: any[],
    network: string
): { dusdBalance: number, sansBalance: number } {
    const isTestnet = network.toLowerCase() === 'testnet'
    const dusdContractId = isTestnet ? DUSD_CONTRACT_ID_TESTNET : DUSD_CONTRACT_ID_MAINNET
    const sansContractId = isTestnet ? SANS_CONTRACT_ID_TESTNET : SANS_CONTRACT_ID_MAINNET

    const dusdBalanceAtomic = tokenBalances.find(token => {
        const tokenIdStr = typeof token.tokenId === 'string'
            ? token.tokenId
            : (token.tokenId?.base58 ? token.tokenId.base58() : '')
        return tokenIdStr === dusdContractId
    })?.balance || BigInt(0)

    const sansBalanceAtomic = tokenBalances.find(token => {
        const tokenIdStr = typeof token.tokenId === 'string'
            ? token.tokenId
            : (token.tokenId?.base58 ? token.tokenId.base58() : '')
        return tokenIdStr === sansContractId
    })?.balance || BigInt(0)

    return {
        dusdBalance: Number(dusdBalanceAtomic) / (10 ** DUSD_DECIMAL_PLACES),
        sansBalance: Number(sansBalanceAtomic) / (10 ** SANS_DECIMAL_PLACES)
    }
}

// ... (transformIdentityTransfer remains unchanged) ...
export function transformIdentityTransfer(
    transfer: any,
    identityId: string
): ITransaction {
    // 1. Resolve Sender Correctly (API nests it in owner.identifier)
    // We check all possible locations the API might put the ID
    const rawSender = transfer.owner?.identifier ||
                      transfer.sender ||
                      transfer.senderId ||
                      'Unknown'

    // 2. Resolve Recipient (Often missing in raw Identity transfers)
    const rawRecipient = transfer.recipient || transfer.recipientId || 'Unknown'

    // 3. Resolve Type
    const rawType = transfer.type || 'UNKNOWN'

    // 4. Determine Direction
    const isSent = rawSender === identityId
    const isReceived = rawRecipient === identityId

    // 5. Safe Amount Parsing
    // If the API returns NO amount field (common for raw Identity txs), we mark it.
    let amountVal = 0
    let hasAmount = false

    if (transfer.amount !== undefined && transfer.amount !== null) {
        amountVal = Number(transfer.amount)
        hasAmount = !isNaN(amountVal)
    }

    // --- DISPLAY LOGIC ---
    let type: 'IDENTITY_CREATE' | 'IDENTITY_CREDIT_TRANSFER' | 'SYSTEM' | 'UNKNOWN' = 'UNKNOWN'
    let title = 'System Activity'
    let subtitle = 'State Transition'
    let amountStr = '---' // Default to dashes if no amount exists
    let assetType: 'COIN' | 'TOKEN' = 'COIN'

    if (rawType === 'IDENTITY_CREATE') {
        type = 'IDENTITY_CREATE'
        title = 'Identity Created'
        subtitle = 'Registration'
        amountStr = hasAmount ? formatDashAmount(atomicToDash(amountVal), true) : '---'
    }
    else if (rawType === 'IDENTITY_CREDIT_TRANSFER') {
        type = 'IDENTITY_CREDIT_TRANSFER'

        // Since raw API hides the amount in Base64 'data', we can't show it easily.
        // We focus on the direction instead.
        if (isSent) {
            title = 'Sent Credits'
            subtitle = 'Standard Transfer' // Recipient is also hidden in 'data'
            amountStr = hasAmount ? formatDashAmount(atomicToDash(amountVal), false) : '---'
        } else {
            // If we don't know direction, assumption is interaction
            title = 'Credit Interaction'
            subtitle = 'Network Event'
            amountStr = hasAmount ? formatDashAmount(atomicToDash(amountVal), true) : '---'
        }
    }
    else if (rawType === 'IDENTITY_CREDIT_WITHDRAWAL') {
        type = 'IDENTITY_CREDIT_TRANSFER'
        title = 'Withdrawal'
        subtitle = 'To Layer 1'
        amountStr = hasAmount ? formatDashAmount(atomicToDash(amountVal), false) : '---'
    }
    else if (rawType === 'DATA_CONTRACT_CREATE') {
        type = 'SYSTEM'
        title = 'Contract Created'
        subtitle = 'Developer Action'
        amountStr = '' // No amount relevant here
    }
    else if (rawType === 'BATCH' && transfer.batchType === 'TOKEN_TRANSFER') {
        // These are the wrappers for your Token Txs.
        // We label them SYSTEM so the Component can filter them out
        // (because the Detailed Token Logic handles the real data)
        type = 'SYSTEM'
        title = 'Token Bundle'
        subtitle = 'Processed internally'
        amountStr = ''
    }
    else {
        type = 'UNKNOWN'
        title = rawType.replace(/_/g, ' ') // Make "SOME_TYPE" look like "SOME TYPE"
        subtitle = 'System Event'
    }

    return {
        id: transfer.hash || transfer.txHash || String(Date.now()),
        type: type as any,
        title,
        subtitle,
        amount: amountStr,
        status: 'CONFIRMED',
        createdAt: transfer.timestamp ? new Date(transfer.timestamp).getTime() : Date.now(),
        date: transfer.timestamp ? new Date(transfer.timestamp).getTime() : Date.now(),
        hash: transfer.hash || '',
        confirmations: 1,
        senderId: rawSender,
        receiverId: rawRecipient,
        assetType,
        assetSymbol: 'DASH',
        direction: isSent ? 'OUTGOING' : 'INCOMING',
        network: 'testnet',
    }
}

/**
 * FIXED: Transform token transitions to transaction objects
 * Handles raw API structure correctly (owner.identifier, recipient, action)
 */
export function transformTokenTransitions(
    transitions: any[], // Type 'any' used to handle raw API variation
    identityId: string,
    tokenTicker: string,
    decimalPlaces: number
): ITransaction[] {
    const result: ITransaction[] = []

    for (const transition of transitions) {
        // 1. Resolve Fields from Raw API
        const rawOwner = transition.owner?.identifier || transition.identityId || 'Unknown'
        const rawRecipient = transition.recipient || transition.recipientId || 'Unknown'
        const rawAction = transition.action || transition.type || 'UNKNOWN'
        const rawHash = transition.stateTransitionHash || transition.txHash || ''
        const rawTimestamp = transition.timestamp || transition.createdAt || Date.now()

        // 2. Determine Ownership
        const isOwner = rawOwner === identityId
        const isRecipient = rawRecipient === identityId

        // Filter irrelevant (unless you want to see everything)
        if (!isOwner && !isRecipient) {
            // continue // Uncomment if strict filtering is desired
        }

        let type: 'sent' | 'received' | 'swap' = 'received'
        let title = ''
        let subtitle = ''
        let amountStr = ''

        const transitionAmount = typeof transition.amount === 'string'
            ? parseFloat(transition.amount)
            : Number(transition.amount)

        // 3. Map Actions
        if (rawAction === 'TOKEN_MINT' || rawAction === 'MINT') {
            type = 'received'
            title = `Minted ${tokenTicker}`
            subtitle = 'Token Mint'
            amountStr = formatTokenAmount(transitionAmount, tokenTicker, decimalPlaces, true)
        }
        else if (rawAction === 'TOKEN_TRANSFER' || rawAction === 'TRANSFER' || rawAction === 'IDENTITY_TOKEN_TRANSFER') {
            if (isOwner) {
                type = 'sent'
                title = `Sent ${tokenTicker}`
                subtitle = `To: ${truncateAddress(rawRecipient)}`
                amountStr = formatTokenAmount(transitionAmount, tokenTicker, decimalPlaces, false)
            } else {
                // Default to received if we are recipient or observer
                type = 'received'
                title = `Received ${tokenTicker}`
                subtitle = `From: ${truncateAddress(rawOwner)}`
                amountStr = formatTokenAmount(transitionAmount, tokenTicker, decimalPlaces, true)
            }
        }
        else if (rawAction === 'TOKEN_BURN' || rawAction === 'BURN') {
            type = 'sent'
            title = `Burnt ${tokenTicker}`
            subtitle = 'Token Burn'
            amountStr = formatTokenAmount(transitionAmount, tokenTicker, decimalPlaces, false)
        }

        if (title && amountStr) {
            // Parse Date
            const dateVal = new Date(rawTimestamp).getTime()

            result.push({
                id: rawHash,
                type,
                title,
                subtitle,
                amount: amountStr,
                status: 'CONFIRMED',
                date: dateVal,
                createdAt: dateVal,
                hash: rawHash,
                confirmations: 1,
                senderId: rawOwner,
                receiverId: rawRecipient,
                assetType: 'TOKEN',
                assetSymbol: tokenTicker,
                direction: isOwner ? 'OUTGOING' : 'INCOMING',
                network: 'testnet',
            })
        }
    }

    return result
}
