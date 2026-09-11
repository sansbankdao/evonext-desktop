// src-tauri/src/social/tests/mod.rs

//! Social-module test suite. All network access is replaced by
//! `MockBackend` — canned DAPI responses keyed by (contract, documentType),
//! with every call recorded for query-shape assertions.

mod avatar_profile;
mod content;
mod feed;

use crate::dapi::types::Network;
use crate::social::backend::DocumentBackend;
use serde_json::{json, Value};
use std::collections::{HashMap, VecDeque};
use std::sync::Mutex;

pub struct MockBackend {
    /// (contract, doc_type) → queued results (FIFO).
    pub responses: Mutex<HashMap<(String, String), VecDeque<Result<Vec<Value>, String>>>>,
    /// (contract, doc_type, where_clause) — every call, in order.
    pub calls: Mutex<Vec<(String, String, Option<Value>)>>,
}

impl MockBackend {
    pub fn new() -> Self {
        Self {
            responses: Mutex::new(HashMap::new()),
            calls: Mutex::new(Vec::new()),
        }
    }

    pub fn push(&self, contract: &str, doc_type: &str, res: Result<Vec<Value>, String>) {
        self.responses
            .lock()
            .unwrap()
            .entry((contract.to_string(), doc_type.to_string()))
            .or_default()
            .push_back(res);
    }

    pub fn ok(&self, contract: &str, doc_type: &str, docs: Vec<Value>) {
        self.push(contract, doc_type, Ok(docs));
    }

    /// Count calls made to one (contract, doc_type) pair.
    pub fn call_count(&self, contract: &str, doc_type: &str) -> usize {
        self.calls
            .lock()
            .unwrap()
            .iter()
            .filter(|(c, t, _)| c == contract && t == doc_type)
            .count()
    }
}

impl DocumentBackend for MockBackend {
    async fn get_documents(
        &self,
        contract_id: &str,
        document_type: &str,
        _network: Network,
        where_clause: Option<Value>,
        _order_by: Option<Value>,
        _limit: Option<u32>,
        _start_after: Option<String>,
    ) -> Result<Vec<Value>, String> {
        self.calls.lock().unwrap().push((
            contract_id.to_string(),
            document_type.to_string(),
            where_clause,
        ));
        self.responses
            .lock()
            .unwrap()
            .get_mut(&(contract_id.to_string(), document_type.to_string()))
            .and_then(|q| q.pop_front())
            .unwrap_or(Ok(Vec::new()))
    }
}

// -----------------------------------------------------------------------------
// Canned document builders (field shapes per handoff §4)
// -----------------------------------------------------------------------------

pub fn post_doc(id: &str, owner: &str, created_at_ms: u64, content: &str) -> Value {
    json!({
        "$id": id,
        "$ownerId": owner,
        "$createdAt": created_at_ms,
        "$updatedAt": created_at_ms,
        "content": content,
        "language": "en",
    })
}

pub fn yappr_profile_doc(owner: &str, display_name: &str, avatar: Option<&str>) -> Value {
    match avatar {
        Some(a) => json!({ "$ownerId": owner, "displayName": display_name, "avatar": a }),
        None => json!({ "$ownerId": owner, "displayName": display_name }),
    }
}

pub fn dpns_domain_doc(label: &str, identity: &str, contested: bool) -> Value {
    if contested {
        json!({
            "label": label,
            "records": {
                "identity": identity,
                "dashUniqueIdentityId": identity,
            }
        })
    } else {
        json!({
            "label": label,
            "records": { "identity": identity }
        })
    }
}

pub fn dashpay_profile_doc(owner: &str, display_name: &str, avatar_url: &str, msg: &str) -> Value {
    json!({
        "$ownerId": owner,
        "displayName": display_name,
        "avatarUrl": avatar_url,
        "publicMessage": msg,
    })
}

/// Prime all three profile tiers as "answered empty" for `owner`
/// (queue order: yappr profile, dpns domain, dashpay profile).
pub fn prime_empty_profile(backend: &MockBackend, network: Network) {
    use crate::social::{yappr_profile_contract, DASHPAY_CONTRACT_ID, DPNS_CONTRACT_ID};
    if let Some(c) = yappr_profile_contract(network) {
        backend.ok(c, "profile", Vec::new());
    }
    backend.ok(DPNS_CONTRACT_ID, "domain", Vec::new());
    backend.ok(DASHPAY_CONTRACT_ID, "profile", Vec::new());
}
