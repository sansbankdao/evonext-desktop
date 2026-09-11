// src-tauri/src/social/backend.rs

//! Minimal document-fetch seam so the social pipeline is unit-testable
//! without network access. `DAPIClient` implements it by delegating to the
//! UNCACHED request path (the social layer runs its own TTL profile cache;
//! the transport cache would double-cache timeline queries and replay
//! stale pages on pull-to-refresh — handoff §11).

use crate::dapi::client::DAPIClient;
use crate::dapi::types::Network;
use serde_json::Value;

pub trait DocumentBackend {
    #[allow(clippy::too_many_arguments)]
    fn get_documents<'a>(
        &'a self,
        contract_id: &'a str,
        document_type: &'a str,
        network: Network,
        where_clause: Option<Value>,
        order_by: Option<Value>,
        limit: Option<u32>,
        start_after: Option<String>,
    ) -> impl std::future::Future<Output = Result<Vec<Value>, String>> + Send + 'a;
}

impl DocumentBackend for DAPIClient {
    async fn get_documents(
        &self,
        contract_id: &str,
        document_type: &str,
        network: Network,
        where_clause: Option<Value>,
        order_by: Option<Value>,
        limit: Option<u32>,
        start_after: Option<String>,
    ) -> Result<Vec<Value>, String> {
        self.get_documents_fresh(
            contract_id.to_string(),
            document_type.to_string(),
            network,
            where_clause,
            order_by,
            limit,
            start_after,
            None,
        )
        .await
        .map_err(|e| e.to_string())
    }
}
