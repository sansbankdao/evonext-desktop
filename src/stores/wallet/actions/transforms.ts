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
    DUSD: 1.00, // Fixed stablecoin
    SANS: 0.16  // Updated to $0.16 per your requirement
} as const

/**
 * Create updated assets array with live data
 */
export function createUpdatedAssets(
    dashBalance: number,
    creditsBalance: number,
    dusdBalance: number,
    sansBalance: number,
    dashPrice: number
): IAsset[] {
    return [
        // DASH (same as credits)
        {
            symbol: 'DASH',
            ticker: 'DASH', // Added to match screen usage
            name: 'Dash Coins',
            balance: dashBalance,
            usdValue: dashBalance * dashPrice,
            amount: dashBalance, // Added to match screen usage
            id: 'DASH',
            precision: 8,
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
        // CREDITS (same as DASH balance, uses DASH price)
        {
            symbol: 'CREDITS',
            ticker: 'CREDITS', // Added
            name: 'Dash Credits',
            balance: creditsBalance,
            usdValue: creditsBalance * dashPrice,
            amount: creditsBalance, // Added
            id: 'DASH',
            precision: 12,
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
        // DUSD ($1.00 hardcoded as stablecoin)
        {
            symbol: 'DUSD',
            ticker: 'DUSD', // Added
            name: 'Dash USD',
            balance: dusdBalance,
            usdValue: dusdBalance * TOKEN_PRICES.DUSD,
            amount: dusdBalance, // Added
            id: 'DUSD',
            precision: 6,
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
        // SANS ($0.16 hardcoded - updated per requirement)
        {
            symbol: 'SANS',
            ticker: 'SANS', // Added
            name: 'Sansnote',
            balance: sansBalance,
            usdValue: sansBalance * TOKEN_PRICES.SANS,
            amount: sansBalance, // Added
            id: 'SANS',
            precision: 8,
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

/**
 * Process token balances from API response
 */
export function processTokenBalances(
    tokenBalances: any[],
    isTestnet: boolean
): { dusdBalance: number, sansBalance: number } {
    const dusdContractId = isTestnet ? DUSD_CONTRACT_ID_TESTNET : DUSD_CONTRACT_ID_MAINNET
    const sansContractId = isTestnet ? SANS_CONTRACT_ID_TESTNET : SANS_CONTRACT_ID_MAINNET

    // Handle different tokenId structures (object vs string)
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

/**
 * Transform identity transfer to transaction object
 */
export function transformIdentityTransfer(
    transfer: IdentityTransfer,
    identityId: string
): ITransaction {
    const isSent = transfer.sender === identityId
    const isReceived = transfer.recipient === identityId

    let type: 'IDENTITY_CREATE' | 'IDENTITY_CREDIT_TRANSFER' | 'UNKNOWN'
    let title: string
    let subtitle: string
    let amountStr: string

    // Convert string amount to number for atomicToDash
    const transferAmount = typeof transfer.amount === 'string'
        ? parseFloat(transfer.amount)
        : Number(transfer.amount)

    if (transfer.type === 'IDENTITY_CREATE') {
        type = 'IDENTITY_CREATE'
        title = 'New Identity Registered'
        subtitle = 'Identity Creation'
        const dashAmount = atomicToDash(transferAmount)
        amountStr = formatDashAmount(dashAmount, true)
    } else if (transfer.type === 'IDENTITY_CREDIT_TRANSFER') {
        if (isSent) {
            type = 'IDENTITY_CREDIT_TRANSFER'
            title = 'Sent DASH'
            subtitle = `To: ${truncateAddress(transfer.recipient)}`
            const dashAmount = atomicToDash(transferAmount)
            amountStr = formatDashAmount(dashAmount, false)
        } else if (isReceived) {
            type = 'IDENTITY_CREDIT_TRANSFER'
            title = 'Received DASH'
            subtitle = `From: ${truncateAddress(transfer.sender || 'Unknown')}`
            const dashAmount = atomicToDash(transferAmount)
            amountStr = formatDashAmount(dashAmount, true)
        } else {
            type = 'IDENTITY_CREDIT_TRANSFER'
            title = 'Credit Transfer'
            subtitle = 'Unknown'
            const dashAmount = atomicToDash(transferAmount)
            amountStr = formatDashAmount(dashAmount, true)
        }
    } else {
        type = 'UNKNOWN'
        title = transfer.type
        subtitle = 'Unknown'
        const dashAmount = atomicToDash(transferAmount)
        amountStr = formatDashAmount(dashAmount, true)
    }

    return {
        id: transfer.txHash!,
        type, // 'IDENTITY_CREATE' | 'IDENTITY_CREDIT_TRANSFER'
        title, // Mapped
        subtitle, // Mapped
        amount: amountStr,
        status: 'CONFIRMED' as const,
        createdAt: transfer.createdAt,
        date: transfer.createdAt, // Added alias

        hash: transfer.txHash || '',
        confirmations: 0,
        senderId: transfer.sender,
        receiverId: transfer.recipient,
        assetType: 'COIN',
        assetSymbol: '',
        direction: isSent ? 'OUT' : 'IN',
        network: 'testnet',
    }
}

/**
 * Transform token transitions to transaction objects
 */
export function transformTokenTransitions(
    transitions: TokenTransition[],
    identityId: string,
    tokenTicker: string,
    decimalPlaces: number
): ITransaction[] {
    const result: ITransaction[] = []

    for (const transition of transitions) {
        // FIX: Safe property access
        // Assuming 'owner' structure might be different or 'ownerId' is present
        // We use 'ownerId' and 'recipient' which are strings in types
        const isOwner = transition.ownerId === identityId // Assuming 'ownerId' exists on TokenTransition or you use owner.identifier
        const isRecipient = transition.recipient === identityId

        // Fallback if structure is different:
        // If 'ownerId' is missing, this check might fail.
        // Adjusting based on typical Dash Platform structures:
        // Usually sender/recipient are string identifiers.

        if (!isOwner && !isRecipient) {
            continue
        }

        let type: 'sent' | 'received' = 'received'
        let title = ''
        let subtitle = ''
        let amountStr = ''

        // Convert string amount to number for formatTokenAmount
        const transitionAmount = typeof transition.amount === 'string'
            ? parseFloat(transition.amount)
            : Number(transition.amount)

        switch (transition.actionType) { // Changed from 'action' to 'actionType' based on common patterns
            case 'TOKEN_MINT':
                type = 'received'
                title = `Minted ${tokenTicker}`
                subtitle = 'Token Mint'
                amountStr = formatTokenAmount(transitionAmount, tokenTicker, decimalPlaces, true)
                break

            case 'TOKEN_TRANSFER':
                if (isOwner) {
                    type = 'sent'
                    title = `Sent ${tokenTicker}`
                    subtitle = `To: ${truncateAddress(transition.recipient)}`
                    amountStr = formatTokenAmount(transitionAmount, tokenTicker, decimalPlaces, false)
                } else if (isRecipient) {
                    type = 'received'
                    title = `Received ${tokenTicker}`
                    subtitle = `From: ${truncateAddress(transition.ownerId || 'Unknown')}`
                    amountStr = formatTokenAmount(transitionAmount, tokenTicker, decimalPlaces, true)
                }
                break

            default:
                continue
        }

        if (title && amountStr) {
            result.push({
                id: transition.txHash || '',
                type, // 'sent' | 'received'
                title,
                subtitle,
                amount: amountStr,
                status: 'PENDING' as const,
                // FIX: Convert Date to number for 'date' property
                date: typeof transition.createdAt === 'number' ? transition.createdAt : new Date(transition.createdAt).getTime(),
                createdAt: typeof transition.createdAt === 'number' ? transition.createdAt : new Date(transition.createdAt).getTime()
            })
        }
    }

    return result
}
