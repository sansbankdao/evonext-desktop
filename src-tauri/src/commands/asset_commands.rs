// src-tauri/src/commands/asset_commands.rs

use crate::models::IAssets;
use crate::utils::store::{StoreManager, ASSETS_FILE};

create_store_command!(load_assets, "assets", IAssets, ASSETS_FILE);
create_store_command!(save_assets, "assets", IAssets, ASSETS_FILE);
