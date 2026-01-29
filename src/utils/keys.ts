// src/utils/keys.ts

import type { IPublicKey } from '@/types'

export const generateKeyId = (key: IPublicKey, index: number): string => {
    // Create a unique fingerprint from properties
    const purpose = typeof key.purpose === 'string' ? key.purpose : key.purpose.toString()
    const securityLevel = typeof key.securityLevel === 'string' ? key.securityLevel : key.securityLevel.toString()
    const fingerprint = `${purpose}:${securityLevel}:${key.keyType}:${index}`

    // Optional: Hash it for shorter/more consistent IDs
    // return binToHex(await hash160(new TextEncoder().encode(fingerprint)))
    return fingerprint // Simple string is fine for Vue key
}
