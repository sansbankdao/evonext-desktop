// src-tauri/src/social/prefetch.rs

//! Fallback transport for the social feed when the primary DAPI HTTP proxy
//! (dapi.sansbank.dev) is unreachable: the frontend fetches raw documents
//! through the bundled DCG JS SDK (evo-sdk WASM, direct masternode
//! transport) and hands them over the command boundary as a bundle. This
//! backend serves the SAME pipeline (dedupe/resolve/parse) from the bundle
//! — no orchestration logic is duplicated TypeScript-side.
//!
//! Bundle wire format: `{ "documents": { "<contractId>:<docType>": [docs…] } }`.
//! The TS side is expected to supply, for every active posts contract, its
//! pre-filtered timeline (or owner-scoped) page under `"<contract>:post"`,
//! plus any profile/domain documents it could fetch (misses degrade
//! gracefully — the resolver treats them as unanswered tiers, never as
//! cacheable empties).

use super::backend::DocumentBackend;
use crate::dapi::types::Network;
use serde::Deserialize;
use serde_json::Value;
use std::collections::HashMap;

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SocialFetchBundle {
    #[serde(default)]
    pub documents: HashMap<String, Vec<Value>>,
}

pub struct PrefetchedBackend {
    docs: HashMap<(String, String), Vec<Value>>,
}

impl PrefetchedBackend {
    pub fn new(bundle: SocialFetchBundle) -> Self {
        let docs = bundle
            .documents
            .into_iter()
            .filter_map(|(key, docs)| {
                let (contract, doc_type) = key.split_once(':')?;
                Some(((contract.to_string(), doc_type.to_string()), docs))
            })
            .collect();
        Self { docs }
    }
}

/// Resolve a dotted field path (`"$ownerId"`, `"records.identity"`) against
/// a document.
fn field<'a>(doc: &'a Value, path: &str) -> Option<&'a Value> {
    let mut cur = doc;
    for part in path.split('.') {
        cur = cur.get(part)?;
    }
    Some(cur)
}

fn value_matches(doc: &Value, path: &str, op: &str, expected: &Value) -> bool {
    let Some(actual) = field(doc, path) else {
        return false;
    };
    match op {
        "==" => actual == expected,
        ">" | ">=" | "<" | "<=" => {
            let a = actual
                .as_f64()
                .or_else(|| actual.as_str().and_then(|s| s.parse::<f64>().ok()));
            let e = expected
                .as_f64()
                .or_else(|| expected.as_str().and_then(|s| s.parse::<f64>().ok()));
            match (a, e) {
                (Some(a), Some(e)) => match op {
                    ">" => a > e,
                    ">=" => a >= e,
                    "<" => a < e,
                    _ => a <= e,
                },
                _ => false,
            }
        }
        "in" | "contains" => expected
            .as_array()
            .map(|arr| arr.iter().any(|v| v == actual))
            .unwrap_or(false),
        _ => false,
    }
}

/// Apply the small, fixed set of where-clause shapes the social pipeline
/// issues (`==`, numeric comparisons, `in` on dotted paths). Unknown shapes
/// match NOTHING (safe degradation, never fabrication).
pub fn apply_where(docs: &[Value], where_clause: &Option<Value>) -> Vec<Value> {
    let Some(clauses) = where_clause.as_ref().and_then(|w| w.as_array()) else {
        return docs.to_vec();
    };
    docs.iter()
        .filter(|doc| {
            clauses.iter().all(|clause| {
                let arr = match clause.as_array() {
                    Some(a) if a.len() >= 3 => a,
                    _ => return false,
                };
                match (arr[0].as_str(), arr[1].as_str()) {
                    (Some(p), Some(o)) => value_matches(doc, p, o, &arr[2]),
                    _ => false,
                }
            })
        })
        .cloned()
        .collect()
}

impl DocumentBackend for PrefetchedBackend {
    async fn get_documents(
        &self,
        contract_id: &str,
        document_type: &str,
        _network: Network,
        where_clause: Option<Value>,
        _order_by: Option<Value>,
        limit: Option<u32>,
        _start_after: Option<String>,
    ) -> Result<Vec<Value>, String> {
        let Some(docs) = self
            .docs
            .get(&(contract_id.to_string(), document_type.to_string()))
        else {
            // Tier not bundled → transport-level miss (uncached by the
            // resolver; retried on the next call).
            return Err("not present in prefetched bundle".to_string());
        };
        let mut matched = apply_where(docs, &where_clause);
        if let Some(limit) = limit {
            matched.truncate(limit as usize);
        }
        Ok(matched)
    }
}
