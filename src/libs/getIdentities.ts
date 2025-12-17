// src/libs/getIdentities.ts
import { getIdentityManager } from './identity/IdentityManager'
import type { IIdentity } from '@/types'
export default async (): Promise<IIdentity[] | null> => {
    const manager = getIdentityManager()
    return manager.getIdentities()
}
// Export the search functions for backward compatibility
export { searchByHash160, searchBySecp256k1 } from './identity/IdentityManager'
