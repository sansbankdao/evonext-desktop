// src/services/posts/utils.ts
import {
    EVONEXT_CONTRACT_ID_TESTNET,
    EVONEXT_CONTRACT_ID_MAINNET,
    DASHPAY_CONTRACT_ID_MAINNET,
    DASHPAY_CONTRACT_ID_TESTNET,
    DPNS_CONTRACT_ID_MAINNET,
    DPNS_CONTRACT_ID_TESTNET
} from '@/constants'
import type { IPostDocument } from '@/types/posts'
/**
 * PURE JS BASE58 IMPLEMENTATION
 */
export const Base58 = {
    ALPHABET: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
    ALPHABET_MAP: {} as Record<string, number>,
    init() {
        if (Object.keys(this.ALPHABET_MAP).length === 0) {
            for (let i = 0; i < this.ALPHABET.length; i++) {
                this.ALPHABET_MAP[this.ALPHABET.charAt(i)] = i
            }
        }
    },
    encode(buffer: Uint8Array): string {
        this.init()
        const digits: number[] = [0]
        for (let i = 0; i < buffer.length; i++) {
            let carry = buffer[i] as number
            for (let j = 0; j < digits.length; ++j) {
                carry += (digits[j] as number) << 8
                digits[j] = carry % 58
                carry = (carry / 58) | 0
            }
            while (carry > 0) {
                digits.push(carry % 58)
                carry = (carry / 58) | 0
            }
        }
        let result = ''
        for (let i = 0; i < buffer.length && buffer[i] === 0; i++) result += '1'
        for (let i = digits.length - 1; i >= 0; i--) {
            const digit = digits[i]
            if (digit !== undefined) result += this.ALPHABET[digit]
        }
        return result
    }
}
export function ensureBase58(id: string): string {
    if (!id) return id
    if (id.length === 44 && id.endsWith('=') || id.includes('+') || id.includes('/')) {
        try {
            const binaryString = atob(id)
            const bytes = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i)
            return Base58.encode(bytes)
        } catch (e) {
            return id
        }
    }
    return id
}
export function normalizeDocument(doc: any): IPostDocument {
    const data = typeof doc.toJSON === 'function' ? doc.toJSON() : doc
    return {
        ...data,
        ownerId: data.$ownerId || data.ownerId,
        contractId: data.$dataContractId || data.dataContractId || data.contractId,
        dataContractId: data.$dataContractId || data.dataContractId,
        createdAt: data.$createdAt || data.createdAt,
        updatedAt: data.$updatedAt || data.updatedAt,
        documentTypeName: data.$type || data.documentTypeName || 'post',
        revision: data.$revision || data.revision,
        content: data.content || '',
        language: data.language || 'en',
        isSensitive: data.sensitive ?? data.isSensitive ?? false,
        mediaUrl: data.mediaUrl || null,
        remix: data.remix || undefined
    }
}
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
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
export function generateAvatarUrl(ownerId: string, name?: string): string {
    const color = ownerId.slice(0, 6)
    const background = color.match(/[0-9A-Fa-f]{6}/) ? color : '0ea5e9'
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=${background}&color=fff`
}
