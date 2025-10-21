/* Import modules. */
import { DashPlatformSDK } from 'dash-platform-sdk'
import { GasFeesPaidByWASM, PrivateKeyWASM } from 'pshenmic-dpp'

import getAuthKey from './getAuthKey'
import getTransferKey from './getTransferKey'
import {
    IKeyTypes,
    ITxError,
    ITxSuccess,
    ITokenPaymentInfo,
} from './types'

export const sendToken = async (
    _network: string,
    _identityId: string,
    _identityIdx: number,
    _tokenId: string,
    _receiver: string,
    _atomicUnits: bigint,
): Promise<ITxSuccess | ITxError> => {
    /* Initialize locals. */
    let sdk

    /* Handle network. */
    if (_network === 'mainnet') {
        /* Initialize Dash Platform SDK. */
        sdk = new DashPlatformSDK({ network: 'mainnet' })
    } else {
        /* Initialize Dash Platform SDK. */
        sdk = new DashPlatformSDK({ network: 'testnet' })
    }

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
    const authWif = await getAuthKey(_network, _identityIdx)
console.log('authWif', authWif)

    /* Request transfer (WIF) key. */
    const transferWif = await getTransferKey(_network, _identityIdx)
console.log('transferWif', transferWif)
    /* Set private (transfer) key. */
    const privKey = PrivateKeyWASM.fromWIF(transferWif)
    // const privKey = PrivateKeyWASM.fromHex(transferWif, 'testnet')
console.log('privKey', privKey)
    /* Set identity. */
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
