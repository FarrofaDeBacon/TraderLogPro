// src-tauri/src/seed/risk_seed.rs
use crate::models::{
    GrowthPhase, RiskCondition, RiskProfile,
};
use surrealdb::engine::local::Db;
use surrealdb::Surreal;

pub async fn seed_risk_profiles(
    db: &Surreal<Db>,
    filter: Option<Vec<String>>,
) -> Result<(), String> {
    println!("[SEED] Verificando Perfis de Risco...");

    // Seed WIN/WDO AssetRiskProfiles for the Prop Firm Mock
    let arp_win = crate::models::AssetRiskProfile {
        id: Some("asset_risk_profile:win_book4k".to_string()),
        name: "WIN (Book 4k)".to_string(),
        asset_id: surrealdb::sql::Thing::from(("asset".to_string(), "win".to_string())),
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
        asset_id: surrealdb::sql::Thing::from(("asset".to_string(), "wdo".to_string())),
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
        growth_enabled,
    ) in profiles
    {
        if let Some(ref f) = filter {
            if !f.contains(&id.to_string()) {
                continue;
            }
        }

        let growth_phases = if growth_enabled {
            vec![
                GrowthPhase {
                    id: Some(format!("{}_p1", id)),
                    level: 1,
                    name: "Starter".to_string(),
                    lot_size: 1,
                    conditions_to_advance: vec![
                        RiskCondition {
                            metric: "profit_target".to_string(),
                            operator: ">=".to_string(),
                            value: target * 5.0,
                        },
                        RiskCondition {
                            metric: "consistency_days".to_string(),
                            operator: ">=".to_string(),
                            value: 20.0,
                        },
                    ],
                    conditions_to_demote: vec![],
                },
                GrowthPhase {
                    id: Some(format!("{}_p2", id)),
                    level: 2,
                    name: "Scale Up".to_string(),
                    lot_size: 2,
                    conditions_to_advance: vec![RiskCondition {
                        metric: "profit_target".to_string(),
                        operator: ">=".to_string(),
                        value: target * 15.0,
                    }],
                    conditions_to_demote: vec![],
                },
            ]
        } else {
            vec![]
        };

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
            growth_plan_enabled: growth_enabled,
            current_phase_index: 0,
            growth_phases,
            psychological_coupling_enabled: false,
            outlier_regression_enabled: false,
            sniper_mode_enabled: false,
            sniper_mode_selectivity: 3,
            psychological_lookback_count: 10,
            outlier_lookback_count: 20,
            psychological_threshold: -2,
            lot_reduction_multiplier: 0.5,
            psychological_search_strategy: "Strict".to_string(),
            active: name == "Conservador", // Default one as active
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
