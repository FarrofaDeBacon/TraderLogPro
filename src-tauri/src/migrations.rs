use surrealdb::engine::local::Db;
use surrealdb::Surreal;
use crate::services::asset_service::AssetService;
use crate::db::normalize_id;
use crate::models::{Asset, AssetType, Subsector, TaxRule, TaxProfileEntry, FeeProfile, FeeProfileEntry, Trade};
    println!("[MIGRATION] Starting system-wide data sanitization...");

    // 1. Currency Sanitization for Accounts and UserProfile
    println!("[MIGRATION] Sanitizing Currency relational links...");
    let sql_currency = "
        -- 1.1 Account: currency_id (String -> Thing) + UNSET legacy currency
        UPDATE account SET 
            currency_id = (IF type::is::string(currency_id) AND currency_id != '' AND currency_id != null THEN type::thing(currency_id) ELSE currency_id END)
        WHERE type::is::string(currency_id);
        
        UPDATE account UNSET currency; 

        -- 1.2 UserProfile: main_currency (String -> Thing)
        UPDATE user_profile SET 
            main_currency = (
                IF type::is::string(main_currency) AND !string::contains(main_currency, ':') THEN 
                    type::thing('currency', string::lowercase(main_currency)) 
                ELSE 
                    main_currency 
                END
            )
        WHERE type::is::string(main_currency) AND !string::contains(main_currency, ':');
    ";
    db.query(sql_currency).await.map_err(|e| e.to_string())?;

    // 2. Relational Sanitization for Assets and Types
    println!("[MIGRATION] Sanitizing Asset and AssetType relational links...");
    let sql_assets = "
        -- 2.1 AssetType: market_id, default_fee_id, tax_profile_id
        UPDATE asset_type SET 
            market_id = (IF type::is::string(market_id) AND market_id != '' THEN type::thing(market_id) ELSE market_id END),
            default_fee_id = (IF type::is::string(default_fee_id) AND default_fee_id != '' THEN type::thing(default_fee_id) ELSE default_fee_id END),
            tax_profile_id = (IF type::is::string(tax_profile_id) AND tax_profile_id != '' THEN type::thing(tax_profile_id) ELSE tax_profile_id END)
        WHERE type::is::string(market_id) OR type::is::string(default_fee_id) OR type::is::string(tax_profile_id);

        -- 2.2 Sector: UNSET market_id (Economic Classification is now global)
        UPDATE sector UNSET market_id;

        -- 2.3 Subsector: sector_id
        UPDATE subsector SET 
            sector_id = (IF type::is::string(sector_id) AND sector_id != '' THEN type::thing(sector_id) ELSE sector_id END)
        WHERE type::is::string(sector_id);

        -- 2.4 Asset: all relational links including economic classification
        UPDATE asset SET 
            asset_type_id = (IF type::is::string(asset_type_id) AND asset_type_id != '' THEN type::thing(asset_type_id) ELSE asset_type_id END),
            tax_profile_id = (IF type::is::string(tax_profile_id) AND tax_profile_id != '' THEN type::thing(tax_profile_id) ELSE tax_profile_id END),
            default_fee_id = (IF type::is::string(default_fee_id) AND default_fee_id != '' THEN type::thing(default_fee_id) ELSE default_fee_id END),
            root_id = (IF type::is::string(root_id) AND root_id != '' THEN type::thing(root_id) ELSE root_id END),
            sector_id = (IF type::is::string(sector_id) AND sector_id != '' THEN type::thing(sector_id) ELSE sector_id END),
            subsector_id = (IF type::is::string(subsector_id) AND subsector_id != '' THEN type::thing(subsector_id) ELSE subsector_id END)
        WHERE type::is::string(asset_type_id) 
           OR type::is::string(tax_profile_id) 
           OR type::is::string(default_fee_id) 
           OR type::is::string(root_id)
           OR type::is::string(sector_id)
           OR type::is::string(subsector_id);
           
        -- 2.5 Account: default_fee_id
        UPDATE account SET 
            default_fee_id = (IF type::is::string(default_fee_id) AND default_fee_id != '' THEN type::thing(default_fee_id) ELSE default_fee_id END)
        WHERE type::is::string(default_fee_id);
    ";
    db.query(sql_assets).await.map_err(|e| e.to_string())?;

    // 3. Risk Rules Migration (Legacy fields in RiskProfile -> RiskRules)
    println!("[MIGRATION] Checking for legacy Risk Profiles...");
    
    // 3.1 Sanitization of Thing IDs in risk_profile
    let sql_risk_pre = "
        UPDATE risk_profile SET 
            linked_account_id = (IF type::is::string(linked_account_id) AND linked_account_id != '' THEN type::thing(linked_account_id) ELSE linked_account_id END),
            growth_plan_id = (IF type::is::string(growth_plan_id) AND growth_plan_id != '' THEN type::thing(growth_plan_id) ELSE growth_plan_id END)
        WHERE type::is::string(linked_account_id) OR type::is::string(growth_plan_id);
    ";
    db.query(sql_risk_pre).await.map_err(|e| e.to_string())?;

    // 3.2 Full Consolidation (Legacy -> risk_rules) - Idempotent
    let mut profiles_res = db.query("SELECT * FROM risk_profile").await.map_err(|e| e.to_string())?;
    let mut profiles: Vec<crate::models::RiskProfile> = profiles_res.take(0).map_err(|e| e.to_string())?;
    
    for profile in &mut profiles {
        let mut rules = profile.risk_rules.clone().unwrap_or_default();
        let mut updated = false;

        // Só migramos se não houver regras do mesmo tipo já presentes
        let has_rule = |target: &str| rules.iter().any(|r| r.target_type == target);

        // A. Max Daily Loss
        if profile.max_daily_loss > 0.0 && !has_rule("max_daily_loss") {
            rules.push(crate::models::RiskRule {
                id: format!("rule_mdl_{}", uuid::Uuid::new_v4()),
                name: "Limite de Perda Diária (Migrado)".to_string(),
                enabled: true,
                scope: "global".to_string(),
                target_type: "max_daily_loss".to_string(),
                operator: "<=".to_string(),
                value: serde_json::Value::from(profile.max_daily_loss),
                value_secondary: None,
                asset_risk_profile_ids: None,
            });
            updated = true;
        }

        // B. Daily Target
        if profile.daily_target > 0.0 && !has_rule("profit_target") {
            rules.push(crate::models::RiskRule {
                id: format!("rule_dt_{}", uuid::Uuid::new_v4()),
                name: "Meta de Lucro Diária (Migrada)".to_string(),
                enabled: true,
                scope: "global".to_string(),
                target_type: "profit_target".to_string(),
                operator: ">=".to_string(),
                value: serde_json::Value::from(profile.daily_target),
                value_secondary: None,
                asset_risk_profile_ids: None,
            });
            updated = true;
        }

        // C. Max Trades per Day
        if profile.max_trades_per_day > 0 && !has_rule("max_trades_per_day") {
            rules.push(crate::models::RiskRule {
                id: format!("rule_mtpd_{}", uuid::Uuid::new_v4()),
                name: "Máximo de Trades/Dia (Migrado)".to_string(),
                enabled: true,
                scope: "global".to_string(),
                target_type: "max_trades_per_day".to_string(),
                operator: "<=".to_string(),
                value: serde_json::Value::from(profile.max_trades_per_day),
                value_secondary: None,
                asset_risk_profile_ids: None,
            });
            updated = true;
        }

        // D. Combined Rules (Legacy)
        if let Some(cr_list) = &profile.combined_rules {
            for cr in cr_list {
                // Notação simplificada para evitar duplicatas básicas
                if !rules.iter().any(|r| r.name.contains(&cr.name)) {
                     rules.push(crate::models::RiskRule {
                        id: format!("rule_cr_{}", uuid::Uuid::new_v4()),
                        name: format!("Combinada: {} (Migrada)", cr.name),
                        enabled: cr.enabled,
                        scope: "combined".to_string(),
                        target_type: "sum_contracts".to_string(),
                        operator: if cr.operator == "=" { "<=".to_string() } else { cr.operator.clone() },
                        value: serde_json::Value::from(cr.limit_value),
                        value_secondary: None,
                        asset_risk_profile_ids: cr.asset_risk_profile_ids.clone(),
                    });
                    updated = true;
                }
            }
        }

        if updated {
            let clean_id = crate::db::normalize_id("", &profile.id);
            println!("[MIGRATION] Migrating {} legacy rules for profile '{}' ({}).", rules.len(), profile.name, clean_id);
            let _ = db.query(format!("UPDATE risk_profile:⟨{}⟩ SET risk_rules = $rules", clean_id))
                .bind(("rules", rules))
                .await;
        }
    }

    // 4. FISCAL CONSOLIDATION & SNAPSHOT MIGRATION
    println!("[MIGRATION] Consolidating Fiscal Profiles and sanitizing mappings...");
    
    let sql_fiscal_pre = "
        -- 4.1 TaxProfileEntry: tax_profile_id, modality_id, tax_rule_id (Sanitize Thing IDs)
        UPDATE tax_profile_entry SET 
            tax_profile_id = (IF type::is::string(tax_profile_id) AND tax_profile_id != '' THEN type::thing(tax_profile_id) ELSE tax_profile_id END),
            modality_id = (IF type::is::string(modality_id) AND modality_id != '' THEN type::thing(modality_id) ELSE modality_id END),
            tax_rule_id = (IF type::is::string(tax_rule_id) AND tax_rule_id != '' THEN type::thing(tax_rule_id) ELSE tax_rule_id END)
        WHERE type::is::string(tax_profile_id) OR type::is::string(modality_id) OR type::is::string(tax_rule_id);

        -- 4.2 Auto-Heal AssetType standard profiles (Idempotent)
        UPDATE asset_type SET tax_profile_id = type::thing('tax_profile:tp_acoes') WHERE tax_profile_id = NONE AND string::lowercase(code) = 'acoes';
        UPDATE asset_type SET tax_profile_id = type::thing('tax_profile:tp_futuros') WHERE tax_profile_id = NONE AND string::lowercase(code) = 'futuros';
        UPDATE asset_type SET tax_profile_id = type::thing('tax_profile:tp_opcoes') WHERE tax_profile_id = NONE AND string::lowercase(code) = 'opcoes';
    ";
    db.query(sql_fiscal_pre).await.map_err(|e| e.to_string())?;

    println!("[MIGRATION] Applying Fiscal Snapshots to existing trades...");
    
    // Fetch reference data using the new service logic
    let mut assets_res = db.query("SELECT * FROM asset").await.map_err(|e| e.to_string())?;
    let assets: Vec<crate::models::Asset> = assets_res.take(0).map_err(|e| e.to_string())?;
    
    let mut types_res = db.query("SELECT * FROM asset_type").await.map_err(|e| e.to_string())?;
    let asset_types: Vec<crate::models::AssetType> = types_res.take(0).map_err(|e| e.to_string())?;

    let mut trades_res = db.query("SELECT * FROM trade WHERE effective_tax_profile_id = NONE OR effective_tax_profile_id = ''").await.map_err(|e| e.to_string())?;
    let trades: Vec<crate::models::Trade> = trades_res.take(0).map_err(|e| e.to_string())?;
    
    use crate::services::asset_service::AssetService;
    use crate::db::normalize_id;

    for trade in trades {
        let asset = if let Some(aid) = &trade.asset_id {
            let clean_aid = normalize_id("", aid);
            assets.iter().find(|a| normalize_id("", a.id.as_deref().unwrap_or("")) == clean_aid)
        } else { None };

        let asset_type = if let Some(atid) = &trade.asset_type_id {
            let clean_atid = normalize_id("", atid);
            asset_types.iter().find(|at| normalize_id("", at.id.as_deref().unwrap_or("")) == clean_atid)
        } else if let Some(a) = asset {
             if let Some(atid) = &a.asset_type_id {
                let clean_atid = normalize_id("", atid);
                asset_types.iter().find(|at| normalize_id("", at.id.as_deref().unwrap_or("")) == clean_atid)
             } else { None }
        } else { None };

        // --- SNAPSHOT FISCAL (Resolution) ---
        let profile_id = AssetService::resolve_trade_tax_profile_id(
            db,
            &trade.effective_tax_profile_id,
            &trade.asset_id,
            &trade.asset_type_id
        ).await;

        if let Some(pid) = profile_id {
            let clean_trade_id = normalize_id("", &trade.id);
            let clean_pid = normalize_id("", &pid);
            let update_sql = format!("UPDATE trade:⟨{}⟩ SET effective_tax_profile_id = type::thing('tax_profile', $pid)", clean_trade_id);
            let _ = db.query(update_sql).bind(("pid", clean_pid)).await;
        }
    }

    // 5. FEE CONSOLIDATION & SNAPSHOT MIGRATION
    println!("[MIGRATION] Consolidating Fee Profiles and creating modality entries...");
    
    // 5.1 Create Entries for existing FeeProfiles (Idempotent)
    let mut fee_profiles_res = db.query("SELECT * FROM fee_profile").await.map_err(|e| e.to_string())?;
    let fee_profiles: Vec<FeeProfile> = fee_profiles_res.take(0).map_err(|e| e.to_string())?;
    
    for profile in fee_profiles {
        let clean_pid = normalize_id("", &profile.id);
        
        // Verifica se já existem entradas para este perfil para evitar duplicatas
        let check_sql = format!("SELECT count() FROM fee_profile_entry WHERE fee_profile_id = fee_profile:⟨{}⟩ GROUP ALL", clean_pid);
        let mut check_res = db.query(check_sql).await.map_err(|e| e.to_string())?;
        let count_res: Vec<serde_json::Value> = check_res.take(0).map_err(|e| e.to_string())?;
        let count = count_res.first().and_then(|v| v.get("count")).and_then(|v| v.as_u64()).unwrap_or(0);
        
        if count == 0 {
            println!("[MIGRATION] Creating legacy modality entries for FeeProfile '{}'", profile.name);
            // Criar para mod1 (Day Trade) e mod2 (Swing Trade)
            for mod_id in &["mod1", "mod2"] {
                let entry_id = format!("fpe_{}_{}", clean_pid, mod_id);
                let sql_entry = "
                    UPSERT type::thing('fee_profile_entry', $id) CONTENT {
                        fee_profile_id: type::thing('fee_profile', $pid),
                        modality_id: type::thing('modality', $mid),
                        fixed_fee: $fixed,
                        percentage_fee: $pct,
                        exchange_fee: $exch,
                        iss: $iss,
                        currency_spread: $spread,
                        withholding_tax: $wt,
                        income_tax_rate: $itr,
                        metadata: {}
                    }
                ";
                let _ = db.query(sql_entry)
                    .bind(("id", entry_id))
                    .bind(("pid", clean_pid.clone()))
                    .bind(("mid", mod_id.to_string()))
                    .bind(("fixed", profile.fixed_fee))
                    .bind(("pct", profile.percentage_fee))
                    .bind(("exch", profile.exchange_fee))
                    .bind(("iss", profile.iss))
                    .bind(("spread", profile.currency_spread))
                    .bind(("wt", profile.withholding_tax))
                    .bind(("itr", profile.income_tax_rate))
                    .await;
            }
        }
    }

    println!("[MIGRATION] Applying Operational Fee Snapshots to existing trades...");
    
    // Fetch accounts to resolve fallback
    let mut acc_res = db.query("SELECT * FROM account").await.map_err(|e| e.to_string())?;
    let accounts: Vec<crate::models::Account> = acc_res.take(0).map_err(|e| e.to_string())?;

    let mut fee_trades_res = db.query("SELECT * FROM trade WHERE effective_fee_profile_id = NONE OR effective_fee_profile_id = ''").await.map_err(|e| e.to_string())?;
    let fee_trades: Vec<Trade> = fee_trades_res.take(0).map_err(|e| e.to_string())?;

    for trade in fee_trades {
        let asset = if let Some(aid) = &trade.asset_id {
            let clean_aid = normalize_id("", aid);
            assets.iter().find(|a| normalize_id("", a.id.as_deref().unwrap_or("")) == clean_aid)
        } else { None };

        let asset_type = if let Some(atid) = &trade.asset_type_id {
            let clean_atid = normalize_id("", atid);
            asset_types.iter().find(|at| normalize_id("", at.id.as_deref().unwrap_or("")) == clean_atid)
        } else if let Some(a) = asset {
             if let Some(atid) = &a.asset_type_id {
                let clean_atid = normalize_id("", atid);
                asset_types.iter().find(|at| normalize_id("", at.id.as_deref().unwrap_or("")) == clean_atid)
             } else { None }
        } else { None };
        
        let account = if let Some(acc_id) = &trade.account_id {
            let clean_acc_id = normalize_id("", acc_id);
            accounts.iter().find(|acc| normalize_id("", acc.id.as_deref().unwrap_or("")) == clean_acc_id)
        } else { None };

        // --- SNAPSHOT FEE (Resolution) ---
        let profile_id = AssetService::resolve_trade_fee_profile_id(
            db,
            &trade.effective_fee_profile_id,
            &trade.asset_id,
            &trade.asset_type_id,
            &trade.account_id
        ).await;

        if let Some(pid) = profile_id {
            let clean_trade_id = normalize_id("", &trade.id);
            let clean_pid = normalize_id("", &pid);
            let update_sql = format!("UPDATE trade:⟨{}⟩ SET effective_fee_profile_id = type::thing('fee_profile', $pid)", clean_trade_id);
            let _ = db.query(update_sql).bind(("pid", clean_pid)).await;
        }
    }

    println!("[MIGRATION] Data sanitization COMPLETED.");
    Ok(())
}
