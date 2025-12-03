// src/libs/sendCredit.ts

/* Import modules. */
// import { base64 } from '@scure/base'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKeyWASM } from 'pshenmic-dpp'

import getNetwork from './getNetwork'
import getTransferKey from './getTransferKey'
import {
    // IKeyTypes,
    ITxError,
    ITxSuccess,
    // ITokenPaymentInfo,
} from '@/types'

// NOTE: Minimum credit transfer amount enforced by the protocol (0.000001 DASH).
const MIN_CREDIT_TRANSFER = BigInt(100000)

export default async (
    _identityId: string,
    _identityIdx: number,
    _receiver: string,
    _credits: bigint,
): Promise<ITxSuccess | ITxError> => {
    /* Request network. */
    const network = await getNetwork()

    /* Initialize SDK. */
    const sdk = new DashPlatformSDK({ network })

    /* Set amount (in credits). */
    const amountInCredits = _credits

    // Validate minimum credit transfer amount
    if (amountInCredits < MIN_CREDIT_TRANSFER) {
    //   setError(`Minimum credit transfer amount is ${MIN_CREDIT_TRANSFER.toLocaleString()} credits`)
        return {
            code: 400,
            message: `Minimum credit transfer amount is ${MIN_CREDIT_TRANSFER.toLocaleString()} credits`,
        }
    }

    /* Request transfer (WIF) key. */
    const transferWif = await getTransferKey(_identityIdx)

    /* Set private (transfer) key. */
    const privKey = PrivateKeyWASM.fromWIF(transferWif)

    /* Request identity. */
    const identity = await sdk.identities.getIdentityByIdentifier(_identityId)

    /* Request identity nonce. */
    const identityNonce = await sdk.identities.getIdentityNonce(_identityId)

    /* Create unsigned identity credit transfer state transition. */
    const stateTransition = sdk.identities.createStateTransition('creditTransfer', {
        identityId: _identityId,
        amount: amountInCredits,
        recipientId: _receiver,
        identityNonce: identityNonce + BigInt(1) // FIXME MAYBE INCREMENT MANUALLY??
    })

    /* Set public keys. */
    const identityPublicKeys = identity.getPublicKeys()

    /* Set public key ID. */
    const publicKeyId = 3 // 03 => Transfer (Critical)

    /* Set public key. */
    const pubKey = identityPublicKeys[publicKeyId]

    /* Sign state transition. */
    stateTransition.sign(privKey, pubKey)

    /* Execute state transition. */
    await sdk.stateTransitions.broadcast(stateTransition)

    /* Wait for confirmation. */
    await sdk.stateTransitions.waitForStateTransitionResult(stateTransition)

    /* Return transaction ID. */
    return { txid: stateTransition.hash(false) }
}
