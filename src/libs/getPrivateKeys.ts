// src/libs/getPrivateKeys.ts
import { getPrivateKeyManager } from './keys/PrivateKeyManager'
import type { KeyDerivationResult } from '@/types'

export default async (
    identityIdx: number,
    queryRegistry: boolean = false
): Promise<KeyDerivationResult> => {
    const manager = getPrivateKeyManager()
    return manager.getPrivateKeys(identityIdx, queryRegistry)
}
