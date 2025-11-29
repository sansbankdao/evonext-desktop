// src/libs/sendCredit.ts

/* Import modules. */
import { base64 } from '@scure/base'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKeyWASM } from 'pshenmic-dpp'

import getNetwork from './getNetwork'
import getTransferKey from './getTransferKey'
import {
    // IKeyTypes,
    ITxError,
    ITxSuccess,
    // ITokenPaymentInfo,
} from './types'

// NOTE: Minimum credit transfer amount enforced by the protocol (0.001 DASH).
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

    /* Request identity nonce. */
    const identityNonce = await sdk.identities.getIdentityNonce(_identityId)

    /* Create unsigned identity credit transfer state transition. */
    const stateTransition = sdk.identities.createStateTransition('creditTransfer', {
        identityId: _identityId,
        amount: amountInCredits,
        recipientId: _receiver,
        identityNonce: identityNonce + BigInt(1)
    })

/* Request transfer (WIF) key. */
const transferWif = await getTransferKey(_identityIdx)
console.log('GET TRANSFER KEY (WIF)', transferWif)
const KEY_ID = 3

    // stateTransition.signByPrivateKey(PrivateKeyWASM.fromHex(privateKey, network), KEY_ID, 'ECDSA_SECP256K1')
    // stateTransition.signByPrivateKey(PrivateKeyWASM.fromWIF(transferWif), KEY_ID, 'ECDSA_SECP256K1')
    stateTransition.signByPrivateKey(
        PrivateKeyWASM.fromWIF(transferWif), KEY_ID, 'ECDSA_HASH160')

    // stateTransition.signaturePublicKeyId = KEY_ID

    /* Execute state transition. */
    await sdk.stateTransitions.broadcast(stateTransition)

    /* Wait for confirmation. */
    await sdk.stateTransitions.waitForStateTransitionResult(stateTransition)

    /* Return transaction ID. */
    return { txid: stateTransition.hash(false) }
}
