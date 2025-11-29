// src/libs/sendToken.ts

/* Import modules. */
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKeyWASM } from 'pshenmic-dpp'

import getAuthKeys from './getAuthKeys'
import getNetwork from './getNetwork'
import getTransferKeys from './getTransferKeys'
import {
    // IKeyTypes,
    ITxError,
    ITxSuccess,
    // ITokenPaymentInfo,
} from './types'

export const sendToken = async (
    _identityId: string,
    _identityIdx: number,
    _tokenId: string,
    _receiver: string,
    _atomicUnits: bigint,
): Promise<ITxSuccess | ITxError> => {
    /* Initialize locals. */
    let response

    /* Request network. */
    const network = await getNetwork()

    /* Initialize Dash Platform SDK. */
    const sdk = new DashPlatformSDK({ network })

    /* Set transfer amount. */
    // const amount = BigInt(_satoshis)
console.log('TOKEN ID', _tokenId)
console.log('IDENTITY ID', _identityId)
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
    response = await getAuthKeys(_identityIdx)
    const authWif = response[0]
console.log('authWif', authWif)

    /* Request transfer (WIF) key. */
    response = await getTransferKeys(_identityIdx)
    const transferWif = response[0]
console.log('transferWif', transferWif)

    /* Set private (transfer) key. */
    const privKey = PrivateKeyWASM.fromWIF(transferWif)
    // const privKey = PrivateKeyWASM.fromHex(transferWif, 'testnet')
console.log('privKey', privKey)

    /* Request identity. */
    const identity = await sdk.identities.getIdentityByIdentifier(_identityId)

    /* Set public keys. */
    const identityPublicKeys = identity.getPublicKeys()
// console.log('PUBLIC KEYS', identityPublicKeys)

    /* Set public key ID. */
    const publicKeyId = 3 // 03 => Transfer (Critical)

    /* Set public key. */
    const pubKey = identityPublicKeys[publicKeyId]
// console.log('PUB KEY', pubKey)
    // stateTransition.signByPrivateKey(PrivateKeyWASM.fromHex(privateKey, 'testnet'), 'ECDSA_SECP256K1')
    // stateTransition.signByPrivateKey(PrivateKeyWASM.fromWIF(transferWif), publicKeyId, 'ECDSA_HASH160')
    // stateTransition.signByPrivateKey(PrivateKeyWASM.fromHex(transferWif, 'testnet'), undefined, 'ECDSA_HASH160')

    /* Assign public key ID. */
// NOTE IS THIS STILL NECESSARY??
    // stateTransition.signaturePublicKeyId = publicKeyId

    /* Sign state transition. */
    stateTransition.sign(privKey, pubKey)

    /* Broadcast state transition. */
    await sdk.stateTransitions.broadcast(stateTransition)

    // FIXME FIND A WAY TO REQUEST TXID
    return { txid: 'UNKNOWN TXID' }
}
