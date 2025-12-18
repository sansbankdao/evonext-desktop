// src/libs/keys/getTransferKey.ts

/* Import modules. */
import getPrivateKeys from './getPrivateKeys'
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
        console.error('[GET_TRANSFER_KEY] No active identity found')
        return null
    }
    /* Check if identity has TRANSFER key. */
    const hasTransferKey = identity.publicKeys?.some(key =>
        key.purpose === 1 // 1 = TRANSFER
    )
    if (!hasTransferKey) {
        console.warn('[GET_TRANSFER_KEY] Identity does NOT have a TRANSFER key registered')
        console.warn('[GET_TRANSFER_KEY] Public keys available:', identity.publicKeys?.map(k => ({
            purpose: k.purpose,
            securityLevel: k.securityLevel,
            keyType: k.keyType
        })))
        // TODO: Trigger UI notification/redirect
        // This should be handled by the caller
        return null
    }
    /* Set transfer key. */
    const transferKey = generatedKeys.transferKey
    /* Return wallet import format (WIF). */
    return transferKey.WIF()
}
