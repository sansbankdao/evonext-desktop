// src/libs/createDocument.ts

/* Import modules. */
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKeyWASM } from 'pshenmic-dpp'

import getNetwork from './getNetwork'
import getTransferKey from './getTransferKey'
import {
    // IKeyTypes,
    ITxError,
    ITxSuccess,
    ITokenPaymentInfo,
} from './types'

export default async (
    _identityIdx: number,
    _identityId: string,
    _dataContract: string,
    _tokenPaymentInfo: ITokenPaymentInfo,
    _receiver: string,
    _atomicUnits: bigint,
): Promise<ITxSuccess | ITxError> => {
    /* Request network. */
    const network = await getNetwork()

    /* Initialize Dash Platform SDK. */
    const sdk = new DashPlatformSDK({ network })

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
    const transferWif = await getTransferKey(_identityIdx)

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
