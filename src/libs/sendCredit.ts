import getTransferKey from './getTransferKey'
import {
    IKeyTypes,
    ITxError,
    ITxSuccess,
    ITokenPaymentInfo,
} from './types'
import { WasmSdkBuilder } from './dash/wasm_sdk'

export default async (
    _network: string,
    _identityId: string,
    _identityIdx: number,
    _receiver: string,
    _credits: bigint,
): Promise<ITxSuccess | ITxError> => {
    /* Initialize locals. */
    let error
    let response
    let sdk
    let txid

    /* Set receiver. */
    // TODO ADD FINAL RECEIVER VALIDATION
    const receiver = _receiver

    /* Set credits. */
    // TODO ADD FINAL CREDITS VALIDATION
    const credits = BigInt(_credits)

    /* Request transfer (WIF) key. */
    const transferWif = await getTransferKey(_network, _identityIdx)
console.log('GET TRANSFER KEY', transferWif)
    /* Handle network. */
    if (_network === 'mainnet') {
        /* Initialize SDK. */
        sdk = await WasmSdkBuilder.new_mainnet_trusted().build()
    } else {
        /* Initialize SDK. */
        sdk = await WasmSdkBuilder.new_testnet_trusted().build()
    }
console.log('IDENTITY ID', _identityId)
    /* Transfer credits. */
    const txResult = await sdk.identityCreditTransfer(
        _identityId,
        _receiver,
        credits,
        transferWif,
        null // key_id - will auto-select
    )
console.log('WALLET MANGAER (tx result)', txResult)

    /* Return transaction (result) ID. */
    return { txid: txResult?.txid || 'UNKNOWN TXID' }
}
