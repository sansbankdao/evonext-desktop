/* Import modules. */
import init, {
    WasmSdkBuilder,
    // derive_key_from_seed_with_path,
    get_identities_token_balances_with_proof_info,
    prefetch_trusted_quorums_mainnet,
    prefetch_trusted_quorums_testnet,
} from './dash/wasm_sdk'

export default async (
    identityIds: [string],
    _tokenId: string,
    _network: string,
): Promise<bigint> => {
    /* Initialize SDK. */
    await init()
    // const sdk = await wasmSdkService.getSdk()

    let sdk
    if (_network === 'mainnet') {
        /* Pre-fetch (trusted) quorums. */
        await prefetch_trusted_quorums_mainnet()

        /* Initialize SDK. */
        sdk = await WasmSdkBuilder.new_mainnet_trusted().build()
    } else {
        /* Pre-fetch (trusted) quorums. */
        await prefetch_trusted_quorums_testnet()

        /* Initialize SDK. */
        sdk = await WasmSdkBuilder.new_testnet_trusted().build()
    }

    /* Request TOKEN balance. */
    const response = await get_identities_token_balances_with_proof_info(
        sdk, identityIds, _tokenId)
console.log('getTokenBalance (response)', response)

    /* Validate response. */
    if (typeof response !== 'undefined' && response !== null && response.data.length > 0) {
        /* Set TOKEN balance. */
        const balance = BigInt(response.data[0].balance)
console.log('getTokenBalance (balance)', balance)

        /* Return TOKEN balance. */
        return balance
    }

    /* Return default. */
    return BigInt(0)
}
