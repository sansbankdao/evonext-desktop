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
            name: 'Dash Coins',
            balance: dashBalance,
            usdValue: dashBalance * dashPrice
        },
        // CREDITS (same as DASH balance, uses DASH price)
        {
            symbol: 'CREDITS',
            name: 'Dash Credits',
            balance: creditsBalance,
            usdValue: creditsBalance * dashPrice
        },
        // DUSD ($1.00 hardcoded as stablecoin)
        {
            symbol: 'DUSD',
            name: 'Dash USD',
            balance: dusdBalance,
            usdValue: dusdBalance * TOKEN_PRICES.DUSD
        },
        // SANS ($0.16 hardcoded - updated per requirement)
        {
            symbol: 'SANS',
            name: 'Sansnote',
            balance: sansBalance,
            usdValue: sansBalance * TOKEN_PRICES.SANS
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

    const dusdBalanceAtomic = tokenBalances.find(token => {
        const tokenIdStr = token.tokenId?.base58?.() || token.tokenId
        return tokenIdStr === dusdContractId
    })?.balance || BigInt(0)

    const sansBalanceAtomic = tokenBalances.find(token => {
        const tokenIdStr = token.tokenId?.base58?.() || token.tokenId
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
        type,
        // title,
        // subtitle,
        amount: amountStr,
        status: 'CONFIRMED' as const,
        createdAt: transfer.createdAt
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
        if (transition.owner.identifier !== identityId && transition.recipient !== identityId) {
            continue
        }

        const isSent = transition.owner.identifier === identityId
        const isReceived = transition.recipient === identityId

        let type: 'sent' | 'received' = 'received'
        let title = ''
        let subtitle = ''
        let amountStr = ''

        // Convert string amount to number for formatTokenAmount
        const transitionAmount = typeof transition.amount === 'string'
            ? parseFloat(transition.amount)
            : Number(transition.amount)

        switch (transition.action) {
            case 'TOKEN_MINT':
                type = 'received'
                title = `Minted ${tokenTicker}`
                subtitle = 'Token Mint'
                amountStr = formatTokenAmount(transitionAmount, tokenTicker, decimalPlaces, true)
                break

            case 'TOKEN_TRANSFER':
                if (isSent) {
                    type = 'sent'
                    title = `Sent ${tokenTicker}`
                    subtitle = `To: ${truncateAddress(transition.recipient)}`
                    amountStr = formatTokenAmount(transitionAmount, tokenTicker, decimalPlaces, false)
                } else if (isReceived) {
                    type = 'received'
                    title = `Received ${tokenTicker}`
                    subtitle = `From: ${truncateAddress(transition.owner.identifier)}`
                    amountStr = formatTokenAmount(transitionAmount, tokenTicker, decimalPlaces, true)
                }
                break

            default:
                continue
        }

        if (title && amountStr) {
            result.push({
                id: transition.txHash || '',
                type,
                title,
                subtitle,
                amount: amountStr,
                status: 'PENDING' as const,
                date: new Date(transition.createdAt)
            })
        }
    }

    return result
}
