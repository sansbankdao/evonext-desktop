// src/types/history.ts
//
// Contract for the Rust-side transaction history store
// (src-tauri/src/history/mod.rs). Field names are camelCase — the Rust
// structs serialize with serde(rename_all = "camelCase") and the
// serde_uses_camel_case_for_frontend_contract test guards this file.

export type TxDirection = 'send' | 'receive'

export type TxStatus = 'pending' | 'confirmed' | 'failed'

export interface TxRecord {
  /** Transaction ID (Core txid or Platform state-transition hash). */
  txid: string
  /** 'testnet' | 'mainnet' — history is strictly partitioned per network. */
  network: string
  direction: TxDirection
  /** Signed amount in the smallest unit (duffs/credits): negative = send. */
  amount: number
  fee: number | null
  /** Unix seconds. */
  timestamp: number
  blockHeight: number | null
  /** Address (Core) or Identity ID (Platform) of the other party. */
  counterparty: string | null
  status: TxStatus
  rawJson: string | null
}
