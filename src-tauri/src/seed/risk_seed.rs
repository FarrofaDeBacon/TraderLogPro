// src-tauri/src/seed/risk_seed.rs
use crate::models::{
    GrowthPhase, RiskCondition, RiskProfile, GrowthPlan, AssetRiskProfile, CombinedRiskRule
};
use surrealdb::engine::local::Db;
use surrealdb::Surreal;

pub async fn seed_risk_profiles(
    db: &Surreal<Db>,
    _filter: Option<Vec<String>>,
) -> Result<(), String> {
    println!("[SEED] 🧨 DEEP RESET: Removendo perfis, planos e regras existentes...");
    db.query("DELETE FROM risk_profile; DELETE FROM growth_plan; DELETE FROM risk_rule; DELETE FROM asset_risk_profile;").await.map_err(|e| e.to_string())?;

    println!("[SEED] Verificando Perfis de Risco (Limpo)...");

    // Seed WIN/WDO AssetRiskProfiles
    let arp_win = AssetRiskProfile {
        id: Some("asset_risk_profile:win_default".to_string()),
        name: "WIN Standard".to_string(),
        asset_id: surrealdb::sql::Thing::from(("asset".to_string(), "win".to_string())).to_string(),
        default_stop_points: 150.0,
        min_contracts: 1,
        max_contracts: 30,
        notes: Some("Limites Padrão WIN".to_string()),
    };
    db.query("UPSERT type::thing('asset_risk_profile', 'win_default') CONTENT $data")
        .bind(("data", serde_json::to_value(&arp_win).unwrap()))
        .await
        .map_err(|e| e.to_string())?;

    let arp_wdo = AssetRiskProfile {
        id: Some("asset_risk_profile:wdo_default".to_string()),
        name: "WDO Standard".to_string(),
        asset_id: surrealdb::sql::Thing::from(("asset".to_string(), "wdo".to_string())).to_string(),
        default_stop_points: 10.0,
        min_contracts: 1,
        max_contracts: 30,
        notes: Some("Limites Padrão WDO".to_string()),
    };
    db.query("UPSERT type::thing('asset_risk_profile', 'wdo_default') CONTENT $data")
        .bind(("data", serde_json::to_value(&arp_wdo).unwrap()))
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn seed_growth_plans(db: &Surreal<Db>) -> Result<(), String> {
    println!("[SEED] 🧨 CLEAN RESET: Removendo planos de crescimento existentes...");
    db.query("DELETE FROM growth_plan;").await.map_err(|e| e.to_string())?;

    Ok(())
}
