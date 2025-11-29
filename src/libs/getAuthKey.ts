// src/libs/getTransferKey.ts

/* Import modules. */
import getPrivateKeys from './getPrivateKeys'

/* Set constants. */
const DEFAULT_SECURITY_LEVEL = 0

export default async (
    _identityIdx: number,
    _securityLevel: number = DEFAULT_SECURITY_LEVEL,
): Promise<string> => {
    /* Initialize locals. */
    let transferKey

    /* Request (generated) private keys. */
    const generatedKeys = await getPrivateKeys(_identityIdx, false)

    /* Set transfer key. */
    if (_securityLevel === DEFAULT_SECURITY_LEVEL) {
        transferKey = generatedKeys.authCritical
    } else {
        transferKey = generatedKeys.authHigh
    }

    /* Return wallet import format (WIF). */
    return transferKey.WIF()
}
