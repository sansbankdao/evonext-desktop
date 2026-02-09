// src-tauri/src/dapi/client/methods/system/tests.rs

use super::*;

#[test]
fn test_epoch_progress_math() {
    let epoch = EpochInfo {
        index: "1".to_string(),
        start_height: "1000".to_string(),
        end_height: "2000".to_string(),
        first_block_height: "1000".to_string(),
        first_core_block_height: "500".to_string(),
        start_time: "1700000000".to_string(),
    };

    // Halfway (Height 1500)
    assert_eq!(epoch.current_height_within_epoch("1500"), 500);
    assert_eq!(epoch.epoch_progress("1500"), 0.5);
    assert_eq!(epoch.to_display_string("1500"), "Epoch 1 (50%)");

    // Start
    assert_eq!(epoch.epoch_progress("1000"), 0.0);

    // End
    assert_eq!(epoch.epoch_progress("2000"), 1.0);

    // Out of bounds (High)
    assert_eq!(epoch.epoch_progress("3000"), 0.0);
}

#[test]
fn test_epoch_info_deserialization() {
    let data = serde_json::json!({
        "index": 10,
        "startHeight": "5000",
        "endHeight": 6000,
        "firstBlockHeight": "5000",
        "firstCoreBlockHeight": 4000,
        "startTime": 1600000000
    });

    let info: EpochInfo = serde_json::from_value(data).unwrap();

    // Verify everything became a String
    assert_eq!(info.index, "10");
    assert_eq!(info.start_height, "5000");
    assert_eq!(info.end_height, "6000");
}
