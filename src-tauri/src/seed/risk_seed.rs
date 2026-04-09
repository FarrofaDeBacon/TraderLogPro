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

    println!("[SEED] Verificando Perfis de Risco...");

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

    // Seed the Institutional Profile
    let inst_data = RiskProfile {
        id: "r_institucional".into(),
        name: "Plano Institucional".into(),
        max_daily_loss: 100.0, // Matches Phase 1
        daily_target: 250.0,    // Matches Phase 1
        max_risk_per_trade_percent: 1.0,
        max_trades_per_day: 5,
        min_risk_reward: 2.0,
        lock_on_loss: true,
        account_type_applicability: "All".into(),
        account_ids: vec![],
        target_type: "Financial".to_string(),
        capital_source: "Fixed".to_string(),
        fixed_capital: 0.0,
        linked_account_id: None,
        psychological_coupling_enabled: false,
        outlier_regression_enabled: false,
        sniper_mode_enabled: false,
        sniper_mode_selectivity: 3,
        psychological_lookback_count: 10,
        outlier_lookback_count: 20,
        psychological_threshold: -2,
        lot_reduction_multiplier: 0.5,
        psychological_search_strategy: "Strict".to_string(),
        active: true,
        default_stop_points: None,
        min_contracts: None,
        max_contracts: None,
        linked_asset_risk_profile_ids: Some(vec!["asset_risk_profile:win_default".to_string(), "asset_risk_profile:wdo_default".to_string()]),
        combined_rules: Some(vec![CombinedRiskRule {
            id: "cr_inst".to_string(),
            name: "Limite de Contratos Institucional".to_string(),
            enabled: true,
            rule_type: "sum_contracts".to_string(),
            asset_risk_profile_ids: vec!["asset_risk_profile:win_default".to_string(), "asset_risk_profile:wdo_default".to_string()],
            operator: "<=".to_string(),
            limit_value: 1.0, // Matches Phase 1
        }]),
        desk_config: None,
        risk_rules: None,
        growth_plan_id: Some("growth_plan:institucional_10".to_string()),
    };

    let mut json = serde_json::to_value(&inst_data).unwrap();
    if let Some(obj) = json.as_object_mut() {
        obj.remove("id");
    }

    db.query("UPSERT type::thing('risk_profile', 'r_institucional') CONTENT $data")
        .bind(("data", json))
        .await
        .map_err(|e| e.to_string())?;

    println!("  ✓ Plano Institucional");

    // Seed Mesa 5 PI Profile
    let mesa_5pi = RiskProfile {
        id: "r_mesa_5pi_4k".into(),
        name: "Mesa 5 PI - 4K".into(),
        max_daily_loss: 100.0,
        daily_target: 400.0,
        max_risk_per_trade_percent: 1.0,
        max_trades_per_day: 10,
        min_risk_reward: 1.5,
        lock_on_loss: true,
        account_type_applicability: "Prop".into(),
        account_ids: vec![],
        target_type: "Financial".to_string(),
        capital_source: "Fixed".to_string(),
        fixed_capital: 4000.0,
        linked_account_id: None,
        psychological_coupling_enabled: true,
        outlier_regression_enabled: false,
        sniper_mode_enabled: false,
        sniper_mode_selectivity: 3,
        psychological_lookback_count: 5,
        outlier_lookback_count: 20,
        psychological_threshold: -1,
        lot_reduction_multiplier: 0.5,
        psychological_search_strategy: "Flexible".to_string(),
        active: false,
        default_stop_points: None,
        min_contracts: None,
        max_contracts: None,
        linked_asset_risk_profile_ids: Some(vec!["asset_risk_profile:win_default".to_string(), "asset_risk_profile:wdo_default".to_string()]),
        combined_rules: Some(vec![CombinedRiskRule {
            id: "cr_mesa_5pi".to_string(),
            name: "Limite Máximo Combinado (30 Ctt)".to_string(),
            enabled: true,
            rule_type: "sum_contracts".to_string(),
            asset_risk_profile_ids: vec!["asset_risk_profile:win_default".to_string(), "asset_risk_profile:wdo_default".to_string()],
            operator: "<=".to_string(),
            limit_value: 30.0,
        }]),
        desk_config: None,
        risk_rules: None,
        growth_plan_id: Some("growth_plan:mesa_5pi_4k".to_string()),
    };

    let mut json_mesa = serde_json::to_value(&mesa_5pi).unwrap();
    if let Some(obj) = json_mesa.as_object_mut() { obj.remove("id"); }

    db.query("UPSERT type::thing('risk_profile', 'r_mesa_5pi_4k') CONTENT $data")
        .bind(("data", json_mesa))
        .await
        .map_err(|e| e.to_string())?;

    println!("  ✓ Perfil Mesa 5 PI - 4K");

    Ok(())
}

