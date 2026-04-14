// use std::path::PathBuf;
use surrealdb::engine::local::{Db, SurrealKv};
use surrealdb::Surreal;
use tauri::AppHandle;
use tauri::Manager;

pub struct DbState(pub Surreal<Db>);

pub async fn init_db(app_handle: &AppHandle) -> Result<Surreal<Db>, surrealdb::Error> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to get app data directory");

    // Create directory if not exists
    if !app_dir.exists() {
        std::fs::create_dir_all(&app_dir).expect("Failed to create app data directory");
    }

    let db_path = app_dir.join("traderlog.db");
    println!("[DB] Attempting to open database at: {:?}", db_path);

    let db = Surreal::new::<SurrealKv>(db_path.to_str().unwrap()).await?;
    println!("[DB] SurrealDB instance created successfully.");

    db.use_ns("traderlog").use_db("main").await?;
    println!("[DB] Namespace 'traderlog' and Database 'main' set successfully.");

    Ok(db)
}

/// Normalizes SurrealDB IDs by extracting the actual ID part from Thing objects or prefixed strings.
/// Logic migrated from irpf.rs for system-wide consistency.
pub fn normalize_id(label: &str, s: &str) -> String {
    let mut clean = s.to_string();
    if clean.contains("String:") {
        clean = clean.split("String:").last().unwrap_or(&clean).to_string();
    }
    clean = clean.replace(['{', '}', '"', '\'', ' ', '`'], "");
    let res = clean.split(':').last().unwrap_or(clean.as_str()).to_string();
    if !s.is_empty() && !label.is_empty() {
        println!("[DB] normalize_id({}): '{}' -> '{}'", label, s, res);
    }
    res
}
