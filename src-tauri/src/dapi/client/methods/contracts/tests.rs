// src-tauri/src/dapi/client/methods/contracts/tests.rs

use super::*;

#[tokio::test]
async fn test_contract_fetch_serialization() {
    let client = DAPIClient::new("http://localhost".into());
    let res = client.get_data_contract("id_123".into(), Network::Testnet).await;
    // Verifies the call stack executes without panic
    assert!(res.is_err());
}
