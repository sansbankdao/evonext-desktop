// src/lib/desktop-wasm.ts
//
// Desktop bootstrap for the MAIN-thread wasm SDK service singleton
// (src/lib/services/wasm-sdk-service.ts). The web app initializes the
// service app-wide; on the desktop the ported call sites
// (identity-manager searches, the Transparent pool-balance fetch,
// moves-service readTransparentAddress) run without such a bootstrap, so
// every one of them goes through THIS helper first.
//
// The F37 rule is enforced here: initialize() no-ops when the config
// matches, so a caller MUST compare initializedNetwork() and re-init when
// the network differs — a testnet-initialized service would otherwise
// silently serve testnet data to a mainnet caller.

import { wasmSdkService, getWasmSdk } from '@/lib/services/wasm-sdk-service'
import { EVONEXT_CONTRACT_ID_MAINNET, EVONEXT_CONTRACT_ID_TESTNET } from '@/lib/constants'

type Network = 'mainnet' | 'testnet'

const CONTRACT_IDS: Record<Network, string> = {
    mainnet: EVONEXT_CONTRACT_ID_MAINNET,
    testnet: EVONEXT_CONTRACT_ID_TESTNET,
}

/** Normalize a loose network string ('testnet' | 'mainnet'; anything else
 *  falls back to testnet, matching the web's SSR fallback). */
export const asNetwork = (network: string | undefined | null): Network =>
    network === 'mainnet' ? 'mainnet' : 'testnet'

/** Initialize the wasm sdk service for `network` when needed, then return
 *  the ready WasmSdk instance. Idempotent per network. */
export const ensureWasmSdkService = async (network: Network | string): Promise<any> => {
    const net = asNetwork(network)
    if (wasmSdkService.initializedNetwork() !== net) {
        await wasmSdkService.initialize({ network: net, contractId: CONTRACT_IDS[net] })
    }
    return getWasmSdk()
}
