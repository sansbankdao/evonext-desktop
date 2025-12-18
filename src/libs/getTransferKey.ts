// Updated src/libs/keys/getTransferKey.ts
/* Import modules. */
import getPrivateKeys from './getPrivateKeys'
import { useIdentityStore } from '@/stores/identity'
import { KeychainManager } from './keys/KeychainManager'
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
    /* Load keychain. */
    const keychain = await KeychainManager.loadKeychain(identity.id!, _identityIdx)
    /* Check keychain for TRANSFER key registration. */
    if (keychain) {
        const transferKeys = keychain.keys[1] // Purpose 1 = TRANSFER
        if (transferKeys) {
            // Check if any TRANSFER key is registered
            const registeredTransferKey = Object.values(transferKeys).find((key: any) => key.registered)
            if (!registeredTransferKey) {
                console.warn('[GET_TRANSFER_KEY] Identity has keychain but NO TRANSFER key registered')
                // Get missing keys to help user
                const missingKeys = await KeychainManager.getMissingKeys(identity.id!)
                const missingTransfer = missingKeys.find(k => k.purpose === 1)
                if (missingTransfer) {
                    console.warn('[GET_TRANSFER_KEY] Missing TRANSFER key details:', missingTransfer)
                    // TODO: Trigger UI notification with specifics
                }
                return null
            }
            // TRANSFER key exists in keychain and is registered
            // Return the derived key (index 3 in our default)
            const transferKey = generatedKeys.transferKey
            return transferKey.WIF()
        }
    }
    /* Fallback: Check identity's public keys directly. */
    const hasTransferKey = identity.publicKeys?.some(key =>
        key.purpose === 1 // 1 = TRANSFER
    )
    if (!hasTransferKey) {
        console.warn('[GET_TRANSFER_KEY] Identity does NOT have a TRANSFER key registered')
        // Save keychain if not already saved
        if (identity.publicKeys?.length > 0 && !keychain) {
            await KeychainManager.saveKeychain(identity.id!, _identityIdx, identity.publicKeys)
        }
        return null
    }
    /* Identity has TRANSFER key but no keychain entry (shouldn't happen). */
    console.warn('[GET_TRANSFER_KEY] Identity has TRANSFER key but no keychain entry')
    /* Save keychain. */
    if (identity.publicKeys?.length > 0) {
        await KeychainManager.saveKeychain(identity.id!, _identityIdx, identity.publicKeys)
    }
    /* Return transfer key. */
    const transferKey = generatedKeys.transferKey
    return transferKey.WIF()
}
