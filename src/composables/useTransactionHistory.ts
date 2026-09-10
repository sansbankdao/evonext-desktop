// src/composables/useTransactionHistory.ts
//
// Thin typed wrapper over the Rust transaction history commands
// (src-tauri/src/commands/history_commands.rs). The history DB is a local
// CACHE of chain state — never the source of truth. Sync flows (wallet
// transaction polling, Platform credit transfers) upsert into it; the UI
// reads from it for instant, paginated history without network calls.
//
// Errors propagate as thrown strings from the Rust side; when the database
// could not be opened at startup the backend reports HISTORY UNAVAILABLE —
// callers should treat that as "show empty history", not as fatal.

import { invoke } from '@tauri-apps/api/core'
import type { TxRecord } from '@/types/history'

export function useTransactionHistory() {
  /** List transactions for a network, newest first, paginated. */
  async function listTransactions(
    network: string,
    limit = 50,
    offset = 0
  ): Promise<TxRecord[]> {
    return invoke<TxRecord[]>('history_list_transactions', {
      network,
      limit,
      offset,
    })
  }

  /** Insert or update one transaction record (called by sync flows). */
  async function upsertTransaction(record: TxRecord): Promise<void> {
    return invoke<void>('history_upsert_transaction', { record })
  }

  /** Total stored records for a network (for pagination UI). */
  async function countTransactions(network: string): Promise<number> {
    return invoke<number>('history_count_transactions', { network })
  }

  /** Wipe all records for a network (identity logout / account removal). */
  async function clearNetworkHistory(network: string): Promise<number> {
    return invoke<number>('history_clear_network', { network })
  }

  return {
    listTransactions,
    upsertTransaction,
    countTransactions,
    clearNetworkHistory,
  }
}
