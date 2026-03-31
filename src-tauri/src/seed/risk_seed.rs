// src-tauri/src/seed/risk_seed.rs
use crate::models::{
    GrowthPhase, RiskCondition, RiskProfile, GrowthPlan,
};
use surrealdb::engine::local::Db;
use surrealdb::Surreal;

pub async fn seed_risk_profiles(
    db: &Surreal<Db>,
    filter: Option<Vec<String>>,
) -> Result<(), String> {
    println!("[SEED] 🧨 CLEAN RESET: Removendo perfis de risco existentes...");
    db.query("DELETE FROM risk_profile; DELETE FROM asset_risk_profile;").await.map_err(|e| e.to_string())?;

    println!("[SEED] Verificando Perfis de Risco...");

    // Seed WIN/WDO AssetRiskProfiles for the Prop Firm Mock
    let arp_win = crate::models::AssetRiskProfile {
        id: Some("asset_risk_profile:win_book4k".to_string()),
        name: "WIN (Book 4k)".to_string(),
        asset_id: surrealdb::sql::Thing::from(("asset".to_string(), "win".to_string())).to_string(),
        default_stop_points: 150.0,
        min_contracts: 1,
        max_contracts: 30,
        notes: Some("Limites da Mesa".to_string()),
    };
    db.query("UPSERT type::thing('asset_risk_profile', 'win_book4k') CONTENT $data")
        .bind(("data", serde_json::to_value(&arp_win).unwrap()))
        .await
        .map_err(|e| e.to_string())?;

    let arp_wdo = crate::models::AssetRiskProfile {
        id: Some("asset_risk_profile:wdo_book4k".to_string()),
        name: "WDO (Book 4k)".to_string(),
        asset_id: surrealdb::sql::Thing::from(("asset".to_string(), "wdo".to_string())).to_string(),
        default_stop_points: 10.0,
        min_contracts: 1,
        max_contracts: 30,
        notes: Some("Limites da Mesa".to_string()),
    };
    db.query("UPSERT type::thing('asset_risk_profile', 'wdo_book4k') CONTENT $data")
        .bind(("data", serde_json::to_value(&arp_wdo).unwrap()))
        .await
        .map_err(|e| e.to_string())?;

    let profiles = vec![
        (
            "r1",
            "Conservador",
            50.0,
            100.0,
            0.5,
            3,
            2.0,
            true,
            "All",
            true,
        ),
        (
            "r2", "Moderado", 150.0, 300.0, 1.0, 5, 1.5, true, "All", true,
        ),
        (
            "r3",
            "Agressivo",
            500.0,
            1000.0,
            2.0,
            10,
            1.0,
            false,
            "All",
            true,
        ),
        (
            "r4",
            "Mesa 5PI Book 4k",
            4000.0,
            4000.0,
            1.0,
            50,
            1.0,
            true,
            "Prop",
            false,
        ),
        (
            "r_institucional",
            "Plano Institucional",
            100.0,
            500.0,
            1.0,
            5,
            2.0,
            true,
            "All",
            true,
        ),
    ];

    for (
        id,
        name,
        max_loss,
        target,
        risk_per_trade,
        max_trades,
        min_rr,
        lock,
        account_type,
        _growth_enabled,
    ) in profiles
    {
        if let Some(ref f) = filter {
            if !f.contains(&id.to_string()) {
                continue;
            }
        }

        let desk_config = if id == "r4" {
            Some(crate::models::DeskConfig {
                enabled: true,
                plan_name: Some("5PI Book 4k".to_string()),
                allowed_asset_ids: Some(vec!["asset_risk_profile:win_book4k".to_string(), "asset_risk_profile:wdo_book4k".to_string()]),
                max_combined_exposure: Some(30),
                max_total_loss: Some(4000.0),
                profit_target: Some(4000.0),
                day_trade_only: Some(true),
                close_before_market_close_minutes: Some(30),
                consistency_mode: Some("5days_3positive".to_string()),
                max_single_day_profit_share: Some(0.50),
                mdr_mode: Some("none".to_string()),
            })
        } else {
            None
        };

        let data = RiskProfile {
            id: id.into(),
            name: name.into(),
            max_daily_loss: max_loss,
            daily_target: target,
            max_risk_per_trade_percent: risk_per_trade,
            max_trades_per_day: max_trades,
            min_risk_reward: min_rr,
            lock_on_loss: lock,
            account_type_applicability: account_type.into(),
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
            active: name == "Plano Institucional", // Define Institucional como ativo por padrão para validação do usuário
            default_stop_points: None,
            min_contracts: None,
            max_contracts: None,
            linked_asset_risk_profile_ids: if id == "r4" {
                Some(vec!["asset_risk_profile:win_book4k".to_string(), "asset_risk_profile:wdo_book4k".to_string()])
            } else {
                None
            },
            combined_rules: if id == "r4" {
                Some(vec![crate::models::CombinedRiskRule {
                    id: "cr_1".to_string(),
                    name: "Limite 30 Contratos (WIN+WDO)".to_string(),
                    enabled: true,
                    rule_type: "sum_contracts".to_string(),
                    asset_risk_profile_ids: vec!["asset_risk_profile:win_book4k".to_string(), "asset_risk_profile:wdo_book4k".to_string()],
                    operator: "<=".to_string(),
                    limit_value: 30.0,
                }])
            } else {
                None
            },
            desk_config,
            risk_rules: None,
            growth_plan_id: if id == "r_institucional" { Some("growth_plan:institucional_10".to_string()) } else { None },
        };
        let mut json = serde_json::to_value(&data).unwrap();
        if let Some(obj) = json.as_object_mut() {
            obj.remove("id");
        }

        // Use raw query for robust serialization
        db.query("UPSERT type::thing('risk_profile', $id) CONTENT $data")
            .bind(("id", id))
            .bind(("data", json))
            .await
            .map_err(|e| e.to_string())?;

        println!("  ✓ {}", name);
    }

    Ok(())
}

