// src-tauri/src/history/mod.rs
//
// Transaction history store (rusqlite, bundled SQLite).
//
// Architecture decision (2026-09-10): database access stays RUST-SIDE behind
// typed Tauri commands. tauri-plugin-sql was evaluated and rejected — its
// value is SQL-over-IPC from the frontend, which conflicts with this
// project's convention that business logic never crosses the bridge.
// rusqlite was chosen over sqlx: our queries are simple CRUD on a local
// cache; sqlx's async stack + compile-time-query offline ceremony buys us
// nothing here and costs CI friction. Blocking calls are dispatched via
// spawn_blocking in commands::history_commands.
//
// The history DB is a CACHE of chain state (Dash Core transactions and,
// later, Platform credit transfers). It is never the source of truth and
// must be safe to delete at any time.

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::Mutex;

#[cfg(test)]
mod tests;

/// Current schema version (PRAGMA user_version).
const SCHEMA_VERSION: u32 = 1;

/// Direction of a recorded transfer, from the owner's perspective.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TxDirection {
    Send,
    Receive,
}

impl TxDirection {
    fn as_str(&self) -> &'static str {
        match self {
            TxDirection::Send => "send",
            TxDirection::Receive => "receive",
        }
    }

    fn from_str(s: &str) -> Option<Self> {
        match s {
            "send" => Some(TxDirection::Send),
            "receive" => Some(TxDirection::Receive),
            _ => None,
        }
    }
}

/// Confirmation status of a recorded transfer.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TxStatus {
    Pending,
    Confirmed,
    Failed,
}

impl TxStatus {
    fn as_str(&self) -> &'static str {
        match self {
            TxStatus::Pending => "pending",
            TxStatus::Confirmed => "confirmed",
            TxStatus::Failed => "failed",
        }
    }

    fn from_str(s: &str) -> Option<Self> {
        match s {
            "pending" => Some(TxStatus::Pending),
            "confirmed" => Some(TxStatus::Confirmed),
            "failed" => Some(TxStatus::Failed),
            _ => None,
        }
    }
}

/// One recorded transfer. Amounts are integer duffs/credits (never float).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TxRecord {
    /// Transaction ID (Core txid or Platform state-transition hash).
    pub txid: String,
    /// "testnet" | "mainnet" — history is strictly partitioned per network.
    pub network: String,
    pub direction: TxDirection,
    /// Signed amount in the smallest unit (duffs for Core, credits for
    /// Platform): negative for sends, positive for receives.
    pub amount: i64,
    pub fee: Option<i64>,
    /// Unix seconds.
    pub timestamp: i64,
    pub block_height: Option<i64>,
    /// Address (Core) or Identity ID (Platform) of the other party.
    pub counterparty: Option<String>,
    pub status: TxStatus,
    /// Optional raw payload for future re-interpretation.
    pub raw_json: Option<String>,
}

/// Managed Tauri state wrapper. Mutex: rusqlite connections are !Sync.
/// The store is an Option so app startup NEVER fails over a history cache
/// problem — a corrupt/missing DB degrades history commands, not the app.
/// Arc: commands clone the state cheaply to move it into spawn_blocking
/// (State<'_, T> borrows cannot satisfy the 'static requirement).
#[derive(Clone)]
pub struct HistoryState {
    store: std::sync::Arc<Mutex<Option<HistoryStore>>>,
}

impl HistoryState {
    pub fn new(store: HistoryStore) -> Self {
        HistoryState {
            store: std::sync::Arc::new(Mutex::new(Some(store))),
        }
    }

    /// Managed state with no usable database (see init_history_state).
    pub fn unavailable() -> Self {
        HistoryState {
            store: std::sync::Arc::new(Mutex::new(None)),
        }
    }

    /// Lock the underlying store. Poisoning is unrecoverable here; surface
    /// it as an error string rather than panicking across the FFI.
    pub fn lock(&self) -> Result<std::sync::MutexGuard<'_, Option<HistoryStore>>, String> {
        self.store
            .lock()
            .map_err(|e| format!("HISTORY STORE LOCK POISONED: {}", e))
    }
}

