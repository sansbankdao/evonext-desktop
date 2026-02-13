// src-tauri/src/commands/studio_commands.rs

use serde::{Deserialize, Serialize};
use reqwest::Client;

#[cfg(test)]
mod tests;

#[derive(Serialize)]
struct VibeRequest {
    convoid: String,
    context: String,
    prompt: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Vibe {
    convoid: String,
    model: String,
    response: String,
    created_at: String,
}

#[derive(Deserialize)]
struct VibeResponse {
    result: Vibe,
}

#[tauri::command]
pub async fn ask_vibe_terminal(
    convoid: String,
    context: String,
    prompt: String,
) -> Result<String, String> {
    let client = Client::new();
    let auth_token = "5d719800-2ac3-4f73-a47a-21cd8304640e";

    println!("[DEBUG DOMINO REQUEST]: Convo ID {}", convoid);
    println!("[DEBUG DOMINO REQUEST]: Context Window {}", context);

    let res = client
        .post("https://evonext.app/v1/studio/domino")
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

    println!("[DEBUG DOMINO RESPONSE]: Convo ID {}", data.result.convoid);
    println!("[DEBUG DOMINO RESPONSE]: Model {}", data.result.model);
    println!("[DEBUG DOMINO RESPONSE]: Timestamp {}", data.result.created_at);

    Ok(data.result.response)
}
