// src/libs/getIdentities.ts

/* Import modules. */
import { getIdentityManager } from './identity/IdentityManager'
import type { IIdentity } from '@/types'

export default async (): Promise<IIdentity[] | null> => {
    const manager = getIdentityManager()
    return manager.getIdentities()
}

// Remove problematic exports since methods are private
// export { searchByHash160, searchBySecp256k1 } from './identity/IdentityManager'
