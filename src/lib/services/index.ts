// src/lib/services/index.ts
//
// Desktop port boundary (evonext-desktop). The web barrel re-exports the
// full service graph (post/profile/identity/... services) that the desktop
// does not consume — its writes go through src/services/platform.ts and
// the composables. The desktop barrel carries exactly the members the
// ported wallet layer (lib/wallet-manager.ts, lib/shielded/*) consumes:
// the wasm SDK service singleton.

export { wasmSdkService, getWasmSdk } from './wasm-sdk-service'
export type { WasmSdkConfig } from './wasm-sdk-service'
