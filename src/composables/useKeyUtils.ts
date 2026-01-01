// src/composables/useKeyUtils.ts

import type { IPublicKey, PurposeType, SecurityLevelType } from '@/types'

export function useKeyUtils() {
    // Generate stable unique ID for a public key
    const generateKeyId = (key: IPublicKey, index: number): string => {
        const purpose = typeof key.purpose === 'string' ? key.purpose : key.purpose.toString()
        const securityLevel = typeof key.securityLevel === 'string' ? key.securityLevel : key.securityLevel.toString()
        const typeStr = (key as any).type || key.keyType || 'unknown'

        // Create a simple hash from the data if available
        let dataHash = ''
        if (key.data) {
            try {
                // Convert to string and take first 8 chars of base64
                const dataStr = typeof key.data === 'string'
                    ? key.data
                    : new TextDecoder().decode(new Uint8Array(key.data))
                dataHash = btoa(dataStr).substring(0, 8)
            } catch {
                // If can't decode, use index as hash
                dataHash = `idx${index}`
            }
        } else {
            dataHash = `idx${index}`
        }

        return `${purpose}-${securityLevel}-${typeStr}-${dataHash}`
    }

    // Convert purpose to label
    const getPurposeLabel = (purpose: number | string): string => {
        const purposeNum = typeof purpose === 'string' ? parseInt(purpose) : purpose
        switch(purposeNum) {
            case 0: return 'AUTHENTICATION'
            case 1: return 'TRANSFER'
            case 2: return 'ENCRYPTION'
            case 3: return 'TRANSFER'
            default: return `Purpose ${purpose}`
        }
    }
    // Convert security level to label
    const getSecurityLevelLabel = (level: number | string): string => {
        const levelNum = typeof level === 'string' ? parseInt(level) : level
        switch(levelNum) {
            case 0: return 'MASTER'
            case 1: return 'CRITICAL'
            case 2: return 'HIGH'
            case 3: return 'MEDIUM'
            case 4: return 'LOW'
            default: return `Level ${level}`
        }
    }
    // Get CSS class for security level
    const getSecurityLevelClass = (level: number | string): string => {
        const levelNum = typeof level === 'string' ? parseInt(level) : level
        switch(levelNum) {
            case 0: return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
            case 1: return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
            case 2: return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
            case 3: return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
            case 4: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
        }
    }
    // Get CSS class for key badge
    const getKeyBadgeClass = (key: IPublicKey): string => {
        const purpose = typeof key.purpose === 'string' ? parseInt(key.purpose) : key.purpose
        if (purpose === 1 || purpose === 3) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
        if (purpose === 0) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
        if (purpose === 2) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
    // Get short key type label
    const getKeyTypeShort = (key: IPublicKey): string => {
        const purpose = typeof key.purpose === 'string' ? parseInt(key.purpose) : key.purpose
        if (purpose === 1 || purpose === 3) return 'TRANSFER'
        if (purpose === 0) return 'AUTH'
        if (purpose === 2) return 'ENCRYPT'
        return 'KEY'
    }
    // Check if keys array contains a transfer key
    const hasTransferKey = (publicKeys?: IPublicKey[]): boolean => {
        return publicKeys?.some((key: IPublicKey) => {
            const purpose = typeof key.purpose === 'string' ? parseInt(key.purpose) : key.purpose
            return purpose === 1 || purpose === 3
        }) || false
    }
    // Parse purpose string/number to enum
    const parsePurpose = (purpose: string | number): PurposeType => {
        if (typeof purpose === 'string') {
            const parsed = parseInt(purpose)
            if (parsed === 0 || parsed === 1 || parsed === 2 || parsed === 3) {
                return parsed as PurposeType
            }
            return 0 // Default to AUTHENTICATION
        }
        return purpose as PurposeType
    }
    // Parse security level string/number to enum
    const parseSecurityLevel = (level: string | number): SecurityLevelType => {
        if (typeof level === 'string') {
            const parsed = parseInt(level)
            if (parsed >= 0 && parsed <= 4) {
                return parsed as SecurityLevelType
            }
            return 0 // Default to MASTER
        }
        return level as SecurityLevelType
    }
    // Get identity display name
    const getIdentityDisplayName = (identity: any): string => {
        if (identity.display_name) return identity.display_name
        if (identity.displayName) return identity.displayName
        if (identity.username) return identity.username.split('.')[0] || 'Unnamed Identity'
        return 'Unnamed Identity'
    }
    // Get identity initial for avatar
    const getIdentityInitial = (identity: any): string => {
        const name = getIdentityDisplayName(identity)
        return name.charAt(0).toUpperCase()
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