pub async fn seed_growth_plans(db: &Surreal<Db>) -> Result<(), String> {
    println!("[SEED] 🧨 CLEAN RESET: Removendo planos de crescimento existentes...");
    db.query("DELETE FROM growth_plan;").await.map_err(|e| e.to_string())?;

    let mut phases = Vec::new();
    
    // Phase 1: Initiaton
    phases.push(GrowthPhase {
        id: Some("growth_phase:institucional_f1".to_string()),
        level: 1,
        name: "Fase 1: Iniciação Institucional".to_string(),
        lot_size: 1,
        conditions_to_advance: vec![
            RiskCondition { metric: "profit_target".to_string(), operator: ">=".to_string(), value: 250.0 },
            RiskCondition { metric: "consistency_days".to_string(), operator: ">=".to_string(), value: 10.0 },
            RiskCondition { metric: "positive_sessions".to_string(), operator: ">=".to_string(), value: 8.0 }
        ],
        conditions_to_demote: vec![
            RiskCondition { metric: "daily_loss_limit".to_string(), operator: ">=".to_string(), value: 100.0 },
            RiskCondition { metric: "drawdown_limit".to_string(), operator: ">=".to_string(), value: 1000.0 },
            RiskCondition { metric: "loss_streak".to_string(), operator: ">=".to_string(), value: 2.0 }
        ]
    });

    // Phases 2-5: Consolidation (2 contracts)
    for i in 2..=5 {
        let meta = 250.0 + ((i - 1) as f64 * 100.0);
        phases.push(GrowthPhase {
            id: Some(format!("growth_phase:institucional_f{}", i)),
            level: i,
            name: format!("Fase {}: Consolidação Institucional", i),
            lot_size: 2,
            conditions_to_advance: vec![
                RiskCondition { metric: "profit_target".to_string(), operator: ">=".to_string(), value: meta },
                RiskCondition { metric: "consistency_days".to_string(), operator: ">=".to_string(), value: 10.0 },
                RiskCondition { metric: "positive_sessions".to_string(), operator: ">=".to_string(), value: 8.0 }
            ],
            conditions_to_demote: vec![
                RiskCondition { metric: "daily_loss_limit".to_string(), operator: ">=".to_string(), value: 200.0 },
                RiskCondition { metric: "drawdown_limit".to_string(), operator: ">=".to_string(), value: 2000.0 },
                RiskCondition { metric: "loss_streak".to_string(), operator: ">=".to_string(), value: 2.0 }
            ]
        });
    }

    // Phases 6-10: High Performance (3 contracts)
    for i in 6..=10 {
        let target = if i == 10 { 3000.0 } else { 1000.0 + ((i - 6) as f64 * 400.0) };
        phases.push(GrowthPhase {
            id: Some(format!("growth_phase:institucional_f{}", i)),
            level: i,
            name: if i == 10 { "Fase 10: Terminal Institucional".to_string() } else { format!("Fase {}: Alta Performance", i) },
            lot_size: 3,
            conditions_to_advance: if i == 10 { vec![] } else { vec![
                RiskCondition { metric: "profit_target".to_string(), operator: ">=".to_string(), value: target },
                RiskCondition { metric: "consistency_days".to_string(), operator: ">=".to_string(), value: 10.0 },
                RiskCondition { metric: "positive_sessions".to_string(), operator: ">=".to_string(), value: 8.0 }
            ] },
            conditions_to_demote: vec![
                RiskCondition { metric: "daily_loss_limit".to_string(), operator: ">=".to_string(), value: 300.0 },
                RiskCondition { metric: "drawdown_limit".to_string(), operator: ">=".to_string(), value: 3000.0 },
                RiskCondition { metric: "loss_streak".to_string(), operator: ">=".to_string(), value: 2.0 }
            ]
        });
    }

    let plan = GrowthPlan {
        id: "growth_plan:institucional_10".to_string(),
        name: "Plano Institucional".to_string(),
        enabled: true,
        current_phase_index: 0,
        phases,
        daily_loss_mode: "accumulate".to_string(),
        phase_drawdown_mode: "accumulate".to_string(),
        phase_target_mode: "cumulative".to_string(),
    };

    let mut json = serde_json::to_value(&plan).unwrap();
    if let Some(obj) = json.as_object_mut() {
        obj.remove("id");
    }

    db.query("UPSERT growth_plan:institucional_10 CONTENT $data")
        .bind(("data", json))
        .await
        .map_err(|e| e.to_string())?;

    println!("  ✓ Plano Institucional 10 Fases");

    // Seed Mesa 5 PI - Plano 4.000
    let mut phases_5pi = Vec::new();
    for i in 1..=10 {
        // Scaling contracts from 2 up to 30
        let lot_size = match i {
            1 => 2,
            2 => 4,
            3 => 6,
            4 => 10,
            5 => 15,
            6 => 20,
            7 => 25,
            _ => 30,
        };

        let target = (i as f64) * 400.0;
        let daily_loss = 100.0 + ((i-1) as f64 * 50.0); // Starts at 100, scales up

        phases_5pi.push(GrowthPhase {
            id: Some(format!("growth_phase:mesa_5pi_f{}", i)),
            level: i,
            name: format!("Mesa 5 PI: Nível {}", i),
            lot_size,
            conditions_to_advance: if i == 10 { vec![] } else { vec![
                RiskCondition { metric: "profit_target".to_string(), operator: ">=".to_string(), value: target },
                RiskCondition { metric: "consistency_days".to_string(), operator: ">=".to_string(), value: 10.0 },
            ] },
            conditions_to_demote: vec![
                RiskCondition { metric: "daily_loss_limit".to_string(), operator: ">=".to_string(), value: daily_loss },
                RiskCondition { metric: "drawdown_limit".to_string(), operator: ">=".to_string(), value: 4000.0 },
            ]
        });
    }

    let plan_5pi = GrowthPlan {
        id: "growth_plan:mesa_5pi_4k".to_string(),
        name: "Mesa 5 PI - Plano 4.000".to_string(),
        enabled: true,
        current_phase_index: 0,
        phases: phases_5pi,
        daily_loss_mode: "accumulate".to_string(),
        phase_drawdown_mode: "accumulate".to_string(),
        phase_target_mode: "cumulative".to_string(),
    };

    let mut json_5pi = serde_json::to_value(&plan_5pi).unwrap();
    if let Some(obj) = json_5pi.as_object_mut() { obj.remove("id"); }

    db.query("UPSERT growth_plan:mesa_5pi_4k CONTENT $data")
        .bind(("data", json_5pi))
        .await
        .map_err(|e| e.to_string())?;

    println!("  ✓ Plano Mesa 5 PI - 4.000 (Até 30 contratos)");

    Ok(())
}
