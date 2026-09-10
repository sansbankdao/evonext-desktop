// src-tauri/src/commands/history_commands.rs
//
// Typed Tauri commands over the rusqlite-backed transaction history store.
// All DB work is blocking, so every command dispatches via spawn_blocking to
// keep the async executor responsive. The store degrades gracefully: when
// init_history_state could not open the database, commands return a clear
// error instead of crashing the app.

use crate::history::{HistoryState, TxRecord};
use tauri::State;

/// List transactions for a network, newest first, paginated.
#[tauri::command]
pub async fn history_list_transactions(
    state: State<'_, HistoryState>,
    network: String,
    limit: u32,
    offset: u32,
) -> Result<Vec<TxRecord>, String> {
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let guard = state.lock()?;
        let store = guard
            .as_ref()
            .ok_or_else(|| "HISTORY UNAVAILABLE (database not open)".to_string())?;
        store.list(&network, limit, offset)
    })
    .await
    .map_err(|e| format!("HISTORY LIST TASK FAILED: {}", e))?
}

/// Insert or update one transaction record (used by sync flows).
#[tauri::command]
pub async fn history_upsert_transaction(
    state: State<'_, HistoryState>,
    record: TxRecord,
) -> Result<(), String> {
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let guard = state.lock()?;
        let store = guard
            .as_ref()
            .ok_or_else(|| "HISTORY UNAVAILABLE (database not open)".to_string())?;
        store.upsert(&record)
    })
    .await
    .map_err(|e| format!("HISTORY UPSERT TASK FAILED: {}", e))?
}

/// Total stored records for a network (pagination UI).
#[tauri::command]
pub async fn history_count_transactions(
    state: State<'_, HistoryState>,
    network: String,
) -> Result<u64, String> {
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let guard = state.lock()?;
        let store = guard
            .as_ref()
            .ok_or_else(|| "HISTORY UNAVAILABLE (database not open)".to_string())?;
        store.count(&network)
    })
    .await
    .map_err(|e| format!("HISTORY COUNT TASK FAILED: {}", e))?
}

/// Wipe all records for a network (identity logout / account removal).
#[tauri::command]
pub async fn history_clear_network(
    state: State<'_, HistoryState>,
    network: String,
) -> Result<u64, String> {
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let guard = state.lock()?;
        let store = guard
            .as_ref()
            .ok_or_else(|| "HISTORY UNAVAILABLE (database not open)".to_string())?;
        store.clear_network(&network)
    })
    .await
    .map_err(|e| format!("HISTORY CLEAR TASK FAILED: {}", e))?
}
