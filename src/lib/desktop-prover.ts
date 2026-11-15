// src/lib/desktop-prover.ts
//
// Desktop prover transport (evonext-desktop). The prover
// (https://prover.sansbank.dev) answers NO CORS preflight — a Tauri
// webview fetch dies exactly like the browser one did (evonext.app F40),
// so the frame travels through Tauri IPC to the Rust side
// (command `shielded_prove_pczt`, reqwest POST —
// src-tauri/src/commands/shielded_commands.rs) and the prover's JSON body
// comes back verbatim. Installed ONCE on the main thread; the shielded
// engine worker RPC-hops through the engine client's 'proveRequest'
// handler, which calls the same transport.

import { invoke } from '@tauri-apps/api/core'
import { setProverTransport, type ProverTransportResponse } from '@/lib/shielded/prove'

/** The prover's JSON body shape (see prove.ts §Prover transport). */
interface ProverBody {
    response?: string
    meta?: Record<string, unknown>
    error?: string
    errorCode?: number
    detail?: string
    [key: string]: unknown
}

/** What the Rust command returns: HTTP status + parsed body verbatim. */
interface ShieldedProveIpcResult {
    status: number
    body: ProverBody
}

/** Invoke-based ProverTransport. Errors from invoke (network/TLS/timeout
 *  on the Rust side) propagate as rejected promises — postPcztFrame's
 *  3-attempt network retry wraps this. */
export const desktopProverTransport = async (frameBytes: Uint8Array): Promise<ProverTransportResponse> => {
    const result = await invoke<ShieldedProveIpcResult>('shielded_prove_pczt', {
        // Structured-clone-safe: number[] survives the IPC boundary; the
        // Rust side treats it as Vec<u8>.
        frame: Array.from(frameBytes),
    })
    const ok = result.status >= 200 && result.status < 300 && !result.body.error
    return { ok, status: result.status, bodyJson: result.body }
}

/** Install the desktop transport on the MAIN thread. Idempotent — the
 *  hook is module state in prove.ts. */
export const installDesktopProverTransport = (): void => {
    setProverTransport(desktopProverTransport)
}
