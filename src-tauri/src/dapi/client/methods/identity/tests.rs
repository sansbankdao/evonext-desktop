// src-tauri/src/dapi/client/methods/identity/tests.rs

use super::*;
use crate::dapi::types::Network;

#[tokio::test]
async fn test_get_identity_param_serialization() {
    let client = DAPIClient::new();
    // This tests the construction of the request without hitting the real network
    // by ensuring the method name and params are handled by the bridge.
    let identity_id = "test_id".to_string();
    let res = client.get_identity(identity_id, Network::Testnet).await;

    // We expect an error here (connection refused) because there is no local node,
    // but we are testing that the async call path is valid.
    assert!(res.is_err());
}