pub async fn seed_growth_plans(db: &Surreal<Db>) -> Result<(), String> {
    println!("[SEED] 🧨 CLEAN RESET: Removendo planos de crescimento existentes...");
    db.query("DELETE FROM growth_plan;").await.map_err(|e| e.to_string())?;

    println!("[SEED] Verificando Planos de Crescimento...");

    let growth_phases: Vec<GrowthPhase> = vec![
        GrowthPhase {
            id: Some("growth_phase:institucional_f1".to_string()),
            level: 1,
            name: "Iniciante".to_string(),
            lot_size: 1,
            conditions_to_advance: vec![
                RiskCondition { metric: "profit_target".to_string(), operator: ">=".to_string(), value: 500.0 }
            ],
            conditions_to_demote: vec![
                RiskCondition { metric: "drawdown_limit".to_string(), operator: ">=".to_string(), value: 250.0 },
                RiskCondition { metric: "daily_loss_limit".to_string(), operator: ">=".to_string(), value: 100.0 }
            ]
        },
        GrowthPhase {
            id: Some("growth_phase:institucional_f2".to_string()),
            level: 2,
            name: "Estágio 2".to_string(),
            lot_size: 1,
            conditions_to_advance: vec![
                RiskCondition { metric: "profit_target".to_string(), operator: ">=".to_string(), value: 1000.0 }
            ],
            conditions_to_demote: vec![
                RiskCondition { metric: "drawdown_limit".to_string(), operator: ">=".to_string(), value: 400.0 },
                RiskCondition { metric: "daily_loss_limit".to_string(), operator: ">=".to_string(), value: 150.0 }
            ]
        },
        GrowthPhase {
            id: Some("growth_phase:institucional_f3".to_string()),
            level: 3,
            name: "Estágio 3".to_string(),
            lot_size: 2,
            conditions_to_advance: vec![
                RiskCondition { metric: "profit_target".to_string(), operator: ">=".to_string(), value: 2000.0 }
            ],
            conditions_to_demote: vec![
                RiskCondition { metric: "drawdown_limit".to_string(), operator: ">=".to_string(), value: 800.0 },
                RiskCondition { metric: "daily_loss_limit".to_string(), operator: ">=".to_string(), value: 250.0 }
            ]
        },
        GrowthPhase {
            id: Some("growth_phase:institucional_f4".to_string()),
            level: 4,
            name: "Estágio 4".to_string(),
            lot_size: 2,
            conditions_to_advance: vec![
                RiskCondition { metric: "profit_target".to_string(), operator: ">=".to_string(), value: 3000.0 }
            ],
            conditions_to_demote: vec![
                RiskCondition { metric: "drawdown_limit".to_string(), operator: ">=".to_string(), value: 1000.0 },
                RiskCondition { metric: "daily_loss_limit".to_string(), operator: ">=".to_string(), value: 300.0 }
            ]
        },
        GrowthPhase {
            id: Some("growth_phase:institucional_f5".to_string()),
            level: 5,
            name: "Estágio 5".to_string(),
            lot_size: 3,
            conditions_to_advance: vec![
                RiskCondition { metric: "profit_target".to_string(), operator: ">=".to_string(), value: 5000.0 }
            ],
            conditions_to_demote: vec![
                RiskCondition { metric: "drawdown_limit".to_string(), operator: ">=".to_string(), value: 1500.0 },
                RiskCondition { metric: "daily_loss_limit".to_string(), operator: ">=".to_string(), value: 400.0 }
            ]
        },
        GrowthPhase {
            id: Some("growth_phase:institucional_f6".to_string()),
            level: 6,
            name: "Estágio 6".to_string(),
            lot_size: 3,
            conditions_to_advance: vec![
                RiskCondition { metric: "profit_target".to_string(), operator: ">=".to_string(), value: 8000.0 }
            ],
            conditions_to_demote: vec![
                RiskCondition { metric: "drawdown_limit".to_string(), operator: ">=".to_string(), value: 2000.0 },
                RiskCondition { metric: "daily_loss_limit".to_string(), operator: ">=".to_string(), value: 500.0 }
            ]
        },
        GrowthPhase {
            id: Some("growth_phase:institucional_f7".to_string()),
            level: 7,
            name: "Estágio 7".to_string(),
            lot_size: 4,
            conditions_to_advance: vec![
                RiskCondition { metric: "profit_target".to_string(), operator: ">=".to_string(), value: 12000.0 }
            ],
            conditions_to_demote: vec![
                RiskCondition { metric: "drawdown_limit".to_string(), operator: ">=".to_string(), value: 3000.0 },
                RiskCondition { metric: "daily_loss_limit".to_string(), operator: ">=".to_string(), value: 750.0 }
            ]
        },
        GrowthPhase {
            id: Some("growth_phase:institucional_f8".to_string()),
            level: 8,
            name: "Fase Profissional".to_string(),
            lot_size: 6,
            conditions_to_advance: vec![
                RiskCondition { metric: "profit_target".to_string(), operator: ">=".to_string(), value: 20000.0 }
            ],
            conditions_to_demote: vec![
                RiskCondition { metric: "drawdown_limit".to_string(), operator: ">=".to_string(), value: 5000.0 },
                RiskCondition { metric: "daily_loss_limit".to_string(), operator: ">=".to_string(), value: 1000.0 }
            ]
        },
        GrowthPhase {
            id: Some("growth_phase:institucional_f9".to_string()),
            level: 9,
            name: "Fase Senior".to_string(),
            lot_size: 10,
            conditions_to_advance: vec![
                RiskCondition { metric: "profit_target".to_string(), operator: ">=".to_string(), value: 35000.0 }
            ],
            conditions_to_demote: vec![
                RiskCondition { metric: "drawdown_limit".to_string(), operator: ">=".to_string(), value: 8000.0 },
                RiskCondition { metric: "daily_loss_limit".to_string(), operator: ">=".to_string(), value: 1500.0 }
            ]
        },
        GrowthPhase {
            id: Some("growth_phase:institucional_f10".to_string()),
            level: 10,
            name: "Fase Master".to_string(),
            lot_size: 20,
            conditions_to_advance: vec![], // Última fase
            conditions_to_demote: vec![
                RiskCondition { metric: "drawdown_limit".to_string(), operator: ">=".to_string(), value: 15000.0 },
                RiskCondition { metric: "daily_loss_limit".to_string(), operator: ">=".to_string(), value: 2500.0 }
            ]
        }
    ];

    let plan = GrowthPlan {
        id: "growth_plan:institucional_10".to_string(),
        name: "Plano Institucional 10 Fases".to_string(),
        enabled: true,
        current_phase_index: 0,
        phases: growth_phases,
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
    Ok(())
}
