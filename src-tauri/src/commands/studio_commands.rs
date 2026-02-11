use serde::{Deserialize, Serialize};
use reqwest::Client;

#[derive(Serialize)]
struct VibeRequest {
    prompt: String,
    context: String,
    file_name: String,
}

#[derive(Deserialize)]
struct VibeResponse {
    result: String,
}

#[tauri::command]
pub async fn ask_vibe_terminal(
    prompt: String,
    context: String,
    file_name: String
) -> Result<String, String> {
    let client = Client::new();

    let res = client
        .post("https://evonext.app/v1/studio/vibe")
        .json(&VibeRequest { prompt, context, file_name })
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let data: VibeResponse = res.json().await.map_err(|e| e.to_string())?;
    Ok(data.result)
}
