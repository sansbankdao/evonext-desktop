// src/libs/sendToken.ts

/* Import modules. */
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKeyWASM } from 'pshenmic-dpp'

import getNetwork from './getNetwork'
import getTransferKey from './getTransferKey'
import {
    ITxError,
    ITxSuccess,
} from './types'

export default async (
    _identityId: string,
    _identityIdx: number,
    _tokenId: string,
    _receiver: string,
    _atomicUnits: bigint,
): Promise<ITxSuccess | ITxError> => {
    /* Request network. */
    const network = await getNetwork()

    /* Initialize Dash Platform SDK. */
    const sdk = new DashPlatformSDK({ network })

    /* Initialize token base transition. */
    const tokenBaseTransition = await sdk.tokens
        .createBaseTransition(_tokenId, _identityId)

    /* Initialize state transition. */
    const stateTransition = sdk.tokens
        .createStateTransition(
            tokenBaseTransition,
            _identityId,
            'transfer',
            {
                identityId: _receiver,
                amount: _atomicUnits,
            },
        )

    /* Request transfer (WIF) key. */
    const transferWif = await getTransferKey(_identityIdx)

    /* Set private (transfer) key. */
    const privKey = PrivateKeyWASM.fromWIF(transferWif)

    /* Request identity. */
    const identity = await sdk.identities.getIdentityByIdentifier(_identityId)

    /* Set public keys. */
    const identityPublicKeys = identity.getPublicKeys()

    /* Set public key ID. */
    const publicKeyId = 3 // 03 => Transfer (Critical)

    /* Set public key. */
    const pubKey = identityPublicKeys[publicKeyId]

    /* Sign state transition. */
    stateTransition.sign(privKey, pubKey)

    /* Broadcast state transition. */
    await sdk.stateTransitions.broadcast(stateTransition)

    /* Wait for confirmation. */
    await sdk.stateTransitions.waitForStateTransitionResult(stateTransition)

    /* Return transaction ID. */
    return { txid: stateTransition.hash(false) }
}