/// Resolve AppData/history.db, open it, and register managed state.
/// Fallback chain: open -> rename corrupt file aside + retry once ->
/// manage an `unavailable` state. This function never panics and never
/// fails app setup: history is a cache, not a critical subsystem.
pub fn init_history_state<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    use tauri::Manager;

    let state = match app
        .path()
        .resolve("history.db", tauri::path::BaseDirectory::AppData)
    {
        Ok(path) => match HistoryStore::open(&path) {
            Ok(store) => HistoryState::new(store),
            Err(first) => {
                eprintln!("HISTORY INIT: {}, renaming aside and retrying", first);
                let aside = path.with_extension("db.corrupt");
                match std::fs::rename(&path, &aside).and_then(|_| Ok(())) {
                    Ok(()) => match HistoryStore::open(&path) {
                        Ok(store) => HistoryState::new(store),
                        Err(second) => {
                            eprintln!("HISTORY INIT RETRY FAILED: {}", second);
                            HistoryState::unavailable()
                        }
                    },
                    Err(e) => {
                        eprintln!("HISTORY INIT RENAME FAILED: {}", e);
                        HistoryState::unavailable()
                    }
                }
            }
        },
        Err(e) => {
            eprintln!("HISTORY INIT PATH RESOLUTION FAILED: {}", e);
            HistoryState::unavailable()
        }
    };
    app.manage(state);
}

pub struct HistoryStore {
    conn: Connection,
}

impl HistoryStore {
    /// Open (or create) the history database at `path` and migrate it.
    pub fn open(path: &Path) -> Result<Self, String> {
        let conn = Connection::open(path)
            .map_err(|e| format!("HISTORY DB OPEN FAILED ({}): {}", path.display(), e))?;
        let store = HistoryStore { conn };
        store.migrate()?;
        Ok(store)
    }

    /// In-memory database for unit tests.
    #[cfg(test)]
    pub fn open_in_memory() -> Result<Self, String> {
        let conn =
            Connection::open_in_memory().map_err(|e| format!("HISTORY MEM DB FAILED: {}", e))?;
        let store = HistoryStore { conn };
        store.migrate()?;
        Ok(store)
    }

    /// Apply schema migrations in order, tracking PRAGMA user_version.
    fn migrate(&self) -> Result<(), String> {
        let version: u32 = self
            .conn
            .query_row("PRAGMA user_version", [], |r| r.get(0))
            .map_err(|e| format!("HISTORY PRAGMA READ FAILED: {}", e))?;

        if version < 1 {
            self.conn
                .execute_batch(
                    "BEGIN;
                     CREATE TABLE IF NOT EXISTS transactions (
                         txid         TEXT NOT NULL,
                         network      TEXT NOT NULL,
                         direction    TEXT NOT NULL CHECK (direction IN ('send','receive')),
                         amount       INTEGER NOT NULL,
                         fee          INTEGER,
                         timestamp    INTEGER NOT NULL,
                         block_height INTEGER,
                         counterparty TEXT,
                         status       TEXT NOT NULL CHECK (status IN ('pending','confirmed','failed')),
                         raw_json     TEXT,
                         created_at   INTEGER NOT NULL DEFAULT (strftime('%s','now')),
                         updated_at   INTEGER NOT NULL DEFAULT (strftime('%s','now')),
                         PRIMARY KEY (txid, network)
                     );
                     CREATE INDEX IF NOT EXISTS idx_transactions_network_time
                         ON transactions (network, timestamp DESC);
                     PRAGMA user_version = 1;
                     COMMIT;",
                )
                .map_err(|e| format!("HISTORY MIGRATION v1 FAILED: {}", e))?;
        }

        debug_assert!(SCHEMA_VERSION == 1);
        Ok(())
    }

