// src/services/platform.ts

/**
 * Shared EvoSDK (DCG official SDK, v4.x) signing helpers.
 *
 * Call flow mirrors the verified evonext-mobile WebView bridge
 * (evonext-mobile/assets/wasm/bridge.html):
 *   1. connect via EvoSDK.*Trusted() (trusted context — untrusted quorum
 *      verification fails on mainnet without prefetch)
 *   2. fetch the identity, resolve the signing public key (by keyId, else
 *      first CRITICAL/HIGH/MEDIUM key)
 *   3. build an IdentitySigner from the WIF private key
 *   4. call the facade with an options object — privateKeyWif/keyId are NOT
 *      part of the v4 wire structs
 */

import {
    EvoSDK,
    IdentitySigner,
    BatchTransition,
    BatchedTransition,
    CoreScript,
    PrivateKey,
} from '@dashevo/evo-sdk'
import type {
    BatchedTransitionLike,
    Identity,
    IdentityPublicKey,
    StateTransition,
} from '@dashevo/evo-sdk'
import { base58 } from '@scure/base'

/** Connect an EvoSDK instance for the given network (trusted context). */
export async function connectEvoSdk(network: string): Promise<EvoSDK> {
    const sdk = network === 'mainnet' ? EvoSDK.mainnetTrusted() : EvoSDK.testnetTrusted()
    await sdk.connect()
    return sdk
}

/**
 * Resolve the on-chain identity plus the public key used for signing.
 * Matches by keyId when provided; otherwise falls back to the first key with
 * a CRITICAL/HIGH/MEDIUM security level (same rule as the mobile bridge).
 */
export async function resolveSigningContext(
    sdk: EvoSDK,
    identityId: string,
    keyId?: number
): Promise<{ identity: Identity; identityKey: IdentityPublicKey }> {
    const identity = await sdk.identities.fetch(identityId)
    if (!identity) throw new Error(`Identity not found for signing: ${identityId}`)
    let identityKey: IdentityPublicKey | undefined
    if (keyId !== undefined && keyId !== null) {
        identityKey = identity.getPublicKeyById(keyId)
    } else {
        identityKey = identity.publicKeys.find((pk: IdentityPublicKey) => {
            const level = pk.securityLevel
            return level === 'CRITICAL' || level === 'HIGH' || level === 'MEDIUM'
        })
    }
    if (!identityKey) {
        throw new Error(`No suitable identity key found for ${identityId} keyId=${keyId}`)
    }
    return { identity, identityKey }
}

/** Build an IdentitySigner from a WIF-encoded private key. */
export function signerFromWif(wif: string): IdentitySigner {
    const signer = new IdentitySigner()
    signer.addKeyFromWif(wif)
    return signer
}

/**
 * Raw-transition helpers
 * ----------------------
 * The v4 facades (documents.create, identities.creditTransfer, ...) resolve
 * with results (balances / nonce / void), never the broadcast transition
 * hash. To surface REAL on-chain transaction hashes we build the transition
 * ourselves, sign it, broadcast via the connected WasmSdk, and hash it —
 * the same flow the v3 code used (stateTransition.hash(false)).
 */

export async function nextIdentityNonce(sdk: EvoSDK, identityId: string): Promise<bigint> {
    const w = await sdk.getWasmSdkConnected()
    const nonce = await w.getIdentityNonce(identityId)
    return (nonce ?? 0n) + 1n
}

export async function nextIdentityContractNonce(
    sdk: EvoSDK,
    identityId: string,
    contractId: string
): Promise<bigint> {
    const w = await sdk.getWasmSdkConnected()
    const nonce = await w.getIdentityContractNonce(identityId, contractId)
    return (nonce ?? 0n) + 1n
}

/** Wraps document/token transitions into a Batch state transition. */
export function batchStateTransition(
    transitions: BatchedTransitionLike[],
    ownerId: string
): StateTransition {
    const batched = transitions.map((t) => new BatchedTransition(t))
    return BatchTransition.fromBatchedTransitions(batched, ownerId, 0).toStateTransition()
}

/**
 * Signs (signaturePublicKeyId set BEFORE sign, as in the v3 code), broadcasts,
 * waits for the proof, and returns the real transition hash.
 */
export async function signBroadcastAndHash(
    sdk: EvoSDK,
    stateTransition: StateTransition,
    wif: string,
    identityKey: IdentityPublicKey
): Promise<string> {
    const w = await sdk.getWasmSdkConnected()
    const privateKey = PrivateKey.fromWIF(wif)
    stateTransition.signaturePublicKeyId = identityKey.keyId
    stateTransition.sign(privateKey, identityKey)
    await w.broadcastAndWait(stateTransition)
    return stateTransition.hash(false)
}

/** Decodes a base58check Dash address into a CoreScript (P2PKH or P2SH). */
export function coreScriptFromAddress(address: string): CoreScript {
    const decoded = base58.decode(address) // version(1) + hash(20) + checksum(4)
    if (decoded.length !== 25) throw new Error(`Invalid Dash address: ${address}`)
    const version = decoded[0]!
    const hash = decoded.slice(1, 21)
    // P2SH version bytes: 0x10 mainnet, 0xC4 testnet — everything else is P2PKH
    if (version === 0x10 || version === 0xc4) return CoreScript.fromP2SH(hash)
    return CoreScript.fromP2PKH(hash)
}
