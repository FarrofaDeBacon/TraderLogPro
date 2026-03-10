// src-tauri/src/seed/assets_seed.rs
use crate::models::Asset;
use surrealdb::engine::local::Db;
use surrealdb::Surreal;

pub async fn seed_assets(db: &Surreal<Db>, filter: Option<Vec<String>>) -> Result<(), String> {
    println!("[SEED] Verificando Ativos (B3 Only)...");

    let assets: Vec<(&str, &str, &str, &str, f64, &str)> = vec![];

    for (id, symbol, name, type_id, point_value, required_module) in assets {
        if let Some(ref f) = filter {
            if !f.contains(&required_module.to_string()) {
                continue;
            }
        }
        let asset_data = Asset {
            id: id.into(),
            symbol: symbol.into(),
            name: name.into(),
            asset_type_id: type_id.into(),
            point_value,
            default_fee_id: None,
            tax_profile_id: None,
        };

        let mut json_data = serde_json::to_value(&asset_data).unwrap();
        if let Some(obj) = json_data.as_object_mut() {
            obj.remove("id");
        }

        // Use raw query for robust serialization
        db.query("UPSERT type::thing('asset', $id) CONTENT $data")
            .bind(("id", id))
            .bind(("data", json_data))
            .await
            .map_err(|e| e.to_string())?;

        println!("  ✓ {}", name);
    }
    Ok(())
}
