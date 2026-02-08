// src-tauri/src/export_types_tests.rs

use super::*;

#[test]
fn test_specta_builder_construction() {
    // Verifies that the command collection macro and types are valid.
    // If a struct used in a command is missing #[derive(Type)], this will fail at compile/run time.
    let builder = create_builder();

    // Check that we have a reasonable number of commands registered
    // (Total in your list is 44)
    assert!(builder.commands().len() >= 40);
}
