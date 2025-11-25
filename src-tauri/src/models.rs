// src-tauri/src/models.rs
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub theme: String,
    pub notifications: NotificationSettings,
    pub profile: ProfileSettings,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct INetwork {
    pub network: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct IPrivateKeys {
    pub identity_id: String,
    pub auth_key: String,
    pub encryption_key: String,
    pub transfer_key: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct IMnemonic {
    pub seed_phrase: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct IdentityData {
    pub username: String,
    pub identity_id: String,
    pub balance: Option<String>,
    pub is_authenticated: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct NotificationSettings {
    pub messages: bool,
    pub mentions: bool,
    pub contact_requests: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ProfileSettings {
    pub display_name: String,
    pub username: String,
    pub bio: String,
}