    /// Insert or update a record (keyed on txid + network). Re-fetching a
    /// transaction that confirmed since the last sync upgrades its status
    /// and block_height in place.
    pub fn upsert(&self, rec: &TxRecord) -> Result<(), String> {
        self.conn
            .execute(
                "INSERT INTO transactions
                     (txid, network, direction, amount, fee, timestamp,
                      block_height, counterparty, status, raw_json, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, strftime('%s','now'))
                 ON CONFLICT (txid, network) DO UPDATE SET
                     direction    = excluded.direction,
                     amount       = excluded.amount,
                     fee          = excluded.fee,
                     timestamp    = excluded.timestamp,
                     block_height = excluded.block_height,
                     counterparty = excluded.counterparty,
                     status       = excluded.status,
                     raw_json     = excluded.raw_json,
                     updated_at   = strftime('%s','now')",
                params![
                    rec.txid,
                    rec.network,
                    rec.direction.as_str(),
                    rec.amount,
                    rec.fee,
                    rec.timestamp,
                    rec.block_height,
                    rec.counterparty,
                    rec.status.as_str(),
                    rec.raw_json,
                ],
            )
            .map_err(|e| format!("HISTORY UPSERT FAILED ({}): {}", rec.txid, e))?;
        Ok(())
    }

    /// Fetch one record by txid + network.
    pub fn get(&self, network: &str, txid: &str) -> Result<Option<TxRecord>, String> {
        self.conn
            .query_row(
                "SELECT txid, network, direction, amount, fee, timestamp,
                        block_height, counterparty, status, raw_json
                 FROM transactions WHERE network = ?1 AND txid = ?2",
                params![network, txid],
                row_to_record,
            )
            .optional()
            .map_err(|e| format!("HISTORY GET FAILED ({}): {}", txid, e))
    }

    /// List records for a network, newest first, paginated.
    pub fn list(&self, network: &str, limit: u32, offset: u32) -> Result<Vec<TxRecord>, String> {
        let mut stmt = self
            .conn
            .prepare(
                "SELECT txid, network, direction, amount, fee, timestamp,
                        block_height, counterparty, status, raw_json
                 FROM transactions
                 WHERE network = ?1
                 ORDER BY timestamp DESC, txid ASC
                 LIMIT ?2 OFFSET ?3",
            )
            .map_err(|e| format!("HISTORY LIST PREPARE FAILED: {}", e))?;

        let rows = stmt
            .query_map(params![network, limit, offset], row_to_record)
            .map_err(|e| format!("HISTORY LIST QUERY FAILED: {}", e))?;

        let mut out = Vec::new();
        for row in rows {
            out.push(row.map_err(|e| format!("HISTORY LIST ROW FAILED: {}", e))?);
        }
        Ok(out)
    }

    /// Total records for a network (for pagination UI).
    pub fn count(&self, network: &str) -> Result<u64, String> {
        self.conn
            .query_row(
                "SELECT COUNT(*) FROM transactions WHERE network = ?1",
                params![network],
                |r| r.get::<_, i64>(0),
            )
            .map(|n| n as u64)
            .map_err(|e| format!("HISTORY COUNT FAILED: {}", e))
    }

    /// Delete every record for a network (e.g. on identity logout / wipe).
    pub fn clear_network(&self, network: &str) -> Result<u64, String> {
        self.conn
            .execute(
                "DELETE FROM transactions WHERE network = ?1",
                params![network],
            )
            .map(|n| n as u64)
            .map_err(|e| format!("HISTORY CLEAR FAILED ({}): {}", network, e))
    }
}

fn row_to_record(row: &rusqlite::Row<'_>) -> rusqlite::Result<TxRecord> {
    let direction_raw: String = row.get(2)?;
    let status_raw: String = row.get(8)?;
    Ok(TxRecord {
        txid: row.get(0)?,
        network: row.get(1)?,
        direction: TxDirection::from_str(&direction_raw).ok_or_else(|| {
            rusqlite::Error::InvalidColumnType(
                2,
                direction_raw.clone(),
                rusqlite::types::Type::Text,
            )
        })?,
        amount: row.get(3)?,
        fee: row.get(4)?,
        timestamp: row.get(5)?,
        block_height: row.get(6)?,
        counterparty: row.get(7)?,
        status: TxStatus::from_str(&status_raw).ok_or_else(|| {
            rusqlite::Error::InvalidColumnType(8, status_raw.clone(), rusqlite::types::Type::Text)
        })?,
        raw_json: row.get(9)?,
    })
}
