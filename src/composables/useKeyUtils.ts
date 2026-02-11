// src/composables/useKeyUtils.ts

import type { IPublicKey, PurposeType, SecurityLevelType } from '@/types/identity'
export function useKeyUtils() {
    const generateKeyId = (key: IPublicKey, index: number): string => {
        const purpose = String(key.purpose)
        const securityLevel = String(key.securityLevel)
        const typeStr = key.keyType || 'unknown'
        const keyIdx = key.idx ?? index
        let dataHash = ''
        const rawData = key.data || key.dataBytes
        if (rawData) {
            try {
                const dataStr = typeof rawData === 'string'
                    ? rawData
                    : new TextDecoder().decode(new Uint8Array(rawData as any))
                dataHash = btoa(dataStr).substring(0, 8)
            } catch {
                dataHash = `idx${keyIdx}`
            }
        } else {
            dataHash = `idx${keyIdx}`
        }
        return `${purpose}-${securityLevel}-${typeStr}-${dataHash}`
    }
    const getPurposeLabel = (purpose: number | string): string => {
        const purposeNum = Number(purpose)
        switch(purposeNum) {
            case 0: return 'AUTHENTICATION'
            case 1: return 'ENCRYPTION'
            case 2: return 'DECRYPTION'
            case 3: return 'TRANSFER'
            default: return `Purpose ${purpose}`
        }
    }
    const getSecurityLevelLabel = (level: number | string): string => {
        const levelNum = Number(level)
        switch(levelNum) {
            case 0: return 'MASTER'
            case 1: return 'CRITICAL'
            case 2: return 'HIGH'
            case 3: return 'MEDIUM'
            case 4: return 'LOW'
            default: return `Level ${level}`
        }
    }
    const getSecurityLevelClass = (level: number | string): string => {
        const levelNum = Number(level)
        switch(levelNum) {
            case 0: return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
            case 1: return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
            case 2: return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
            case 3: return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
            case 4: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
        }
    }
    const getKeyBadgeClass = (key: IPublicKey): string => {
        const purpose = Number(key.purpose)
        if (purpose === 1 || purpose === 3) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
        if (purpose === 0) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
        if (purpose === 2) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
    const getKeyTypeShort = (key: IPublicKey): string => {
        const purpose = Number(key.purpose)
        if (purpose === 1 || purpose === 3) return 'TRANSFER'
        if (purpose === 0) return 'AUTH'
        if (purpose === 2) return 'ENCRYPT'
        return 'KEY'
    }
    const hasTransferKey = (publicKeys?: IPublicKey[]): boolean => {
        return publicKeys?.some((key: IPublicKey) => {
            const purpose = Number(key.purpose)
            return purpose === 1 || purpose === 3
        }) || false
    }
    const parsePurpose = (purpose: string | number): PurposeType => {
        const parsed = Number(purpose)
        return (parsed >= 0 && parsed <= 3) ? (parsed as PurposeType) : 0
    }
    const parseSecurityLevel = (level: string | number): SecurityLevelType => {
        const parsed = Number(level)
        return (parsed >= 0 && parsed <= 4) ? (parsed as SecurityLevelType) : 0
    }
    const getIdentityDisplayName = (identity: any): string => {
        if (identity.displayName) return identity.displayName
        if (identity.username) return identity.username.split('.')[0] || 'Unnamed Identity'
        return 'Unnamed Identity'
    }
    const getIdentityInitial = (identity: any): string => {
        return getIdentityDisplayName(identity).charAt(0).toUpperCase()
    }
    return {
        generateKeyId,
        getPurposeLabel,
        getSecurityLevelLabel,
        getSecurityLevelClass,
        getKeyBadgeClass,
        getKeyTypeShort,
        hasTransferKey,
        parsePurpose,
        parseSecurityLevel,
        getIdentityDisplayName,
        getIdentityInitial
    }
}
