// src-tauri/src/commands/studio_commands.rs

use serde::{Deserialize, Serialize};
use reqwest::Client;

#[derive(Serialize)]
struct VibeRequest {
    convoid: String,
    context: String,
    prompt: String,
}

#[derive(Deserialize)]
struct VibeResponse {
    result: String,
}

#[tauri::command]
pub async fn ask_vibe_terminal(
    convoid: String,
    context: String,
    prompt: String,
) -> Result<String, String> {
    let client = Client::new();
    let auth_token = "5d719800-2ac3-4f73-a47a-21cd8304640e";

    let res = client
        .post("https://evonext.app/v1/studio/vibe")
        .bearer_auth(auth_token)
        .json(&VibeRequest {
            convoid,
            context,
            prompt,
        })
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let data: VibeResponse = res.json().await.map_err(|e| e.to_string())?;
    Ok(data.result)
}
