// src/libs/keys/getAuthKey.ts
/* Import modules. */
import getPrivateKeys from '../getPrivateKeys'
import { useIdentityStore } from '@/stores/identity'
export default async (_identityIdx: number): Promise<string | null> => {
    /* Request (generated) private keys. */
    const generatedKeys = await getPrivateKeys(_identityIdx, false)
    /* Get identity store. */
    const identityStore = useIdentityStore()
    /* Get current identity. */
    const identity = identityStore.identity
    /* Validate identity. */
    if (!identity) {
        console.error('[GET_AUTH_KEY] No active identity found')
        return null
    }
    /* Find MASTER AUTHENTICATION key. */
    const masterAuthKey = identity.publicKeys?.find(key =>
        key.purpose === 0 && // 0 = AUTHENTICATION
        key.securityLevel === 0 // 0 = MASTER
    )
    if (!masterAuthKey) {
        console.error('[GET_AUTH_KEY] Identity has no MASTER AUTHENTICATION key')
        console.error('[GET_AUTH_KEY] This is a critical error - identity likely corrupted')
        return null
    }
    /* Return MASTER private key WIF. */
    const authKey = generatedKeys.masterKey
    return authKey.WIF()
}
