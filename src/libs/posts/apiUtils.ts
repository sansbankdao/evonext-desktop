// src/libs/posts/apiUtils.ts

import { EVONEXT_CONTRACT_ID_TESTNET, EVONEXT_CONTRACT_ID_MAINNET } from '@/constants'
import { isTestnet } from '@/utils/env'

/**
 * Get the current data contract ID based on network
 */
export function getContractId(): string {
    return isTestnet() ? EVONEXT_CONTRACT_ID_TESTNET : EVONEXT_CONTRACT_ID_MAINNET
}

/**
 * Convert Base64 identifier to buffer
 */
export function base64ToBuffer(base64: string): Uint8Array {
    return new Uint8Array(Buffer.from(base64, 'base64'))
}

/**
 * Convert buffer to Base64 identifier
 */
export function bufferToBase64(buffer: Uint8Array): string {
    return Buffer.from(buffer).toString('base64')
}

/**
 * Format timestamp to relative time
 */
export function formatTimeAgo(timestamp: number): string {
    const now = new Date().getTime()
    const diffMs = now - timestamp
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    })
}
