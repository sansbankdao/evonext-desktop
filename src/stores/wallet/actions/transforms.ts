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
import { atomicToDash, formatDashAmount, formatTokenAmount, truncateAddress } from '../utils'
/* Import types. */
import type { ITransaction, IAsset, IdentityTransfer, TokenTransition } from '@/types/wallet'
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
            ticker: 'DASH',
            name: 'Dash Coins',
            amount: dashBalance,
            usdValue: dashBalance * dashPrice
        },
        // CREDITS (same as DASH balance, uses DASH price)
        {
            ticker: 'CREDITS',
            name: 'Dash Credits',
            amount: creditsBalance,
            usdValue: creditsBalance * dashPrice
        },
        // DUSD ($1.00 hardcoded)
        {
            ticker: 'DUSD',
            name: 'Dash USD',
            amount: dusdBalance,
            usdValue: dusdBalance * 1.00 // $1.00 per DUSD
        },
        // SANS ($0.08 hardcoded)
        {
            ticker: 'SANS',
            name: 'Sansnote',
            amount: sansBalance,
            usdValue: sansBalance * 0.08 // $0.08 per SANS
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
    let type: 'sent' | 'received'
    let title: string
    let subtitle: string
    let amountStr: string
    if (transfer.type === 'IDENTITY_CREATE') {
        type = 'received'
        title = 'New Identity Registered'
        subtitle = 'Identity Creation'
        const dashAmount = atomicToDash(transfer.amount)
        amountStr = formatDashAmount(dashAmount, true)
    } else if (transfer.type === 'IDENTITY_CREDIT_TRANSFER') {
        if (isSent) {
            type = 'sent'
            title = 'Sent DASH'
            subtitle = `To: ${truncateAddress(transfer.recipient)}`
            const dashAmount = atomicToDash(transfer.amount)
            amountStr = formatDashAmount(dashAmount, false)
        } else if (isReceived) {
            type = 'received'
            title = 'Received DASH'
            subtitle = `From: ${truncateAddress(transfer.sender || 'Unknown')}`
            const dashAmount = atomicToDash(transfer.amount)
            amountStr = formatDashAmount(dashAmount, true)
        } else {
            type = 'received'
            title = 'Credit Transfer'
            subtitle = 'Unknown'
            const dashAmount = atomicToDash(transfer.amount)
            amountStr = formatDashAmount(dashAmount, true)
        }
    } else {
        type = 'received'
        title = transfer.type
        subtitle = 'Unknown'
        const dashAmount = atomicToDash(transfer.amount)
        amountStr = formatDashAmount(dashAmount, true)
    }
    return {
        type,
        title,
        subtitle,
        amount: amountStr,
        status: 'Completed' as const,
        date: new Date(transfer.timestamp)
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
        switch (transition.action) {
            case 'TOKEN_MINT':
                type = 'received'
                title = `Minted ${tokenTicker}`
                subtitle = 'Token Mint'
                amountStr = formatTokenAmount(transition.amount, tokenTicker, decimalPlaces, true)
                break
            case 'TOKEN_TRANSFER':
                if (isSent) {
                    type = 'sent'
                    title = `Sent ${tokenTicker}`
                    subtitle = `To: ${truncateAddress(transition.recipient)}`
                    amountStr = formatTokenAmount(transition.amount, tokenTicker, decimalPlaces, false)
                } else if (isReceived) {
                    type = 'received'
                    title = `Received ${tokenTicker}`
                    subtitle = `From: ${truncateAddress(transition.owner.identifier)}`
                    amountStr = formatTokenAmount(transition.amount, tokenTicker, decimalPlaces, true)
                }
                break
            default:
                continue
        }
        result.push({
            type,
            title,
            subtitle,
            amount: amountStr,
            status: 'Completed' as const,
            date: new Date(transition.timestamp)
        })
    }
    return result
}
