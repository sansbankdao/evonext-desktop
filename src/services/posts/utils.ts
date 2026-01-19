// src/services/posts/utils.ts

import {
    EVONEXT_CONTRACT_ID_TESTNET,
    EVONEXT_CONTRACT_ID_MAINNET,
    DASHPAY_CONTRACT_ID_MAINNET,
    DASHPAY_CONTRACT_ID_TESTNET,
    DPNS_CONTRACT_ID_MAINNET,
    DPNS_CONTRACT_ID_TESTNET
} from '@/constants'

/**
 * Get the current data contract ID based on network and type
 */
export function getContractId(type: 'evonext' | 'dashpay' | 'dpns' = 'evonext', network: string): string {
    const isTest = network.toLowerCase() === 'testnet'
    switch (type) {
        case 'evonext':
            return isTest ? EVONEXT_CONTRACT_ID_TESTNET : EVONEXT_CONTRACT_ID_MAINNET
        case 'dashpay':
            return isTest ? DASHPAY_CONTRACT_ID_TESTNET : DASHPAY_CONTRACT_ID_MAINNET
        case 'dpns':
            return isTest ? DPNS_CONTRACT_ID_TESTNET : DPNS_CONTRACT_ID_MAINNET
        default:
            return EVONEXT_CONTRACT_ID_MAINNET
    }
}

/**
 * Convert Base64 identifier to buffer (from libs/posts/apiUtils.ts)
 */
export function base64ToBuffer(base64: string): Uint8Array {
    return new Uint8Array(Buffer.from(base64, 'base64'))
}

/**
 * Convert buffer to Base64 identifier (from libs/posts/apiUtils.ts)
 */
export function bufferToBase64(buffer: Uint8Array): string {
    return Buffer.from(buffer).toString('base64')
}

/**
 * Format timestamp to relative time (from libs/posts/apiUtils.ts)
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

/**
 * Generate a unique avatar URL based on ownerId (from libs/posts/userInfo.ts)
 */
export function generateAvatarUrl(ownerId: string, name?: string): string {
    const color = ownerId.slice(0, 6)
    const background = color.match(/[0-9A-Fa-f]{6}/) ? color : '0ea5e9'
    const userName = name || 'User'
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=${background}&color=fff`
}

/**
 * Get a username from ownerId (fallback when DPNS unavailable)
 * From libs/posts/userInfo.ts
 */
export function getUsernameFromId(ownerId: string): string {
    const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry']
    const hash = Array.from(ownerId).reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return names[hash % names.length] || ''
}

/**
 * Get display name from ownerId (from libs/posts/userInfo.ts)
 */
export function getDisplayNameFromId(ownerId: string): string {
    return getUsernameFromId(ownerId)
}

/**
 * Generate a consistent ID for a post (from libs/posts/transformers.ts)
 */
export function generatePostId(doc: { dataContractId: string; createdAt: string }): string {
    return `${doc.dataContractId.slice(0, 8)}-${doc.createdAt}`
}

/**
 * Apply filters to posts (from libs/posts/api.ts - applyFilters)
 */
export function applyFilters(
    posts: any[],
    options?: {
        ownerId?: string
        language?: string
        fromDate?: number
        toDate?: number
        orderBy?: 'newest' | 'oldest'
        limit?: number
    }
): any[] {
    let filtered = [...posts]
    if (!options) return filtered
    if (options.ownerId) {
        filtered = filtered.filter((post: any) => post.ownerId === options.ownerId)
    }
    if (options.language) {
        filtered = filtered.filter((post: any) => post.language === options.language)
    }
    if (options.fromDate) {
        filtered = filtered.filter((post: any) => post.createdAt >= options.fromDate!)
    }
    if (options.toDate) {
        filtered = filtered.filter((post: any) => post.createdAt <= options.toDate!)
    }
    // Sort
    if (options.orderBy === 'newest') {
        filtered.sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
    } else if (options.orderBy === 'oldest') {
        filtered.sort((a: any, b: any) => a.createdAt.getTime() - b.createdAt.getTime())
    }
    // Limit
    if (options.limit && filtered.length > options.limit) {
        filtered = filtered.slice(0, options.limit)
    }
    return filtered
}
