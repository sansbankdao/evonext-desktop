// src/libs/getTransferKey.ts

/* Import modules. */
import getPrivateKeys from './getPrivateKeys'

export default async (_identityIdx: number) => {
    /* Request (generated) private keys. */
    const generatedKeys = await getPrivateKeys(_identityIdx, false)

    /* Set transfer key. */
    const transferKey = generatedKeys.transferKey

    /* Return wallet import format (WIF). */
    return transferKey.WIF()
}
