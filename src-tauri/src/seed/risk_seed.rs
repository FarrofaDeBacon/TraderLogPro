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

    println!("[SEED] Criando Perfis de Risco Genéricos...");

    let profiles = vec![
        RiskProfile {
            id: "risk_profile:conservative".to_string(),
            name: "Conservador (B3)".to_string(),
            max_daily_loss: 0.0,
            daily_target: 0.0,
            max_risk_per_trade_percent: 1.0,
            max_trades_per_day: 0,
            min_risk_reward: 2.0,
            lock_on_loss: true,
            account_type_applicability: "Real".to_string(),
            account_ids: vec![],
            target_type: "Financial".to_string(),
            capital_source: "Fixed".to_string(),
            fixed_capital: 5000.0,
            linked_account_id: None,
            psychological_coupling_enabled: true,
            outlier_regression_enabled: false,
            sniper_mode_enabled: false,
            sniper_mode_selectivity: 5,
            psychological_lookback_count: 10,
            outlier_lookback_count: 20,
            psychological_threshold: -2,
            lot_reduction_multiplier: 0.5,
            psychological_search_strategy: "Sequence".to_string(),
            active: true,
            default_stop_points: Some(150.0),
            min_contracts: Some(1),
            max_contracts: Some(5),
            linked_asset_risk_profile_ids: None,
            combined_rules: None,
            risk_rules: Some(vec![
                crate::models::RiskRule {
                    id: "rule_conservative_loss".to_string(),
                    name: "Limite de Perda Diária".to_string(),
                    enabled: true,
                    scope: "global".to_string(),
                    target_type: "max_daily_loss".to_string(),
                    operator: "<=".to_string(),
                    value: serde_json::Value::from(100.0),
                    value_secondary: None,
                    asset_risk_profile_ids: None,
                },
                crate::models::RiskRule {
                    id: "rule_conservative_target".to_string(),
                    name: "Meta de Lucro Diária".to_string(),
                    enabled: true,
                    scope: "global".to_string(),
                    target_type: "profit_target".to_string(),
                    operator: ">=".to_string(),
                    value: serde_json::Value::from(250.0),
                    value_secondary: None,
                    asset_risk_profile_ids: None,
                },
                crate::models::RiskRule {
                    id: "rule_conservative_trades".to_string(),
                    name: "Máximo de Trades/Dia".to_string(),
                    enabled: true,
                    scope: "global".to_string(),
                    target_type: "max_trades_per_day".to_string(),
                    operator: "<=".to_string(),
                    value: serde_json::Value::from(5),
                    value_secondary: None,
                    asset_risk_profile_ids: None,
                }
            ]),
            desk_config: None,
            growth_plan_id: None,
        },
        RiskProfile {
            id: "risk_profile:prop_std".to_string(),
            name: "Mesa Proprietária Standard".to_string(),
            max_daily_loss: 0.0,
            daily_target: 0.0,
            max_risk_per_trade_percent: 2.0,
            max_trades_per_day: 0,
            min_risk_reward: 1.5,
            lock_on_loss: true,
            account_type_applicability: "Prop".to_string(),
            account_ids: vec![],
            target_type: "Financial".to_string(),
            capital_source: "Fixed".to_string(),
            fixed_capital: 10000.0,
            linked_account_id: None,
            psychological_coupling_enabled: true,
            outlier_regression_enabled: true,
            sniper_mode_enabled: false,
            sniper_mode_selectivity: 3,
            psychological_lookback_count: 10,
            outlier_lookback_count: 20,
            psychological_threshold: -2,
            lot_reduction_multiplier: 0.5,
            psychological_search_strategy: "Strict".to_string(),
            active: false,
            default_stop_points: Some(100.0),
            min_contracts: Some(1),
            max_contracts: Some(50),
            linked_asset_risk_profile_ids: None,
            combined_rules: None,
            risk_rules: Some(vec![
                crate::models::RiskRule {
                    id: "rule_prop_loss".to_string(),
                    name: "Drawdown Diário Máximo".to_string(),
                    enabled: true,
                    scope: "global".to_string(),
                    target_type: "max_daily_loss".to_string(),
                    operator: "<=".to_string(),
                    value: serde_json::Value::from(500.0),
                    value_secondary: None,
                    asset_risk_profile_ids: None,
                },
                crate::models::RiskRule {
                    id: "rule_prop_target".to_string(),
                    name: "Meta da Mesa".to_string(),
                    enabled: true,
                    scope: "global".to_string(),
                    target_type: "profit_target".to_string(),
                    operator: ">=".to_string(),
                    value: serde_json::Value::from(1000.0),
                    value_secondary: None,
                    asset_risk_profile_ids: None,
                },
                crate::models::RiskRule {
                    id: "rule_prop_trades".to_string(),
                    name: "Limite Operacional de Trades".to_string(),
                    enabled: true,
                    scope: "global".to_string(),
                    target_type: "max_trades_per_day".to_string(),
                    operator: "<=".to_string(),
                    value: serde_json::Value::from(20),
                    value_secondary: None,
                    asset_risk_profile_ids: None,
                }
            ]),
            desk_config: None,
            growth_plan_id: None,
        },
    ];

    for profile in profiles {
        let mut json = serde_json::to_value(&profile).unwrap();
        if let Some(obj) = json.as_object_mut() { obj.remove("id"); }
        db.query("UPSERT type::thing('risk_profile', $id) CONTENT $data")
            .bind(("id", profile.id.split(':').last().unwrap().to_string()))
            .bind(("data", json))
            .await
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

pub async fn seed_growth_plans(db: &Surreal<Db>) -> Result<(), String> {
    println!("[SEED] Criando Planos de Crescimento Genéricos...");

    let plans = vec![
        GrowthPlan {
            id: "growth_plan:organic".to_string(),
            name: "Escalabilidade Capital Próprio".to_string(),
            enabled: true,
            current_phase_index: 0,
            daily_loss_mode: "accumulate".to_string(),
            phase_drawdown_mode: "accumulate".to_string(),
            phase_target_mode: "cumulative".to_string(),
            phases: vec![
                GrowthPhase {
                    id: None,
                    level: 1,
                    name: "Recruta".to_string(),
                    lot_size: 1,
                    conditions_to_advance: vec![RiskCondition { metric: "profit".to_string(), operator: ">".to_string(), value: 1000.0 }],
                    conditions_to_demote: vec![],
                },
                GrowthPhase {
                    id: None,
                    level: 2,
                    name: "Soldado".to_string(),
                    lot_size: 2,
                    conditions_to_advance: vec![RiskCondition { metric: "profit".to_string(), operator: ">".to_string(), value: 3000.0 }],
                    conditions_to_demote: vec![RiskCondition { metric: "loss".to_string(), operator: ">".to_string(), value: 500.0 }],
                },
                GrowthPhase {
                    id: None,
                    level: 3,
                    name: "Sargento".to_string(),
                    lot_size: 4,
                    conditions_to_advance: vec![RiskCondition { metric: "profit".to_string(), operator: ">".to_string(), value: 10000.0 }],
                    conditions_to_demote: vec![RiskCondition { metric: "loss".to_string(), operator: ">".to_string(), value: 1500.0 }],
                },
            ],
        },
        GrowthPlan {
            id: "growth_plan:mesa_10k".to_string(),
            name: "Mesa Proprietária Pro 10k".to_string(),
            enabled: true,
            current_phase_index: 0,
            daily_loss_mode: "accumulate".to_string(),
            phase_drawdown_mode: "accumulate".to_string(),
            phase_target_mode: "cumulative".to_string(),
            phases: vec![
                GrowthPhase {
                    id: None,
                    level: 1,
                    name: "Avaliação".to_string(),
                    lot_size: 5,
                    conditions_to_advance: vec![RiskCondition { metric: "profit".to_string(), operator: ">".to_string(), value: 2000.0 }],
                    conditions_to_demote: vec![],
                },
                GrowthPhase {
                    id: None,
                    level: 2,
                    name: "Performance".to_string(),
                    lot_size: 10,
                    conditions_to_advance: vec![RiskCondition { metric: "profit".to_string(), operator: ">".to_string(), value: 10000.0 }],
                    conditions_to_demote: vec![RiskCondition { metric: "loss".to_string(), operator: ">".to_string(), value: 3000.0 }],
                },
            ],
        },
    ];

    for plan in plans {
        let mut json = serde_json::to_value(&plan).unwrap();
        if let Some(obj) = json.as_object_mut() { obj.remove("id"); }
        db.query("UPSERT type::thing('growth_plan', $id) CONTENT $data")
            .bind(("id", plan.id.split(':').last().unwrap().to_string()))
            .bind(("data", json))
            .await
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
