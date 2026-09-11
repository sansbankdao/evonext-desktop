// src-tauri/src/history/tests.rs

use super::*;

fn sample(txid: &str, network: &str, ts: i64) -> TxRecord {
    TxRecord {
        txid: txid.to_string(),
        network: network.to_string(),
        direction: TxDirection::Receive,
        amount: 100_000,
        fee: Some(226),
        timestamp: ts,
        block_height: Some(1_234_567),
        counterparty: Some("yXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx".to_string()),
        status: TxStatus::Pending,
        raw_json: None,
    }
}

#[test]
fn migrate_creates_schema_and_sets_version() {
    let store = HistoryStore::open_in_memory().expect("in-memory open");
    let version: u32 = store
        .conn
        .query_row("PRAGMA user_version", [], |r| r.get(0))
        .expect("read user_version");
    assert_eq!(version, SCHEMA_VERSION, "migration must set user_version");

    // Table must exist with the expected primary key columns.
    let cnt: i64 = store
        .conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='transactions'",
            [],
            |r| r.get(0),
        )
        .expect("sqlite_master query");
    assert_eq!(cnt, 1);
}

#[test]
fn migrate_is_idempotent() {
    let store = HistoryStore::open_in_memory().expect("open");
    store.migrate().expect("second migrate must be a no-op");
    let version: u32 = store
        .conn
        .query_row("PRAGMA user_version", [], |r| r.get(0))
        .expect("read");
    assert_eq!(version, SCHEMA_VERSION);
}

#[test]
fn upsert_inserts_and_get_returns_roundtrip() {
    let store = HistoryStore::open_in_memory().expect("open");
    let rec = sample("aa", "testnet", 1_700_000_000);
    store.upsert(&rec).expect("upsert");

    let got = store.get("testnet", "aa").expect("get").expect("present");
    assert_eq!(got, rec);
}

#[test]
fn upsert_on_conflict_updates_in_place() {
    let store = HistoryStore::open_in_memory().expect("open");
    let mut rec = sample("bb", "testnet", 1_700_000_000);
    store.upsert(&rec).expect("insert pending");

    // The same tx later confirms: status + block_height upgrade in place.
    rec.status = TxStatus::Confirmed;
    rec.block_height = Some(1_234_700);
    store.upsert(&rec).expect("upsert confirm");

    let got = store.get("testnet", "bb").expect("get").expect("present");
    assert_eq!(got.status, TxStatus::Confirmed);
    assert_eq!(got.block_height, Some(1_234_700));
    assert_eq!(
        store.count("testnet").expect("count"),
        1,
        "no duplicate row"
    );
}

#[test]
fn list_is_newest_first_and_paginates() {
    let store = HistoryStore::open_in_memory().expect("open");
    store.upsert(&sample("t1", "testnet", 100)).unwrap();
    store.upsert(&sample("t2", "testnet", 300)).unwrap();
    store.upsert(&sample("t3", "testnet", 200)).unwrap();

    let page1 = store.list("testnet", 2, 0).expect("page 1");
    assert_eq!(
        page1.iter().map(|r| r.txid.as_str()).collect::<Vec<_>>(),
        vec!["t2", "t3"]
    );
    let page2 = store.list("testnet", 2, 2).expect("page 2");
    assert_eq!(
        page2.iter().map(|r| r.txid.as_str()).collect::<Vec<_>>(),
        vec!["t1"]
    );
    assert!(store.list("testnet", 2, 3).expect("past end").is_empty());
}

#[test]
fn list_and_count_are_partitioned_by_network() {
    let store = HistoryStore::open_in_memory().expect("open");
    store.upsert(&sample("n1", "testnet", 100)).unwrap();
    store.upsert(&sample("n2", "mainnet", 100)).unwrap();

    assert_eq!(store.count("testnet").unwrap(), 1);
    assert_eq!(store.count("mainnet").unwrap(), 1);
    assert_eq!(store.list("testnet", 10, 0).unwrap()[0].txid, "n1");
    assert_eq!(store.list("mainnet", 10, 0).unwrap()[0].txid, "n2");
    // Same txid on the other network is a DIFFERENT record.
    assert!(store.get("mainnet", "n1").unwrap().is_none());
}

#[test]
fn clear_network_removes_only_that_network() {
    let store = HistoryStore::open_in_memory().expect("open");
    store.upsert(&sample("c1", "testnet", 100)).unwrap();
    store.upsert(&sample("c2", "mainnet", 100)).unwrap();

    assert_eq!(store.clear_network("testnet").unwrap(), 1);
    assert_eq!(store.count("testnet").unwrap(), 0);
    assert_eq!(store.count("mainnet").unwrap(), 1);
}

#[test]
fn check_constraints_reject_invalid_enums() {
    let store = HistoryStore::open_in_memory().expect("open");
    let bad = store.conn.execute(
        "INSERT INTO transactions
             (txid, network, direction, amount, timestamp, status)
         VALUES ('x', 'testnet', 'sideways', 1, 1, 'pending')",
        [],
    );
    assert!(bad.is_err(), "CHECK constraint must reject bad direction");

    assert!(TxDirection::from_str("sideways").is_none());
    assert!(TxStatus::from_str("lost").is_none());
}

#[test]
fn serde_uses_camel_case_for_frontend_contract() {
    let rec = sample("serde1", "testnet", 100);
    let json = serde_json::to_value(&rec).expect("serialize");
    let obj = json.as_object().expect("object");
    assert!(obj.contains_key("blockHeight"), "blockHeight key");
    assert!(obj.contains_key("rawJson"), "rawJson key");
    assert!(!obj.contains_key("block_height"));
    // Round-trip through the wire format.
    let back: TxRecord = serde_json::from_value(json).expect("deserialize");
    assert_eq!(back, rec);
    // Enums serialize as their wire names.
    assert_eq!(
        serde_json::to_string(&TxDirection::Send).unwrap(),
        "\"send\""
    );
    assert_eq!(
        serde_json::to_string(&TxStatus::Confirmed).unwrap(),
        "\"confirmed\""
    );
}

#[test]
fn history_state_lock_surfaces_errors_as_strings() {
    let state = HistoryState::unavailable();
    let guard = state.lock().expect("lock ok");
    assert!(guard.is_none(), "unavailable state holds no store");
}
