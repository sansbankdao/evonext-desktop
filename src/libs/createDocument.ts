/* Import modules. */
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKeyWASM } from 'pshenmic-dpp'

import getTransferKey from './getTransferKey'
import {
    // IKeyTypes,
    ITxError,
    ITxSuccess,
    ITokenPaymentInfo,
} from './types'

export default async (
    _network: string,
    _identityIdx: number,
    _identityId: string,
    _dataContract: string,
    _tokenPaymentInfo: ITokenPaymentInfo,
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

    /* Set data contract. */
    // TODO ADD FINAL DATA CONTRACT VALIDATION
    const dataContract = _dataContract

    /* Set document type. */
    // TODO ADD FINAL DOCUMENT TYPE VALIDATION
    const documentType = ''

    /* Set (document) data. */
    const data = {}

    /* Create document. */
    const document = sdk.documents
        .create(dataContract, documentType, data, _identityId)

    /* Set identity contract nonce. */
// FIXME IS THIS STILL NECESSARY??
    const identityContractNonce = BigInt(1)

    // const tokenPaymentInfo = {
    //     tokenContractId: '...',
    //     tokenContractPosition: 0,
    //     maximumTokenCost: BigInt(10),
    //     gasFeesPaidBy: GasFeesPaidByWASM.ContractOwner,
    // }

    /* Create state transition. */
    const stateTransition = sdk.documents.createStateTransition(
        document,
        'create',
        {
            identityContractNonce,
            tokenPaymentInfo: _tokenPaymentInfo,
        },
    )

    /* Request transfer (WIF) key. */
    const transferWif = await getTransferKey(_network, _identityIdx)

    /* Set private (transfer) key. */
    const privKey = PrivateKeyWASM.fromWIF(transferWif)

    /* Set identity. */
    const identity = await sdk.identities.getIdentityByIdentifier(_identityId)

    /* Set public keys. */
    const identityPublicKeys = identity.getPublicKeys()
// console.log('PUBLIC KEYS', identityPublicKeys)

    /* Set public key ID. */
    const publicKeyId = 3 // 03 => Transfer (Critical)

    /* Set public key. */
    const pubKey = identityPublicKeys[publicKeyId]

    /* Sign state transition. */
    stateTransition.sign(privKey, pubKey)

    /* Broadcast state transition. */
    await sdk.stateTransitions.broadcast(stateTransition)

    // FIXME FIND A WAY TO REQUEST TXID
    return { txid: 'UNKNOWN TXID' }
}
