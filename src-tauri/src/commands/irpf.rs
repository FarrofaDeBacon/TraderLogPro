use crate::db::DbState;
use crate::logic::RuleBucket;
use crate::models::irpf::{TaxAppraisal, TaxDarf, TaxLoss};
use crate::models::{ToDto, Asset, AssetType, TaxMapping, TaxProfile, TaxProfileEntry, TaxRule};
use chrono::{Datelike, NaiveDate};
use serde::Deserialize;
use serde_json;
use tauri::State;

#[derive(Debug, Deserialize)]
struct IrpfTrade {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub date: String,
    #[serde(default)]
    pub asset_symbol: String,
    #[serde(default)]
    pub exit_date: Option<String>,
    #[serde(default)]
    pub result: Option<f64>,
    #[serde(default)]
    pub fee_total: Option<f64>,
    #[serde(default)]
    pub quantity: Option<f64>,
    #[serde(default)]
    pub exit_price: Option<f64>,
    #[serde(default)]
    pub modality_id: Option<String>,
    #[serde(default)]
    pub asset_id: Option<String>,
    #[serde(default)]
    pub asset_type_id: Option<String>,
    #[serde(default)]
    pub point_value: Option<f64>,
}


#[tauri::command]
pub async fn calculate_monthly_tax(db: State<'_, DbState>, month: u8, year: u16) -> Result<Vec<crate::models::dto::TaxAppraisalDto>, String> {
    println!(">>> ENTRY: calculate_monthly_tax(month={}, year={})", month, year);

    // 1. Fetch only trades for the requested month using SurrealQL string prefix filter
    // (string::starts_with is stable SurrealQL - avoids the broken NOT IN/NOT INSIDE syntax)
    let prefix = format!("{}-{:02}-", year, month);
    let query_trades = "SELECT
            type::string(id) as id,
            type::string(date) as date,
            (IF exit_date != NONE THEN type::string(exit_date) ELSE null END) as exit_date,
            (IF asset_id != NONE THEN type::string(asset_id) ELSE null END) as asset_id,
            (IF modality_id != NONE THEN type::string(modality_id) ELSE null END) as modality_id,
            type::string(asset_type_id) as trade_asset_type_id,
            type::float(result) as result,
            type::float(fee_total) as fee_total,
            type::float(quantity) as quantity,
            type::float(exit_price) as exit_price,
            (SELECT VALUE type::string(symbol) FROM asset WHERE id = $parent.asset_id LIMIT 1)[0] as asset_symbol,
            (SELECT VALUE (IF asset_type_id != NONE THEN type::string(asset_type_id) ELSE null END) FROM asset WHERE id = $parent.asset_id LIMIT 1)[0] as linked_asset_type_id,
            (SELECT VALUE type::float(point_value) FROM asset WHERE id = $parent.asset_id LIMIT 1)[0] as point_value
         FROM trade WHERE (exit_date IS NOT NONE) AND (result IS NOT NONE)
         AND string::starts_with(type::string(exit_date), $prefix)";

    let mut trade_res = db.0.query(query_trades)
        .bind(("prefix", prefix.clone()))
        .await
        .map_err(|e| e.to_string())?;

    let raw_trades: Vec<serde_json::Value> = trade_res.take(0).map_err(|e| {
        let err_msg = format!("RAW DESERIALIZATION ERROR: {}", e);
        println!("{}", err_msg);
        err_msg
    })?;

    println!("[IRPF] Found {} trades for period {}.", raw_trades.len(), prefix);


    let mut all_trades = Vec::new();
    for rt in raw_trades {
        let linked_at_id = rt["linked_asset_type_id"].as_str().map(|s| s.to_string());
        let trade_at_id = rt["trade_asset_type_id"].as_str().map(|s| s.to_string());
        let at_id = linked_at_id.or(trade_at_id);

        all_trades.push(IrpfTrade {
            id: rt["id"].as_str().unwrap_or("").to_string(),
            date: rt["date"].as_str().unwrap_or("").to_string(),
            asset_symbol: rt["asset_symbol"].as_str().unwrap_or("").to_string(),
            exit_date: rt["exit_date"].as_str().map(|s| s.to_string()),
            result: rt["result"].as_f64(),
            fee_total: rt["fee_total"].as_f64().or_else(|| rt["fees"].as_f64()),
            quantity: rt["quantity"].as_f64(),
            exit_price: rt["exit_price"].as_f64(),
            modality_id: rt["modality_id"].as_str().map(|s| s.to_string()),
            asset_id: rt["asset_id"].as_str().map(|s| s.to_string()),
            asset_type_id: at_id,
            point_value: rt["point_value"].as_f64(),
        });
    }

    // 2. The DB query already filters by prefix — use all_trades directly
    let trades_for_period = all_trades;
    println!("[IRPF] {} trades for period {}/{}", trades_for_period.len(), month, year);

    // 3. Existing appraisals for incremental exclusion logic

    let exist_query = "SELECT *, type::string(id) as id FROM tax_appraisal WHERE period_month = $month AND period_year = $year";
    let mut exist_res = db.0.query(exist_query).bind(("month", month)).bind(("year", year)).await.map_err(|e| e.to_string())?;
    let existing_raw: Vec<serde_json::Value> = exist_res.take(0).map_err(|e| e.to_string())?;
    let existing_appraisals: Vec<TaxAppraisal> = existing_raw.into_iter()
        .filter_map(|v| serde_json::from_value(v).ok())
        .collect();

    // 4. Identify which trades are already in Paid/Ok appraisals
    let mut already_appraised_ids = std::collections::HashSet::new();
    for app in &existing_appraisals {
        if app.status == "Paid" || app.status == "Ok" {
            for tid in &app.trade_ids {
                already_appraised_ids.insert(tid.clone());
            }
        }
    }

    let trades: Vec<IrpfTrade> = if !already_appraised_ids.is_empty() {
        println!("[IRPF] Excluding {} already-appraised trades", already_appraised_ids.len());
        trades_for_period.into_iter().filter(|t| !already_appraised_ids.contains(&t.id)).collect()
    } else {
        trades_for_period
    };

    if !already_appraised_ids.is_empty() && trades.is_empty() {
        println!("[IRPF] No NEW trades to appraise for {}/{}", month, year);
        return Ok(vec![]);
    }

    println!("[IRPF] {} trades to process", trades.len());

    // 5. Load reference data
    let mut asset_res = db.0.query("SELECT type::string(id) as id, symbol, name, type::string(asset_type_id) as asset_type_id, type::float(point_value) as point_value, (IF default_fee_id != NONE THEN type::string(default_fee_id) ELSE null END) as default_fee_id, (IF tax_profile_id != NONE THEN type::string(tax_profile_id) ELSE null END) as tax_profile_id FROM asset").await.map_err(|e| e.to_string())?;
    let assets: Vec<Asset> = asset_res.take(0).map_err(|e| e.to_string())?;

    let mut at_res = db.0.query("SELECT type::string(id) as id, name, code, type::string(market_id) as market_id, unit_label, result_type, (IF default_fee_id != NONE THEN type::string(default_fee_id) ELSE null END) as default_fee_id, (IF tax_profile_id != NONE THEN type::string(tax_profile_id) ELSE null END) as tax_profile_id FROM asset_type").await.map_err(|e| e.to_string())?;
    let mut asset_types: Vec<AssetType> = at_res.take(0).map_err(|e| e.to_string())?;

    // Auto-heal missing tax profiles for standard asset types
    for at in asset_types.iter_mut() {
        if at.tax_profile_id.is_none() {
            let clean = at.id.split(':').last().unwrap_or(&at.id);
            if clean == "at1" { at.tax_profile_id = Some("tax_profile:tp_acoes".to_string()); }
            else if clean == "at2" { at.tax_profile_id = Some("tax_profile:tp_futuros".to_string()); }
        }
    }

    let mut entry_res = db.0.query("SELECT type::string(id) as id, type::string(tax_profile_id) as tax_profile_id, type::string(modality_id) as modality_id, type::string(tax_rule_id) as tax_rule_id FROM tax_profile_entry").await.map_err(|e| e.to_string())?;
    let profile_entries: Vec<TaxProfileEntry> = entry_res.take(0).map_err(|e| e.to_string())?;

    let mut rule_res = db.0.query("SELECT type::string(id) as id, name, trade_type, revenue_code, tax_rate, withholding_rate, withholding_basis, exemption_threshold, cumulative_losses, basis FROM tax_rule").await.map_err(|e| e.to_string())?;
    let rules: Vec<TaxRule> = rule_res.take(0).map_err(|e| e.to_string())?;

    let mut loss_res = db.0.query("SELECT type::string(id) as id, trade_type, amount, balance, origin_date FROM tax_loss WHERE balance > 0").await.map_err(|e| e.to_string())?;
    let losses: Vec<TaxLoss> = loss_res.take(0).map_err(|e| e.to_string())?;

    println!("[IRPF] Loaded: {} assets, {} types, {} profile_entries, {} rules", assets.len(), asset_types.len(), profile_entries.len(), rules.len());

    // 6. Normalize IDs from SurrealDB format
    let normalize_id = |label: &str, s: &str| -> String {
        let mut clean = s.to_string();
        if clean.contains("String:") { clean = clean.split("String:").last().unwrap_or(&clean).to_string(); }
        clean = clean.replace(['{', '}', '"', '\'', ' ', '`'], "");
        let res = clean.split(':').last().unwrap_or(clean.as_str()).to_string();
        if !s.is_empty() { println!("[IRPF] normalize_id({}): '{}' -> '{}'", label, s, res); }
        res
    };

    // 7. Find tax rule for (profile, modality) pair
    let find_rule = |profile_id: &str, target_mod_id: &str| -> Option<TaxRule> {
        let clean_pid = normalize_id("ProfileParam", profile_id);
        let clean_mid = normalize_id("ModalityParam", target_mod_id);
        let entry = profile_entries.iter().find(|e| {
            normalize_id("EntryProfile", &e.tax_profile_id) == clean_pid &&
            normalize_id("EntryModality", &e.modality_id) == clean_mid
        });
        if let Some(e) = entry {
            let clean_rid = normalize_id("EntryRule", &e.tax_rule_id);
            rules.iter().find(|r| normalize_id("RuleId", &r.id) == clean_rid).cloned()
        } else {
            println!("[IRPF] No entry for profile={} modality={}", clean_pid, clean_mid);
            None
        }
    };

    // 8. Group trades into rule buckets
    use std::collections::HashMap;
    let mut buckets: HashMap<String, RuleBucket> = HashMap::new();

    for trade in &trades {
        let mut trade_mod_id = trade.modality_id.as_deref().unwrap_or("").to_string();
        if trade_mod_id.is_empty() || trade_mod_id == "null" {
            let ed = trade.date.split('T').next().unwrap_or("");
            let xd = trade.exit_date.as_deref().unwrap_or("").split('T').next().unwrap_or("");
            trade_mod_id = if !ed.is_empty() && ed == xd { "mod1".to_string() } else { "mod2".to_string() };
        }

        let initial_result = trade.result.unwrap_or(0.0) - trade.fee_total.unwrap_or(0.0);
        let mut final_profile_id: Option<String> = None;

        if let Some(aid) = &trade.asset_id {
            let clean_aid = normalize_id("AssetId", aid);
            if let Some(asset) = assets.iter().find(|a| normalize_id("AssetTblId", &a.id) == clean_aid || a.symbol == trade.asset_symbol) {
                if let Some(pid) = &asset.tax_profile_id { final_profile_id = Some(pid.clone()); }
            }
        }
        if final_profile_id.is_none() {
            if let Some(atid) = &trade.asset_type_id {
                let clean_atid = normalize_id("AssetTypeId", atid);
                if let Some(at) = asset_types.iter().find(|t| normalize_id("AssetTypeTblId", &t.id) == clean_atid) {
                    final_profile_id = at.tax_profile_id.clone();
                }
            }
        }

        if let Some(profile_id) = final_profile_id {
            if let Some(rule) = find_rule(&profile_id, &trade_mod_id) {
                let bucket_key = format!("{}:{}", rule.id, trade_mod_id);
                let entry = buckets.entry(bucket_key).or_insert(RuleBucket {
                    rule: rule.clone(),
                    gross_profit: 0.0,
                    gross_loss: 0.0,
                    sales_total: 0.0,
                    trade_ids: Vec::new(),
                });
                if initial_result > 0.0 { entry.gross_profit += initial_result; }
                else { entry.gross_loss += initial_result.abs(); }
                if rule.trade_type != "DayTrade" {
                    if let (Some(price), Some(qty)) = (trade.exit_price, trade.quantity) {
                        entry.sales_total += price * qty * trade.point_value.unwrap_or(1.0);
                    }
                }
                entry.trade_ids.push(trade.id.clone());
            }
        } else {
            println!("[IRPF] Trade {} skipped: no tax profile", trade.id);
        }
    }

    println!("[IRPF] {} buckets built.", buckets.len());

    // 9. Calculate appraisal per bucket
    let mut appraisals = Vec::new();
    let current_month_start = format!("{}-{:02}-01", year, month);

    for (rule_id, bucket) in buckets {
        let loss_category = bucket.rule.trade_type.clone();
        let norm_cat = loss_category.replace(' ', "").to_lowercase();

        let available_loss: f64 = losses.iter()
            .filter(|l| l.trade_type.replace(' ', "").to_lowercase() == norm_cat && l.origin_date < current_month_start)
            .map(|l| l.balance).sum();

        // Previous IRRF credit
        let mut credit_res = db.0.query("SELECT type::float(withholding_credit_remaining) as withholding_credit_remaining, period_year, period_month FROM tax_appraisal WHERE trade_type = $type")
            .bind(("type", loss_category.clone())).await.map_err(|e| e.to_string())?;
        let mut prev_credit_vec: Vec<serde_json::Value> = credit_res.take(0).map_err(|e| e.to_string())?;
        prev_credit_vec.retain(|v| {
            let py = v.get("period_year").and_then(|x| x.as_u64()).unwrap_or(0) as u16;
            let pm = v.get("period_month").and_then(|x| x.as_u64()).unwrap_or(0) as u8;
            py < year || (py == year && pm <= month)
        });
        prev_credit_vec.sort_by(|a, b| {
            let (ay, am) = (a.get("period_year").and_then(|x| x.as_u64()).unwrap_or(0), a.get("period_month").and_then(|x| x.as_u64()).unwrap_or(0));
            let (by, bm) = (b.get("period_year").and_then(|x| x.as_u64()).unwrap_or(0), b.get("period_month").and_then(|x| x.as_u64()).unwrap_or(0));
            (by, bm).cmp(&(ay, am))
        });
        let previous_credit = prev_credit_vec.first().and_then(|v| v.get("withholding_credit_remaining")).and_then(|t| t.as_f64()).unwrap_or(0.0);

        // Accumulated sub-R$10 appraisals
        let mut accum_res = db.0.query("SELECT type::float(total_payable) as total_payable, period_year, period_month FROM tax_appraisal WHERE trade_type = $type AND status = 'Pending'")
            .bind(("type", loss_category.clone())).await.map_err(|e| e.to_string())?;
        let mut prev_accum: Vec<serde_json::Value> = accum_res.take(0).map_err(|e| e.to_string())?;
        prev_accum.retain(|v| {
            let py = v.get("period_year").and_then(|x| x.as_u64()).unwrap_or(0) as u16;
            let pm = v.get("period_month").and_then(|x| x.as_u64()).unwrap_or(0) as u8;
            let tp = v.get("total_payable").and_then(|x| x.as_f64()).unwrap_or(0.0);
            tp < 10.0 && (py < year || (py == year && pm <= month))
        });
        prev_accum.sort_by(|a, b| {
            let (ay, am) = (a.get("period_year").and_then(|x| x.as_u64()).unwrap_or(0), a.get("period_month").and_then(|x| x.as_u64()).unwrap_or(0));
            let (by, bm) = (b.get("period_year").and_then(|x| x.as_u64()).unwrap_or(0), b.get("period_month").and_then(|x| x.as_u64()).unwrap_or(0));
            (by, bm).cmp(&(ay, am))
        });
        let tax_accumulated = prev_accum.first().and_then(|v| v.get("total_payable")).and_then(|t| t.as_f64()).unwrap_or(0.0);

        // Complementary check
        let mut paid_res = db.0.query("SELECT type::float(total_payable) as total_payable FROM tax_appraisal WHERE period_month = $month AND period_year = $year AND trade_type = $type AND status = 'Paid'")
            .bind(("month", month)).bind(("year", year)).bind(("type", loss_category.clone())).await.map_err(|e| e.to_string())?;
        let already_paid: f64 = paid_res.take::<Vec<serde_json::Value>>(0).map_err(|e| e.to_string())?
            .iter().map(|v| v.get("total_payable").and_then(|t| t.as_f64()).unwrap_or(0.0)).sum();

        let mut appraisal = crate::logic::calculate_appraisal(&bucket, month, year, available_loss, previous_credit, tax_accumulated, 0.0);
        appraisal.tax_rule_id = rule_id;
        appraisal.calculation_date = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        appraisal.is_complementary = already_paid > 0.0;
        appraisals.push(appraisal);
    }

    println!("DEBUG: Generated {} appraisals", appraisals.len());
    Ok(appraisals.into_iter().map(|a| crate::models::ToDto::to_dto(&a)).collect())
}

/// Lists saved appraisals
#[tauri::command]
pub async fn get_appraisals(
    db: State<'_, DbState>,
    year: Option<u16>,
) -> Result<Vec<crate::models::dto::TaxAppraisalDto>, String> {
    // PRE-MIGRATION: Robust multi-stage field renaming
    let migrations = vec![
        "UPDATE tax_appraisal SET period_month = month, period_year = year, month = NONE, year = NONE WHERE month != NONE",
        "UPDATE tax_appraisal SET period_month = appraisal_month, period_year = appraisal_year, appraisal_month = NONE, appraisal_year = NONE WHERE appraisal_month != NONE"
    ];
    for m in migrations {
        let _ = db.0.query(m).await;
    }

    let base_select = "SELECT \
        type::string(id) as id, \
        type::number(period_month) as period_month, \
        type::number(period_year) as period_year, \
        trade_type, \
        (IF tax_rule_id != NONE THEN type::string(tax_rule_id) ELSE null END) as tax_rule_id, \
        revenue_code, \
        type::float(gross_profit) as gross_profit, \
        type::float(loss) as loss, \
        type::float(net_profit) as net_profit, \
        type::float(compensated_loss) as compensated_loss, \
        type::float(calculation_basis) as calculation_basis, \
        type::float(tax_rate) as tax_rate, \
        type::float(tax_due) as tax_due, \
        type::float(withheld_tax) as withheld_tax, \
        type::float(withholding_credit_used) as withholding_credit_used, \
        type::float(withholding_credit_remaining) as withholding_credit_remaining, \
        type::float(tax_payable) as tax_payable, \
        type::float(tax_accumulated) as tax_accumulated, \
        type::float(total_payable) as total_payable, \
        is_exempt, \
        (IF calculation_date != NONE THEN type::string(calculation_date) ELSE '' END) as calculation_date, \
        status, \
        (SELECT VALUE type::string(self) FROM trade_ids) as trade_ids, \
        is_complementary \
        FROM tax_appraisal ";

    let query = if let Some(y) = year {
        format!("{} WHERE period_year = {} OR status = 'Pending'", base_select, y)
    } else {
        format!("{}", base_select)
    };

    let mut result = db.0.query(query).await.map_err(|e| e.to_string())?;
    let appraisals_json: Vec<crate::models::SurrealJson> = result.take(0).map_err(|e| e.to_string())?;
    
    let mut appraisals: Vec<TaxAppraisal> = appraisals_json.into_iter().filter_map(|v| serde_json::from_value(v.0).ok()).collect();

    // Sort descending by year then month
    appraisals.sort_by(|a, b| {
        b.period_year.cmp(&a.period_year)
            .then(b.period_month.cmp(&a.period_month))
    });

    Ok(appraisals.into_iter().map(|a| crate::models::ToDto::to_dto(&a)).collect())
}

#[tauri::command]
pub async fn save_appraisal(
    db: State<'_, DbState>,
    data: TaxAppraisal,
) -> Result<crate::models::dto::TaxAppraisalDto, String> {
    // --- NEW: LOSS RESTORATION (Undo previous compensation if updating) ---
    let query_existing = "SELECT *, type::string(id) as id FROM tax_appraisal WHERE period_month = $month AND period_year = $year AND trade_type = $type AND status = 'Pending' LIMIT 1";
    let mut check_res =
        db.0.query(query_existing)
            .bind(("month", data.period_month))
            .bind(("year", data.period_year))
            .bind(("type", data.trade_type.clone()))
            .await
            .map_err(|e| e.to_string())?;

    let existing_opt_json: Option<crate::models::SurrealJson> = check_res.take(0).map_err(|e| e.to_string())?;
    let existing_opt: Option<TaxAppraisal> = existing_opt_json.and_then(|v| serde_json::from_value(v.0).ok());

    if let Some(existing) = existing_opt {
        if existing.compensated_loss > 0.0 {
            println!(
                "[IRPF] Restoring {} losses from existing appraisal before update",
                existing.compensated_loss
            );
            let mut to_restore = existing.compensated_loss;

            // Restore LIFO (Newest first, reverse of FIFO usage)
            let loss_query = "SELECT *, type::string(id) as id FROM tax_loss WHERE trade_type = $type AND balance < amount ORDER BY origin_date DESC";
            let mut loss_result =
                db.0.query(loss_query)
                    .bind(("type", data.trade_type.clone()))
                    .await
                    .map_err(|e| e.to_string())?;

            let losses_to_restore_json: Vec<crate::models::SurrealJson> = loss_result.take(0).map_err(|e| e.to_string())?;
            let losses_to_restore: Vec<TaxLoss> = losses_to_restore_json.into_iter().filter_map(|v| serde_json::from_value(v.0).ok()).collect();
            for mut loss_record in losses_to_restore {
                if to_restore <= 0.0 {
                    break;
                }

                let can_restore = loss_record.amount - loss_record.balance;
                let restore_amount = if can_restore >= to_restore {
                    to_restore
                } else {
                    can_restore
                };

                loss_record.balance += restore_amount;
                to_restore -= restore_amount;

                if let Some(id_val) = loss_record.id.clone() {
                    let parts: Vec<&str> = id_val.split(':').collect();
                    let l_tb = if parts.len() > 1 {
                        parts[0]
                    } else {
                        "tax_loss"
                    };
                    let l_id = if parts.len() > 1 { parts[1] } else { &id_val };
                    loss_record.id = None;
                    let _: Option<crate::models::SurrealJson> =
                        db.0.query("UPDATE type::thing($tb, $id) SET balance = $bal")
                            .bind(("tb", l_tb.to_string()))
                            .bind(("id", l_id.to_string()))
                            .bind(("bal", loss_record.balance))
                            .await
                            .map_err(|e| e.to_string())?
                            .take(0)
                            .map_err(|e| e.to_string())?;
                }
            }
        }
    }

    // --- LOSS COMPENSATION LOGIC (Deducting new value) ---
    if data.compensated_loss > 0.0 {
        let mut remaining_compensation = data.compensated_loss;

        let loss_query = "SELECT \
            type::string(id) as id, \
            trade_type, \
            type::float(amount) as amount, \
            type::float(balance) as balance, \
            type::string(origin_date) as origin_date \
            FROM tax_loss WHERE balance > 0 AND (trade_type = $type OR trade_type = $alt_type) ORDER BY origin_date ASC";
        
        let alt_type = if data.trade_type == "SwingTrade" { "Swing Trade" } else { "Day Trade" };

        let mut loss_result =
            db.0.query(loss_query)
                .bind(("type", data.trade_type.clone()))
                .bind(("alt_type", alt_type))
                .await
                .map_err(|e| e.to_string())?;
        
        let losses_json: Vec<crate::models::SurrealJson> = loss_result.take(0usize).map_err(|e| {
            println!("[ERROR] save_appraisal (losses) deserialization failure: {}", e);
            e.to_string()
        })?;
        
        let losses: Vec<TaxLoss> = losses_json.into_iter().filter_map(|v| serde_json::from_value(v.0).ok()).collect();

        for mut loss_record in losses {
            if remaining_compensation <= 0.0 {
                break;
            }

            let deduction = if loss_record.balance >= remaining_compensation {
                remaining_compensation
            } else {
                loss_record.balance
            };

            loss_record.balance -= deduction;
            remaining_compensation -= deduction;

            // Update the loss record (strip ID from content to avoid conflict)
            if let Some(id_val) = loss_record.id.clone() {
                let parts: Vec<&str> = id_val.split(':').collect();
                let l_tb = if parts.len() > 1 {
                    parts[0]
                } else {
                    "tax_loss"
                };
                let l_id = if parts.len() > 1 { parts[1] } else { &id_val };
                loss_record.id = None;
                let _: Option<crate::models::SurrealJson> =
                    db.0.query("UPDATE type::thing($tb, $id) SET balance = $bal")
                        .bind(("tb", l_tb.to_string()))
                        .bind(("id", l_id.to_string()))
                        .bind(("bal", loss_record.balance))
                        .await
                        .map_err(|e| e.to_string())?
                        .take(0)
                        .map_err(|e| e.to_string())?;
            }
        }
    }

    // 2. If this month resulted in a NET loss, create a new TaxLoss record
    if data.net_profit < 0.0 {
        let loss_amount = data.net_profit.abs();
        let origin_date = format!("{}-{:02}-01", data.period_year, data.period_month);
        // First day of the month as origin

        let check_query = "SELECT \
            type::string(id) as id, \
            trade_type, \
            type::float(amount) as amount, \
            type::float(balance) as balance, \
            type::string(origin_date) as origin_date \
            FROM tax_loss WHERE origin_date = $date AND (trade_type = $type OR trade_type = $alt_type) LIMIT 1";
        
        let alt_type = if data.trade_type == "SwingTrade" { "Swing Trade" } else { "Day Trade" };

        let mut check_result =
            db.0.query(check_query)
                .bind(("date", origin_date.clone()))
                .bind(("type", data.trade_type.clone()))
                .bind(("alt_type", alt_type))
                .await
                .map_err(|e| e.to_string())?;
        
        let existing_loss_json: Option<crate::models::SurrealJson> = check_result.take(0).map_err(|e| {
            println!("[ERROR] save_appraisal (check_loss) deserialization failure: {}", e);
            e.to_string()
        })?;
        
        let existing_loss: Option<TaxLoss> = existing_loss_json.and_then(|v| serde_json::from_value(v.0).ok());

        if let Some(mut loss) = existing_loss {
            // Update existing loss record
            loss.amount = loss_amount;
            loss.balance = loss_amount; // Reset balance to full new loss for this month

            if let Some(lid) = &loss.id {
                let clean_lid = lid.split(':').last().unwrap_or(lid).replace("⟨", "").replace("⟩", "");
                
                let mut loss_json = serde_json::to_value(&loss).map_err(|e| e.to_string())?;
                if let Some(obj) = loss_json.as_object_mut() {
                    obj.remove("id");
                }

                let _: Option<crate::models::SurrealJson> =
                    db.0.query("UPDATE type::thing('tax_loss', $id) MERGE $data")
                        .bind(("id", clean_lid))
                        .bind(("data", loss_json))
                        .await
                        .map_err(|e| e.to_string())?
                        .take(0)
                        .map_err(|e| e.to_string())?;
            }
        } else {
            // Create new loss record
            let new_loss = TaxLoss {
                id: None,
                trade_type: data.trade_type.clone(),
                amount: data.loss,
                origin_date,
                balance: data.loss,
            };

            let _: Option<crate::models::SurrealJson> =
                db.0.query("CREATE tax_loss SET 
                    trade_type = $type,
                    amount = $amount,
                    origin_date = $date,
                    balance = $balance")
                    .bind(("type", new_loss.trade_type))
                    .bind(("amount", new_loss.amount))
                    .bind(("date", new_loss.origin_date))
                    .bind(("balance", new_loss.balance))
                    .await
                    .map_err(|e| e.to_string())?
                    .take(0)
                    .map_err(|e| e.to_string())?;
        }
    }
    // --- END LOSS COMPENSATION LOGIC ---

    // 1. If ID is present, update existing
    if let Some(id) = &data.id {
        let clean_tid = id.split(':').last().unwrap_or(id).replace("⟨", "").replace("⟩", "");

        let mut content_json = serde_json::to_value(&data).map_err(|e| e.to_string())?;
        if let Some(obj) = content_json.as_object_mut() {
            obj.remove("id");
        }

        let query_str = "UPDATE type::thing('tax_appraisal', $id) MERGE $data RETURN *, type::string(id) as id;";
        let mut update_res =
            db.0.query(query_str)
                .bind(("id", clean_tid))
                .bind(("data", content_json))
                .await
                .map_err(|e| {
                    println!("[IRPF] Error updating appraisal SDK: {}", e);
                    e.to_string()
                })?;

        let updated_json: Option<crate::models::SurrealJson> = update_res.take(0).map_err(|e| e.to_string())?;
        
        if let Some(v) = updated_json {
            match serde_json::from_value::<TaxAppraisal>(v.0) {
                Ok(updated) => return Ok(crate::models::ToDto::to_dto(&updated)),
                Err(e) => {
                    println!("[IRPF] Deserialization error after update: {}", e);
                    return Err(format!("Failed to deserialize updated record: {}", e));
                }
            }
        }
        return Err("Update returned no data".to_string());
    }

    // 2. If no ID, check if one exists for this Month/Year/Type to avoid duplicates
    // CRITICAL: Only match PENDING appraisals WITHOUT a generated DARF.
    // If a DARF exists, we create a NEW COMPLEMENTARY record to avoid changing the committed value.
    let query = "SELECT *, type::string(id) as id, (SELECT VALUE count() FROM tax_darf WHERE appraisal_id = $parent.id AND status = 'Pending') as pending_darf_count FROM tax_appraisal WHERE period_month = $month AND period_year = $year AND trade_type = $type AND status = 'Pending'";
    let mut result =
        db.0.query(query)
            .bind(("month", data.period_month))
            .bind(("year", data.period_year))
            .bind(("type", data.trade_type.clone()))
            .await
            .map_err(|e| e.to_string())?;

    let existing: Option<crate::models::SurrealJson> = result.take(0).map_err(|e| e.to_string())?;

    if let Some(surreal_val) = existing {
        let existing_val = surreal_val.0;
        let dc = existing_val["pending_darf_count"].as_i64().unwrap_or(0);
        if dc > 0 {
            println!("[IRPF] Existing Pending appraisal found, but it ALREADY has a DARF. Falling through to create a new complementary one.");
        } else {
            let id_str = existing_val["id"].as_str().unwrap_or("").to_string();
            if !id_str.is_empty() {
                let parts: Vec<&str> = id_str.split(':').collect();
                let tb = if parts.len() > 1 { parts[0].to_string() } else { "tax_appraisal".to_string() };
                let tid = if parts.len() > 1 { parts[1].to_string() } else { id_str.clone() };

                println!(
                    "[IRPF] Updating EXISTING record found by month/year/type: {}:{}",
                    tb, tid
                );

                // --- ULTRA-SAFE: Build manual map to avoid any struct serialization/enum issues ---
                let mut content_map = serde_json::Map::new();
                content_map.insert("period_month".to_string(), serde_json::json!(data.period_month));
                content_map.insert("period_year".to_string(), serde_json::json!(data.period_year));
                content_map.insert("trade_type".to_string(), data.trade_type.clone().into());
                content_map.insert("tax_rule_id".to_string(), data.tax_rule_id.clone().into());
                content_map.insert("revenue_code".to_string(), data.revenue_code.clone().into());
                content_map.insert("gross_profit".to_string(), data.gross_profit.into());
                content_map.insert("loss".to_string(), data.loss.into());
                content_map.insert("net_profit".to_string(), data.net_profit.into());
                content_map.insert("compensated_loss".to_string(), data.compensated_loss.into());
                content_map.insert("calculation_basis".to_string(), data.calculation_basis.into());
                content_map.insert("tax_rate".to_string(), data.tax_rate.into());
                content_map.insert("tax_due".to_string(), data.tax_due.into());
                content_map.insert("withheld_tax".to_string(), data.withheld_tax.into());
                content_map.insert("withholding_credit_used".to_string(), data.withholding_credit_used.into());
                content_map.insert("withholding_credit_remaining".to_string(), data.withholding_credit_remaining.into());
                content_map.insert("tax_payable".to_string(), data.tax_payable.into());
                content_map.insert("tax_accumulated".to_string(), data.tax_accumulated.into());
                content_map.insert("total_payable".to_string(), data.total_payable.into());
                content_map.insert("is_exempt".to_string(), data.is_exempt.into());
                content_map.insert("status".to_string(), data.status.clone().into());
                content_map.insert("calculation_date".to_string(), data.calculation_date.clone().into());
                content_map.insert("is_complementary".to_string(), data.is_complementary.into());

                // Merge trade IDs manually in the JSON object
                let mut combined_trades: Vec<String> = data.trade_ids.clone();
                if let Some(ext) = existing_val["trade_ids"].as_array() {
                    for t in ext {
                        let tid_str = if let Some(ts) = t.as_str() {
                            Some(ts.to_string())
                        } else if let Some(tob) = t.as_object() {
                            if let (Some(tb), Some(id)) = (tob.get("tb"), tob.get("id")) {
                                Some(format!("{}:{}", tb.as_str().unwrap_or(""), id.as_str().unwrap_or("")))
                            } else { None }
                        } else { None };

                        if let Some(ts) = tid_str {
                            if !combined_trades.contains(&ts) {
                                combined_trades.push(ts);
                            }
                        }
                    }
                }
                content_map.insert("trade_ids".to_string(), serde_json::json!(combined_trades));

                let mut update_res = db.0.query("UPDATE type::thing('tax_appraisal', $id) MERGE $data RETURN *, type::string(id) as id")
                    .bind(("id", tid))
                    .bind(("data", serde_json::Value::Object(content_map)))
                    .await
                    .map_err(|e| e.to_string())?;

                let updated_json: Option<crate::models::SurrealJson> =
                    update_res.take(0).map_err(|e| e.to_string())?;
                
                let updated = updated_json
                    .and_then(|v| serde_json::from_value::<TaxAppraisal>(v.0).ok())
                    .ok_or_else(|| "Failed to deserialize updated record".to_string())?;

                return Ok(crate::models::ToDto::to_dto(&updated));
            }
        }
    }

    // 3. Create new if doesn't exist
    println!("[IRPF] Creating NEW appraisal record");
    // --- ULTRA-SAFE: Build manual map for CREATE to avoid serialization issues ---
    let mut content_map = serde_json::Map::new();
    content_map.insert("period_month".to_string(), serde_json::json!(data.period_month));
    content_map.insert("period_year".to_string(), serde_json::json!(data.period_year));
    content_map.insert("trade_type".to_string(), data.trade_type.clone().into());
    content_map.insert("tax_rule_id".to_string(), data.tax_rule_id.clone().into());
    content_map.insert("revenue_code".to_string(), data.revenue_code.clone().into());
    content_map.insert("gross_profit".to_string(), data.gross_profit.into());
    content_map.insert("loss".to_string(), data.loss.into());
    content_map.insert("net_profit".to_string(), data.net_profit.into());
    content_map.insert("compensated_loss".to_string(), data.compensated_loss.into());
    content_map.insert("calculation_basis".to_string(), data.calculation_basis.into());
    content_map.insert("tax_rate".to_string(), data.tax_rate.into());
    content_map.insert("tax_due".to_string(), data.tax_due.into());
    content_map.insert("withheld_tax".to_string(), data.withheld_tax.into());
    content_map.insert("withholding_credit_used".to_string(), data.withholding_credit_used.into());
    content_map.insert("withholding_credit_remaining".to_string(), data.withholding_credit_remaining.into());
    content_map.insert("tax_payable".to_string(), data.tax_payable.into());
    content_map.insert("tax_accumulated".to_string(), data.tax_accumulated.into());
    content_map.insert("total_payable".to_string(), data.total_payable.into());
    content_map.insert("is_exempt".to_string(), data.is_exempt.into());
    content_map.insert("status".to_string(), data.status.clone().into());
    content_map.insert("calculation_date".to_string(), data.calculation_date.clone().into());
    content_map.insert("is_complementary".to_string(), data.is_complementary.into());
    content_map.insert("trade_ids".to_string(), serde_json::json!(data.trade_ids));

    let mut create_res =
        db.0.query("CREATE tax_appraisal CONTENT $data RETURN *, type::string(id) as id")
            .bind(("data", serde_json::Value::Object(content_map)))
            .await
            .map_err(|e| e.to_string())?;

    let created_json: Option<crate::models::SurrealJson> =
        create_res.take(0).map_err(|e| e.to_string())?;

    let created: TaxAppraisal = created_json
        .and_then(|v| serde_json::from_value(v.0).ok())
        .ok_or_else(|| "Failed to create new appraisal".to_string())?;

    // --- NEW: ACCUMULATION MERGE / COMPLEMENTARY DETECTION ---
    // If ANY appraisal already exists for this same period/type, this NEW one is complementary.
    let comp_query = "SELECT count() FROM tax_appraisal WHERE period_month = $month AND period_year = $year AND trade_type = $type AND id != $created_id";
    let mut comp_res = db.0.query(comp_query)
        .bind(("month", created.period_month))
        .bind(("year", created.period_year))
        .bind(("type", created.trade_type.clone()))
        .bind(("created_id", created.id.clone().unwrap_or("".to_string())))
        .await
        .map_err(|e| e.to_string())?;

    let paid_count: i64 = comp_res
        .take::<Vec<crate::models::SurrealJson>>(0)
        .map_err(|e| e.to_string())?
        .first()
        .and_then(|v| v.0.get("count"))
        .and_then(|c| c.as_i64())
        .unwrap_or(0);
    
    if paid_count > 0 {
        if let Some(id_str) = created.id.as_ref() {
            let clean_id = id_str.split(':').last().unwrap_or(id_str.as_str()).to_string();
            println!("[IRPF] Marking NEW appraisal as COMPLEMENTARY because a Paid one exists");
            let update_comp = "UPDATE type::thing('tax_appraisal', $id) SET is_complementary = true RETURN *";
            let mut comp_res = db.0.query(update_comp)
                .bind(("id", clean_id))
                .await
                .map_err(|e| e.to_string())?;
            
            let updated_comp_json: Option<crate::models::SurrealJson> = comp_res.take(0).map_err(|e| e.to_string())?;
            if let Some(v) = updated_comp_json {
                if let Ok(updated_comp) = serde_json::from_value::<TaxAppraisal>(v.0) {
                    return Ok(crate::models::ToDto::to_dto(&updated_comp));
                }
            }
        }
    }

    if created.tax_accumulated > 0.0 {
        let mark_query = "UPDATE tax_appraisal SET status = 'Paid', calculation_date = $now WHERE trade_type = $type AND status = 'Pending' AND total_payable < 10.0 AND (period_year < $year OR (period_year = $year AND period_month < $month))";
        db.0.query(mark_query)
            .bind(("type", created.trade_type.clone()))
            .bind(("year", created.period_year))
            .bind(("month", created.period_month))
            .bind((
                "now",
                chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
            ))
            .await
            .map_err(|e| e.to_string())?;
    }

    Ok(crate::models::ToDto::to_dto(&created))
}

#[tauri::command]
pub async fn get_accumulated_losses(db: State<'_, DbState>) -> Result<Vec<crate::models::dto::TaxLossDto>, String> {
    let mut loss_res = db.0.query("SELECT type::string(id) as id, trade_type, type::float(amount) as amount, type::float(balance) as balance, type::string(origin_date) as origin_date FROM tax_loss WHERE balance > 0 ORDER BY origin_date ASC").await.map_err(|e| e.to_string())?;
    let losses: Vec<TaxLoss> = loss_res.take(0).map_err(|e| e.to_string())?;
    Ok(losses.into_iter().map(|l| crate::models::ToDto::to_dto(&l)).collect())
}

#[tauri::command]
pub async fn get_appraisal_by_id(
    db: State<'_, DbState>,
    id: String,
) -> Result<Option<crate::models::dto::TaxAppraisalDto>, String> {
    let parts: Vec<&str> = id.split(':').collect();
    let tb = if parts.len() > 1 { parts[0] } else { "tax_appraisal" };
    let tid = if parts.len() > 1 { parts[1] } else { &id };

    let res_json: Option<crate::models::SurrealJson> = db.0.select((tb, tid)).await.map_err(|e| e.to_string())?;
    let appraisal: Option<TaxAppraisal> = res_json.and_then(|v| serde_json::from_value(v.0).ok());

    Ok(appraisal.map(|a| crate::models::ToDto::to_dto(&a)))
}

/// Deletes an appraisal and its associated tax loss if applicable
#[tauri::command]
pub async fn delete_appraisal(db: State<'_, DbState>, id: String) -> Result<(), String> {
    // 1. Fetch the appraisal to check if it generated a loss
    let parts: Vec<&str> = id.split(':').collect();
    let tb = if parts.len() > 1 {
        parts[0]
    } else {
        "tax_appraisal"
    };
    let tid = if parts.len() > 1 { parts[1] } else { &id };

    let appraisal_json: Option<crate::models::SurrealJson> =
        db.0.select((tb, tid)).await.map_err(|e| e.to_string())?;

    let appraisal: Option<TaxAppraisal> = appraisal_json.and_then(|v| serde_json::from_value(v.0).ok());

    if let Some(appraisal) = appraisal {
        // 2. If it generated a loss, delete the corresponding TaxLoss record
        if appraisal.net_profit < 0.0 {
            let origin_date = format!("{}-{:02}-01", appraisal.period_year, appraisal.period_month);

            // Find the tax_loss record
            let query = "SELECT * FROM tax_loss WHERE origin_date = $date AND trade_type = $type";
            let mut result =
                db.0.query(query)
                    .bind(("date", origin_date))
                    .bind(("type", appraisal.trade_type.clone()))
                    .await
                    .map_err(|e| e.to_string())?;

            let loss_record_json: Option<crate::models::SurrealJson> = result.take(0).map_err(|e| e.to_string())?;
            let loss_record: Option<TaxLoss> = loss_record_json.and_then(|v| serde_json::from_value(v.0).ok());

            if let Some(loss) = loss_record {
                if let Some(lid) = loss.id {
                    let parts: Vec<&str> = lid.split(':').collect();
                    let l_tb = if parts.len() > 1 {
                        parts[0]
                    } else {
                        "tax_loss"
                    };
                    let l_id = if parts.len() > 1 { parts[1] } else { &lid };

                    let _: Option<TaxLoss> =
                        db.0.delete((l_tb, l_id)).await.map_err(|e| e.to_string())?;
                }
            }
        }

        // 3. Delete associated DARFs to prevent orphans (but block if any is Paid)
        let darf_query = "SELECT *, type::string(id) as id FROM tax_darf WHERE appraisal_id = $id";
        let mut darf_result =
            db.0.query(darf_query)
                .bind(("id", id.clone()))
                .await
                .map_err(|e| e.to_string())?;

        let darfs_json: Vec<crate::models::SurrealJson> = darf_result.take(0).map_err(|e| e.to_string())?;
        let darfs: Vec<TaxDarf> = darfs_json.into_iter().filter_map(|v| serde_json::from_value(v.0).ok()).collect();

        // CHECK: If any DARF is paid, block appraisal deletion
        if darfs.iter().any(|d| d.status == "Paid") {
            return Err("Não é possível excluir uma apuração que possui DARF marcada como Paga. Estorne o pagamento primeiro.".to_string());
        }

        for darf in darfs {
            if let Some(did) = darf.id {
                let parts: Vec<&str> = did.split(':').collect();
                let d_tb = if parts.len() > 1 {
                    parts[0]
                } else {
                    "tax_darf"
                };
                let d_id = if parts.len() > 1 { parts[1] } else { &did };

                let _: Option<TaxDarf> =
                    db.0.delete((d_tb, d_id))
                        .await
                        .map_err(|e: surrealdb::Error| e.to_string())?;
            }
        }

        // 4. Delete the appraisal
        let parts: Vec<&str> = id.split(':').collect();
        let tb = if parts.len() > 1 {
            parts[0]
        } else {
            "tax_appraisal"
        };
        let tid = if parts.len() > 1 { parts[1] } else { &id };

        let _: Option<TaxAppraisal> = db.0.delete((tb, tid)).await.map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// Generates a DARF from an appraisal
#[tauri::command]
pub async fn generate_darf(
    db: State<'_, DbState>,
    appraisal_id: String,
) -> Result<crate::models::dto::TaxDarfDto, String> {
    println!(
        "DEBUG: generate_darf called for appraisal_id: {}",
        appraisal_id
    );

    // Fetch appraisal
    let parts: Vec<&str> = appraisal_id.split(':').collect();
    let tb = if parts.len() > 1 {
        parts[0]
    } else {
        "tax_appraisal"
    };
    let tid = if parts.len() > 1 {
        parts[1]
    } else {
        &appraisal_id
    };

    let appraisal_res: Option<crate::models::SurrealJson> = db.0.select((tb, tid)).await.map_err(|e| {
        println!("DEBUG: Failed to fetch appraisal: {}", e);
        e.to_string()
    })?;
    
    let sj = appraisal_res.ok_or("Appraisal not found")?;
    let appraisal: TaxAppraisal = serde_json::from_value(sj.0).map_err(|e| {
        println!("DEBUG: Failed to deserialize appraisal: {}", e);
        format!("Falha na desserialização da apuração: {}", e)
    })?;
    println!("DEBUG: Found appraisal for DARF: {:?}", appraisal);

    if appraisal.is_exempt {
        return Err("Esta apuração está marcada como ISENTA. Não há imposto a pagar.".to_string());
    }

    if appraisal.total_payable < 10.0 {
        return Err("Valor total (incluindo acumulados) inferior a R$ 10,00. Não é necessário gerar DARF ainda.".to_string());
    }

    // Use revenue code from appraisal with fallback for older records
    let revenue_code = if !appraisal.revenue_code.is_empty() {
        appraisal.revenue_code.clone()
    } else {
        // Fallback for old records: 6015 is standard for individuals in stock market
        "6015".to_string()
    };

    let period = format!("{:02}/{}", appraisal.period_month, appraisal.period_year);

    println!("DEBUG: Checking existing DARFs for this Appraisal ID...");
    // Identify if a DARF already exists for THIS appraisal
    let check_query = "SELECT *, \
        type::string(id) as id, \
        (IF appraisal_id != NONE THEN type::string(appraisal_id) ELSE null END) as appraisal_id, \
        (IF account_id != NONE THEN type::string(account_id) ELSE null END) as account_id, \
        (IF transaction_id != NONE THEN type::string(transaction_id) ELSE null END) as transaction_id \
        FROM tax_darf WHERE (IF appraisal_id != NONE THEN type::string(appraisal_id) ELSE '' END) = $appraisal_id";
    let mut check_result =
        db.0.query(check_query)
            .bind(("appraisal_id", appraisal_id.clone()))
            .await
            .map_err(|e| {
                println!("DEBUG: Failed to check existing DARFs query: {}", e);
                e.to_string()
            })?;

    let existing_darfs_json: Vec<crate::models::SurrealJson> = check_result.take(0).map_err(|e| {
        println!("DEBUG: Failed to deserialize existing DARFs: {}", e);
        e.to_string()
    })?;

    let existing_darfs: Vec<TaxDarf> = existing_darfs_json.into_iter().filter_map(|v| serde_json::from_value(v.0).ok()).collect();

    if !existing_darfs.is_empty() {
        println!("DEBUG: DARF already exists for this appraisal");
        return Err(
            "Uma DARF já existe para esta apuração. Verifique a Central de DARFs.".to_string(),
        );
    }

    // Calculate due date: last business day of the following month

    // Calculate due date: last business day of the following month
    let due_year = if appraisal.period_month == 12 {
        appraisal.period_year + 1
    } else {
        appraisal.period_year
    };
    let due_month = if appraisal.period_month == 12 {
        1
    } else {
        appraisal.period_month + 1
};

    let due_date_obj = NaiveDate::from_ymd_opt(due_year as i32, due_month as u32, 1)
        .unwrap()
        .with_day(1)
        .unwrap()
        .checked_add_months(chrono::Months::new(1))
        .unwrap()
        .pred_opt()
        .unwrap(); // Last day of next month
                   // period already defined above

    let darf = TaxDarf {
        id: None,
        appraisal_id,
        revenue_code: revenue_code.clone(),
        period,
        principal_value: appraisal.total_payable,
        fine: 0.0,
        interest: 0.0,
        total_value: appraisal.total_payable,
        due_date: due_date_obj.format("%Y-%m-%d").to_string(),
        payment_date: None,
        status: "Pending".to_string(),
        darf_number: None,
        account_id: None,
        transaction_id: None,
        is_complementary: appraisal.is_complementary,
    };

    let mut created_res = db.0.query("CREATE tax_darf SET 
        appraisal_id = $appraisal_id,
        revenue_code = $revenue_code,
        period = $period,
        principal_value = $principal_value,
        fine = $fine,
        interest = $interest,
        total_value = $total_value,
        due_date = $due_date,
        payment_date = $payment_date,
        status = $status,
        darf_number = $darf_number,
        account_id = $account_id,
        transaction_id = $transaction_id,
        is_complementary = $is_complementary
        RETURN *, type::string(id) as id")
        .bind(("appraisal_id", darf.appraisal_id))
        .bind(("revenue_code", darf.revenue_code))
        .bind(("period", darf.period))
        .bind(("principal_value", darf.principal_value))
        .bind(("fine", darf.fine))
        .bind(("interest", darf.interest))
        .bind(("total_value", darf.total_value))
        .bind(("due_date", darf.due_date))
        .bind(("payment_date", darf.payment_date))
        .bind(("status", darf.status))
        .bind(("darf_number", darf.darf_number))
        .bind(("account_id", darf.account_id))
        .bind(("transaction_id", darf.transaction_id))
        .bind(("is_complementary", darf.is_complementary))
        .await
        .map_err(|e| {
            println!("DEBUG: Failed to create DARF query: {}", e);
            e.to_string()
        })?;

    let created: Option<TaxDarf> = created_res
        .take(0)
        .map_err(|e| e.to_string())?;

    if let Some(ref d) = created {
        println!("DEBUG: DARF generated successfully with ID: {:?}", d.id);
    }

    created.map(|d| crate::models::ToDto::to_dto(&d)).ok_or_else(|| "Failed to generate DARF".to_string())
}

/// Lists DARFs
#[tauri::command]
pub async fn get_darfs(db: State<'_, DbState>, year: Option<u16>) -> Result<Vec<crate::models::dto::TaxDarfDto>, String> {
    println!("DEBUG: get_darfs called for year: {:?}", year);
    let (base_query, query_params) = if let Some(y) = year {
        let q = "SELECT \
            type::string(id) as id, \
            type::string(appraisal_id) as appraisal_id, \
            revenue_code, \
            period, \
            type::float(principal_value) as principal_value, \
            type::float(fine) as fine, \
            type::float(interest) as interest, \
            type::float(total_value) as total_value, \
            type::string(due_date) as due_date, \
            (IF payment_date != NONE THEN type::string(payment_date) ELSE null END) as payment_date, \
            status, \
            darf_number, \
            (IF account_id != NONE THEN type::string(account_id) ELSE null END) as account_id, \
            (IF transaction_id != NONE THEN type::string(transaction_id) ELSE null END) as transaction_id, \
            is_complementary \
            FROM tax_darf WHERE string::ends_with(period, $year) OR status = 'Pending' OR (payment_date != NONE AND string::starts_with(type::string(payment_date), $year)) ORDER BY due_date DESC";
        (q, Some(y.to_string()))
    } else {
        let q = "SELECT \
            type::string(id) as id, \
            type::string(appraisal_id) as appraisal_id, \
            revenue_code, \
            period, \
            type::float(principal_value) as principal_value, \
            type::float(fine) as fine, \
            type::float(interest) as interest, \
            type::float(total_value) as total_value, \
            type::string(due_date) as due_date, \
            (IF payment_date != NONE THEN type::string(payment_date) ELSE null END) as payment_date, \
            status, \
            darf_number, \
            (IF account_id != NONE THEN type::string(account_id) ELSE null END) as account_id, \
            (IF transaction_id != NONE THEN type::string(transaction_id) ELSE null END) as transaction_id, \
            is_complementary \
            FROM tax_darf ORDER BY due_date DESC";
        (q, None)
    };

    let mut result = if let Some(y) = query_params {
        db.0.query(base_query).bind(("year", y)).await.map_err(|e| e.to_string())?
    } else {
        db.0.query(base_query).await.map_err(|e| e.to_string())?
    };
    
    let darfs_json: Vec<crate::models::SurrealJson> = result.take(0).map_err(|e| e.to_string())?;
    let darfs: Vec<TaxDarf> = darfs_json.into_iter().filter_map(|v| serde_json::from_value(v.0).ok()).collect();

    Ok(darfs.into_iter().map(|d| crate::models::ToDto::to_dto(&d)).collect())
}

#[tauri::command]
pub async fn get_darf_by_id(db: State<'_, DbState>, id: String) -> Result<Option<crate::models::dto::TaxDarfDto>, String> {
    let parts: Vec<&str> = id.split(':').collect();
    let tb = if parts.len() > 1 { parts[0] } else { "tax_darf" };
    let tid = if parts.len() > 1 { parts[1] } else { &id };

    let sj_res: Option<crate::models::SurrealJson> = db.0.select((tb, tid)).await.map_err(|e| {
        println!("[ERROR] get_darf_by_id select failed: {}", e);
        e.to_string()
    })?;
    
    match sj_res {
        Some(sj) => {
            let darf: TaxDarf = serde_json::from_value(sj.0).map_err(|e| {
                println!("[ERROR] get_darf_by_id deserialization failed: {}", e);
                format!("Erro ao processar dados da DARF: {}", e)
            })?;
            Ok(Some(darf.to_dto()))
        },
        None => Ok(None)
    }
}

/// Marks DARF as paid, updates account balance, and creates a transaction
#[tauri::command]
pub async fn mark_darf_paid(
    db: State<'_, DbState>,
    id: String,
    payment_date: String,
    paid_value: f64,
    fine: Option<f64>,
    interest: Option<f64>,
    account_id: String,
    transaction_id: String,
) -> Result<crate::models::dto::TaxDarfDto, String> {
    let tid = if id.contains(':') { id.split(':').last().unwrap_or(&id) } else { &id };
    println!("[DEBUG] mark_darf_paid: Fetching DARF tid={} (original id={})", tid, id);
    
    let darf_res_json: Option<crate::models::SurrealJson> = db.0.select(("tax_darf", tid)).await.map_err(|e| e.to_string())?;
    
    let sj = darf_res_json.ok_or_else(|| {
        println!("[ERROR] mark_darf_paid: DARF {} not found in database", tid);
        "DARF not found".to_string()
    })?;
    
    let mut darf: TaxDarf = serde_json::from_value(sj.0).map_err(|e| {
        println!("[ERROR] mark_darf_paid deserialization failed: {}", e);
        format!("Erro ao processar dados da DARF: {}", e)
    })?;

    println!("[DEBUG] mark_darf_paid: Current DARF status in DB: '{}'", darf.status);

    // Prevent duplicate payments
    if darf.status == "Paid" {
        println!("[WARNING] mark_darf_paid: Rejecting payment because status is already 'Paid'");
        return Err("DARF is already marked as paid".to_string());
    }

    darf.payment_date = Some(payment_date.clone());
    darf.total_value = paid_value;
    darf.status = "Paid".to_string();

    if let Some(f) = fine {
        darf.fine = f;
    }

    if let Some(i) = interest {
        darf.interest = i;
    }

    darf.account_id = Some(account_id.clone());
    darf.transaction_id = Some(transaction_id.clone());

    // CRITICAL FIX: Remove ID from content to avoid "Found '...' for the 'id' field" error
    // We are updating the record *at* this ID, so we don't need to specify it in the content.
    // --- ULTRA-SAFE: Build manual map for TaxDarf update ---
    let mut content_map = serde_json::Map::new();
    content_map.insert("appraisal_id".to_string(), darf.appraisal_id.clone().into());
    content_map.insert("revenue_code".to_string(), darf.revenue_code.clone().into());
    content_map.insert("period".to_string(), darf.period.clone().into());
    content_map.insert("principal_value".to_string(), darf.principal_value.into());
    content_map.insert("fine".to_string(), darf.fine.into());
    content_map.insert("interest".to_string(), darf.interest.into());
    content_map.insert("total_value".to_string(), darf.total_value.into());
    content_map.insert("due_date".to_string(), darf.due_date.clone().into());
    content_map.insert("payment_date".to_string(), serde_json::json!(darf.payment_date));
    content_map.insert("status".to_string(), darf.status.clone().into());
    content_map.insert("darf_number".to_string(), serde_json::json!(darf.darf_number));
    content_map.insert("account_id".to_string(), serde_json::json!(darf.account_id));
    content_map.insert("transaction_id".to_string(), serde_json::json!(darf.transaction_id));
    content_map.insert("is_complementary".to_string(), darf.is_complementary.into());

    // 1. Update DARF record
    let clean_id = id.split(':').last().unwrap_or(&id).to_string();
    let update_query = "UPDATE type::thing('tax_darf', $id) MERGE $content RETURN *, type::string(id) as id";
    let mut update_result =
        db.0.query(update_query)
            .bind(("id", clean_id.clone()))
            .bind(("content", serde_json::Value::Object(content_map)))
            .await
            .map_err(|e| e.to_string())?;

    let updated_json: Option<crate::models::SurrealJson> = update_result.take(0).map_err(|e| e.to_string())?;
    let updated: Option<TaxDarf> = updated_json.and_then(|v| serde_json::from_value(v.0).ok());

    // 2. Update Appraisal Record
    let appraisal_id = darf.appraisal_id.clone();
    let parts: Vec<&str> = appraisal_id.split(':').collect();
    let aid_val = if parts.len() > 1 {
        parts[1]
    } else {
        &appraisal_id
    };

    let appraisal_result: Result<Option<TaxAppraisal>, _> =
        db.0.select(("tax_appraisal", aid_val)).await;

    if let Ok(Some(mut appraisal)) = appraisal_result {
        appraisal.status = "Paid".to_string();

        if let Some(aid) = &appraisal.id {
            let a_parts: Vec<&str> = aid.split(':').collect();
            let a_tb = if a_parts.len() > 1 {
                a_parts[0]
            } else {
                "tax_appraisal"
            };
            let a_id = if a_parts.len() > 1 { a_parts[1] } else { aid };

            // CRITICAL FIX: Strip ID to prevent SurrealDB error
            let mut appraisal_content = appraisal.clone();
            appraisal_content.id = None;

            let _: Option<TaxAppraisal> =
                db.0.update((a_tb, a_id))
                    .content(appraisal_content)
                    .await
                    .map_err(|e| e.to_string())?;

            // 3. Mark all PREVIOUS PENDING appraisals of the same type as PAID (Accumulation Clear)
            let trade_type_inner = appraisal.trade_type.clone();
            let clear_query = "UPDATE tax_appraisal SET status = 'Paid' WHERE trade_type = $type AND status = 'Pending' AND (period_year < $year OR (period_year = $year AND period_month < $month))";

            let _: surrealdb::Response =
                db.0.query(clear_query)
                    .bind(("type", trade_type_inner))
                    .bind(("year", appraisal.period_year))
                    .bind(("month", appraisal.period_month))
                    .await
                    .map_err(|e| e.to_string())?;
        }
    }

    println!(
        "[IRPF] Status updated for DARF {} and its appraisals.",
        clean_id
    );



    // --- FINANCIAL INTEGRATION (SIDE EFFECTS) ---
    // 1. Update Account Balance (atomic decrement)
    let acc_parts: Vec<String> = account_id.split(':').map(|s| s.to_string()).collect();
    let acc_tb = if acc_parts.len() > 1 {
        acc_parts[0].clone()
    } else {
        "account".to_string()
    };
    let acc_id_only = if acc_parts.len() > 1 {
        acc_parts[1].clone()
    } else {
        account_id.clone()
    };

    println!(
        "[DARF] Deducting {} from account:{}",
        paid_value, acc_id_only
    );
    let balance_query = "UPDATE type::thing($tb, $id) SET balance -= $val";

    match db
        .0
        .query(balance_query)
        .bind(("tb", acc_tb.clone()))
        .bind(("id", acc_id_only.clone()))
        .bind(("val", paid_value))
        .await
    {
        Ok(_) => println!("[DARF] Account balance updated successfully"),
        Err(e) => println!("[DARF] ERROR updating account balance: {}", e),
    }

    // 2. Create Cash Transaction (Expense) via bound query for Record IDs
    let tx_parts: Vec<String> = transaction_id.split(':').map(|s| s.to_string()).collect();
    let tx_tb = if tx_parts.len() > 1 {
        tx_parts[0].clone()
    } else {
        "cash_transaction".to_string()
    };
    let tx_id_only = if tx_parts.len() > 1 {
        tx_parts[1].clone()
    } else {
        transaction_id.clone()
    };

    println!(
        "[DARF] Creating cash_transaction:{}:{} for account:{}",
        tx_tb, tx_id_only, acc_id_only
    );
    let description = format!("Pagamento DARF {} ({})", darf.period, darf.revenue_code);

    // Use full payment_date string (which may contain time)
    let tx_query = "CREATE type::thing($tx_tb, $tx_id) SET 
        date = $date, 
        amount = $amount, 
        type = 'Withdraw', 
        description = $desc, 
        account_id = type::thing($acc_tb, $acc_id),
        category = 'TaxPayment',
        system_linked = true";

    match db
        .0
        .query(tx_query)
        .bind(("tx_tb", tx_tb))
        .bind(("tx_id", tx_id_only))
        .bind(("date", payment_date.clone()))
        .bind(("amount", 0.0 - paid_value))
        .bind(("desc", description))
        .bind(("acc_tb", acc_tb))
        .bind(("acc_id", acc_id_only))
        .await
    {
        Ok(_) => println!("[DARF] Cash transaction created successfully"),
        Err(e) => println!("[DARF] ERROR creating cash transaction: {}", e),
    }

    // --- END FINANCIAL INTEGRATION ---

    updated.map(|d| crate::models::ToDto::to_dto(&d)).ok_or_else(|| "Failed to update DARF".to_string())
}

#[tauri::command]
pub async fn diagnostic_dump_darfs(db: State<'_, DbState>) -> Result<(), String> {
    println!("[DIAGNOSTIC] Dumping all TAX_DARF records...");
    let mut result = db.0.query("SELECT *, type::string(id) as id, type::string(transaction_id) as tx_id_str FROM tax_darf").await.map_err(|e| e.to_string())?;
    let darfs: Vec<crate::models::SurrealJson> = result.take(0).map_err(|e| e.to_string())?;
    println!("[DIAGNOSTIC] Total DARFs found: {}", darfs.len());
    for d in darfs {
        println!(
            "[DIAGNOSTIC] DARF: {}",
            serde_json::to_string(&d).unwrap_or_default()
        );
    }
    Ok(())
}

#[tauri::command]
pub async fn diagnostic_fix_darf_status(
    db: State<'_, DbState>,
    id: String,
    target_status: String,
) -> Result<(), String> {
    let tid = if id.contains(':') { id.split(':').last().unwrap_or(&id) } else { &id };
    println!("[DIAGNOSTIC] Force updating DARF {} status to '{}'", tid, target_status);
    
    let _: surrealdb::Response = db.0.query("UPDATE type::thing('tax_darf', $id) SET status = $status")
        .bind(("id", tid.to_string()))
        .bind(("status", target_status))
        .await
        .map_err(|e| e.to_string())?;
        
    Ok(())
}

#[tauri::command]
pub async fn get_darf_by_transaction(
    db: State<'_, DbState>,
    transaction_id: String,
) -> Result<Option<crate::models::dto::TaxDarfDto>, String> {
    let q = "SELECT *, type::string(id) as id FROM tax_darf WHERE (IF transaction_id != NONE THEN type::string(transaction_id) ELSE '' END) = $tx_id";
    let mut result: surrealdb::Response = db.0.query(q).bind(("tx_id", transaction_id)).await.map_err(|e| e.to_string())?;
    let darf: Option<TaxDarf> = result.take(0).map_err(|e| e.to_string())?;
    Ok(darf.map(|d| crate::models::ToDto::to_dto(&d)))
}

/// Reverses a DARF payment (Unpay)
#[tauri::command]
pub async fn unpay_darf(db: State<'_, DbState>, id: String) -> Result<crate::models::dto::TaxDarfDto, String> {
    let parts: Vec<&str> = id.split(':').collect();
    let tb = if parts.len() > 1 {
        parts[0]
    } else {
        "tax_darf"
    };
    let tid = if parts.len() > 1 { parts[1] } else { &id };

    let darf_res: Option<TaxDarf> = db.0.select((tb, tid)).await.map_err(|e| e.to_string())?;

    let mut darf = darf_res.ok_or("DARF not found")?;

    if darf.status != "Paid" {
        return Err("DARF is not paid".to_string());
    }

    let paid_value = darf.total_value;

    // 1. Reverse Financial Transaction if linked
    let linked_acc_id = darf.account_id.clone();
    let linked_trans_id = darf.transaction_id.clone();

    println!(
        "[DARF UNPAY] Linked Account: {:?}, Linked Transaction: {:?}",
        linked_acc_id, linked_trans_id
    );

    // 1. Create Refund Transaction (Estorno) if we have the account info
    if let Some(acc_id) = linked_acc_id {
        let acc_parts: Vec<String> = acc_id.split(':').map(|s| s.to_string()).collect();
        let acc_tb = if acc_parts.len() > 1 {
            acc_parts[0].clone()
        } else {
            "account".to_string()
        };
        let acc_id_val = if acc_parts.len() > 1 {
            acc_parts[1].clone()
        } else {
            acc_id.clone()
        };

        // Refund Account Balance (atomic)
        println!(
            "[DARF UNPAY] Refunding {} to {}:{}",
            paid_value, acc_tb, acc_id_val
        );
        let refund_acc_query = "UPDATE type::thing($tb, $id) SET balance += $val";
        match db
            .0
            .query(refund_acc_query)
            .bind(("tb", acc_tb.clone()))
            .bind(("id", acc_id_val.clone()))
            .bind(("val", paid_value))
            .await
        {
            Ok(_) => println!("[DARF UNPAY] Account balance refunded successfully"),
            Err(e) => println!("[DARF UNPAY] ERROR refunding account balance: {}", e),
        }

        // Create a separate Deposit transaction for the refund (historical audit trail)
        // If we don't have a linked transaction ID (e.g., from seeder), derive one from the DARF ID
        let raw_tid = match linked_trans_id {
            Some(tid) => tid.split(':').last().unwrap_or(&tid).to_string(),
            None => format!("legacy_unpay_{}", tid), // tid is from darf lookup at start
        };

        let refund_tx_id = format!("refund_{}", raw_tid);
        let description = format!(
            "Estorno - Pagamento DARF {} ({})",
            darf.period, darf.revenue_code
        );

        // Use original payment date for the refund so they appear together in the statement
        // payment_date might be full ISO or just YYYY-MM-DD
        let refund_date = darf
            .payment_date
            .clone()
            .unwrap_or_else(|| chrono::Local::now().format("%Y-%m-%d").to_string());

        println!(
            "[DARF UNPAY] Creating refund transaction cash_transaction:{}",
            refund_tx_id
        );
        let refund_tx_query = "CREATE type::thing('cash_transaction', $id) SET 
            date = $date, 
            amount = $amount, 
            type = 'Deposit', 
            description = $desc, 
            account_id = type::thing($acc_tb, $acc_id),
            category = 'TaxRefund',
            system_linked = true";

        match db
            .0
            .query(refund_tx_query)
            .bind(("id", refund_tx_id))
            .bind(("date", refund_date))
            .bind(("amount", paid_value))
            .bind(("desc", description))
            .bind(("acc_tb", acc_tb.clone()))
            .bind(("acc_id", acc_id_val.clone()))
            .await
        {
            Ok(_) => println!("[DARF UNPAY] Refund cash transaction created successfully"),
            Err(e) => {
                println!("[DARF UNPAY] ERROR creating refund transaction: {}", e);
                // Don't error out the whole unpay, but log it
            }
        }
    } else {
        println!("[DARF UNPAY] WARNING: No linked account found for refund. Skipping financial reversal.");
    }

    // 2. Reset DARF Status
    darf.status = "Pending".to_string();
    darf.payment_date = None;
    darf.total_value = darf.principal_value; // Reset to principal (remove fine/interest from total)
    darf.fine = 0.0;
    darf.interest = 0.0;
    darf.account_id = None;
    darf.transaction_id = None;

    // CRITICAL FIX: Strip ID
    let mut darf_content = darf.clone();
    darf_content.id = None;

    let clean_id = id.split(':').last().unwrap_or(&id).to_string();
    let updated: Option<TaxDarf> =
        db.0.update(("tax_darf", clean_id))
            .content(darf_content)
            .await
            .map_err(|e| e.to_string())?;

    // 3. Update Appraisal Status
    let appraisal_id = darf.appraisal_id.clone();
    let parts: Vec<&str> = appraisal_id.split(':').collect();
    let aid_val = if parts.len() > 1 {
        parts[1]
    } else {
        &appraisal_id
    };

    let appraisal_result: Result<Option<TaxAppraisal>, _> =
        db.0.select(("tax_appraisal", aid_val)).await;

    if let Ok(Some(mut appraisal)) = appraisal_result {
        appraisal.status = "Pending".to_string();
        if let Some(aid) = &appraisal.id {
            let a_parts: Vec<&str> = aid.split(':').collect();
            let a_tb = if a_parts.len() > 1 {
                a_parts[0]
            } else {
                "tax_appraisal"
            };
            let a_id = if a_parts.len() > 1 { a_parts[1] } else { aid };

            // CRITICAL FIX: Strip ID
            let mut appraisal_content = appraisal.clone();
            appraisal_content.id = None;

            let _: Option<TaxAppraisal> =
                db.0.update((a_tb, a_id))
                    .content(appraisal_content)
                    .await
                    .map_err(|e| e.to_string())?;

            // 3. Mark all PREVIOUS PAID appraisals of the same type as PENDING (Revert Accumulation)
            // Only those that were accumulated (don't have their own specific Paid DARF)
            // However, to keep it simple and consistent with how mark_darf_paid works,
            // we revert all previous 'Paid' ones of the same type that are before this period.
            // A more precise check would ensure they don't have another paid DARF, but
            // since accumulation is strictly chronological, this is generally safe.
            let trade_type_inner = appraisal.trade_type.clone();
            let revert_query = "UPDATE tax_appraisal SET status = 'Pending' \
                WHERE trade_type = $type AND status = 'Paid' \
                AND (period_year < $year OR (period_year = $year AND period_month < $month))";

            let _: surrealdb::Response =
                db.0.query(revert_query)
                    .bind(("type", trade_type_inner))
                    .bind(("year", appraisal.period_year))
                    .bind(("month", appraisal.period_month))
                    .await
                    .map_err(|e| e.to_string())?;

            println!(
                "[DARF UNPAY] Reverted accumulation for appraisals before {}/{} ({})",
                appraisal.period_month, appraisal.period_year, appraisal.trade_type
            );
        }
    }

    updated.map(|d| crate::models::ToDto::to_dto(&d)).ok_or_else(|| "Failed to unpay DARF".to_string())
}

/// Deletes a DARF (blocks if paid - must use unpay_darf first)
#[tauri::command]
pub async fn delete_darf(db: State<'_, DbState>, id: String) -> Result<(), String> {
    let clean_id = id.split(':').last().unwrap_or(&id);

    // Check if DARF is paid - block deletion
    let darf_res: Option<TaxDarf> =
        db.0.select(("tax_darf", clean_id))
            .await
            .map_err(|e| e.to_string())?;

    if let Some(darf) = darf_res {
        if darf.status == "Paid" {
            return Err("Não é possível excluir uma DARF paga. Use 'Desfazer Pagamento' primeiro para estornar o valor.".to_string());
        }
    }

    let query = format!("DELETE tax_darf:{}", clean_id);
    db.0.query(&query).await.map_err(|e| e.to_string())?;
    Ok(())
}

/// Calculates interest and fine for late payment
#[tauri::command]
pub async fn calculate_interest_fine(
    value: f64,
    due_date: String,
    payment_date: String,
) -> Result<(f64, f64), String> {
    // Simplified implementation (Brazilian Federal Revenue Rule)
    // Fine: 0.33% per day of delay, capped at 20%
    // Interest: Accumulated SELIC + 1% in the month of payment

    let due = NaiveDate::parse_from_str(&due_date, "%Y-%m-%d").map_err(|_| "Invalid date")?;
    let pay = NaiveDate::parse_from_str(&payment_date, "%Y-%m-%d").map_err(|_| "Invalid date")?;

    if pay <= due {
        return Ok((0.0, 0.0));
    }

    let days_delay = (pay - due).num_days();
    let fine_perc = (days_delay as f64 * 0.0033).min(0.20);
    let fine = value * fine_perc;

    // Simplified interest (1% per month as placeholder for SELIC)
    let months_delay = days_delay / 30;
    let interest_perc = (months_delay as f64 * 0.01) + 0.01;
    let interest = value * interest_perc;

    Ok((fine, interest))
}

/// Resets all IRPF data (Appraisals, DARFs, Losses)
#[tauri::command]
pub async fn reset_irpf_data(db: State<'_, DbState>) -> Result<(), String> {
    db.0.query("DELETE FROM tax_appraisal")
        .await
        .map_err(|e| e.to_string())?;
    db.0.query("DELETE FROM tax_darf")
        .await
        .map_err(|e| e.to_string())?;
    db.0.query("DELETE FROM tax_loss")
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_tax_loss(db: State<'_, DbState>, id: String) -> Result<(), String> {
    let _: Option<TaxLoss> =
        db.0.delete(("tax_loss", &id))
            .await
            .map_err(|e| e.to_string())?;
    Ok(())
}


#[tauri::command]
pub async fn get_tax_rules(db: State<'_, DbState>) -> Result<Vec<crate::models::dto::TaxRuleDto>, String> {
    let mut result = db.0.query("SELECT *, type::string(id) as id FROM tax_rule").await.map_err(|e| e.to_string())?;
    let rules: Vec<TaxRule> = result.take(0).map_err(|e| e.to_string())?;
    Ok(rules.into_iter().map(|r| crate::models::ToDto::to_dto(&r)).collect())
}

#[tauri::command]
pub async fn save_tax_rule(db: State<'_, DbState>, rule: TaxRule) -> Result<crate::models::dto::TaxRuleDto, String> {
    let mut json = serde_json::to_value(&rule).map_err(|e| e.to_string())?;
    let id_str = rule.id.clone();
    let clean_id = id_str.split(':').last().unwrap_or(&id_str).to_string();
    if let Some(obj) = json.as_object_mut() { obj.remove("id"); }
    let mut response = db.0.query("UPSERT type::thing('tax_rule', $id) CONTENT $data RETURN *, type::string(id) as id")
            .bind(("id", clean_id)).bind(("data", json)).await.map_err(|e| e.to_string())?;
    let saved: TaxRule = response.take::<Option<TaxRule>>(0).map_err(|e| e.to_string())?
        .ok_or_else(|| "Failed to save tax rule".to_string())?;
    Ok(crate::models::ToDto::to_dto(&saved))
}

#[tauri::command]
pub async fn delete_tax_rule(db: State<'_, DbState>, id: String) -> Result<(), String> {
    let clean_id = id.split(':').last().unwrap_or(&id);
    let _ =
        db.0.query("DELETE type::thing('tax_rule', $id)")
            .bind(("id", clean_id.to_string()))
            .await;
    Ok(())
}

#[tauri::command]
pub async fn get_tax_mappings(db: State<'_, DbState>) -> Result<Vec<crate::models::dto::TaxMappingDto>, String> {
    let mut result = db.0.query("SELECT *, type::string(id) as id, type::string(asset_type_id) as asset_type_id, type::string(modality_id) as modality_id, type::string(tax_rule_id) as tax_rule_id FROM tax_mapping").await.map_err(|e| e.to_string())?;
    let mappings: Vec<TaxMapping> = result.take(0).map_err(|e| e.to_string())?;
    Ok(mappings.into_iter().map(|m| crate::models::ToDto::to_dto(&m)).collect())
}

#[tauri::command]
pub async fn save_tax_mapping(
    db: State<'_, DbState>,
    mapping: TaxMapping,
) -> Result<crate::models::dto::TaxMappingDto, String> {
    let mut json = serde_json::to_value(&mapping).map_err(|e| e.to_string())?;

    let id_str = mapping.id.clone();
    let clean_id = id_str.split(':').last().unwrap_or(&id_str).to_string();

    if let Some(obj) = json.as_object_mut() {
        obj.remove("id");
    }

    // Use raw query for robust serialization with custom IdVisitor
    let mut response =
        db.0.query("UPSERT type::thing('tax_mapping', $id) CONTENT $data RETURN *, type::string(id) as id")
            .bind(("id", clean_id))
            .bind(("data", json))
            .await
            .map_err(|e| e.to_string())?;

    let saved: TaxMapping = response.take::<Option<TaxMapping>>(0).map_err(|e| e.to_string())?
        .ok_or_else(|| "Failed to save tax mapping".to_string())?;
    Ok(crate::models::ToDto::to_dto(&saved))
}

#[tauri::command]
pub async fn delete_tax_mapping(db: State<'_, DbState>, id: String) -> Result<(), String> {
    let clean_id = id.split(':').last().unwrap_or(&id);
    let _ =
        db.0.query("DELETE type::thing('tax_mapping', $id)")
            .bind(("id", clean_id.to_string()))
            .await;
    Ok(())
}

// --- TAX PROFILES & ENTRIES (New Option B) ---

#[tauri::command]
pub async fn get_tax_profiles(db: State<'_, DbState>) -> Result<Vec<crate::models::dto::TaxProfileDto>, String> {
    let mut result =
        db.0.query("SELECT *, type::string(id) as id FROM tax_profile")
            .await
            .map_err(|e| e.to_string())?;
    let profiles: Vec<TaxProfile> = result.take(0).map_err(|e| e.to_string())?;
    Ok(profiles.into_iter().map(|p| crate::models::ToDto::to_dto(&p)).collect())
}

#[tauri::command]
pub async fn save_tax_profile(
    db: State<'_, DbState>,
    profile: TaxProfile,
) -> Result<crate::models::dto::TaxProfileDto, String> {
    let mut json = serde_json::to_value(&profile).map_err(|e| e.to_string())?;

    let id_str = profile.id.clone();
    let clean_id = id_str.split(':').last().unwrap_or(&id_str).to_string();

    if let Some(obj) = json.as_object_mut() {
        obj.remove("id");
    }

    // Use raw query for robust serialization with custom IdVisitor
    let mut response =
        db.0.query("UPSERT type::thing('tax_profile', $id) CONTENT $data RETURN *, type::string(id) as id")
            .bind(("id", clean_id))
            .bind(("data", json))
            .await
            .map_err(|e| e.to_string())?;

    let saved: TaxProfile = response.take::<Option<TaxProfile>>(0).map_err(|e| e.to_string())?
        .ok_or_else(|| "Failed to save tax profile".to_string())?;
    Ok(crate::models::ToDto::to_dto(&saved))
}

#[tauri::command]
pub async fn delete_tax_profile(db: State<'_, DbState>, id: String) -> Result<(), String> {
    let clean_id = id.split(':').last().unwrap_or(&id);

    // Delete profile
    let _ =
        db.0.query("DELETE type::thing('tax_profile', $id)")
            .bind(("id", clean_id.to_string()))
            .await;
    // Delete related entries (raw query handles relations fine if we use type::thing properly or direct strings)
    // Note: The related entries IDs aren't known, so we delete by condition, wrapping in tick marks to be safe
    let query_e = format!("DELETE tax_profile_entry WHERE tax_profile_id = type::thing('tax_profile:{}') OR tax_profile_id = 'tax_profile:{}' OR tax_profile_id = '{}'", clean_id, clean_id, clean_id);
    let _ = db.0.query(query_e).await;
    Ok(())
}

// --- TAX PROFILES & ENTRIES (New Option B) ---

#[tauri::command]
pub async fn get_tax_profile_entries(
    db: State<'_, DbState>,
    profile_id: Option<String>,
) -> Result<Vec<crate::models::dto::TaxProfileEntryDto>, String> {
    // Fallsback to format! to resolve persistent lifetime issues with bind in this async context
    let query = if let Some(pid) = profile_id {
        format!("SELECT *, type::string(id) as id, type::string(tax_profile_id) as tax_profile_id, type::string(modality_id) as modality_id, type::string(tax_rule_id) as tax_rule_id FROM tax_profile_entry WHERE tax_profile_id = '{}'", pid)
    } else {
        "SELECT *, type::string(id) as id, type::string(tax_profile_id) as tax_profile_id, type::string(modality_id) as modality_id, type::string(tax_rule_id) as tax_rule_id FROM tax_profile_entry".to_string()
    };

    let mut result = db.0.query(query).await.map_err(|e| e.to_string())?;

    let entries: Vec<TaxProfileEntry> = result.take(0).map_err(|e| e.to_string())?;
    Ok(entries.into_iter().map(|e| crate::models::ToDto::to_dto(&e)).collect())
}

#[tauri::command]
pub async fn save_tax_profile_entry(
    db: State<'_, DbState>,
    entry: TaxProfileEntry,
) -> Result<crate::models::dto::TaxProfileEntryDto, String> {
    let mut json = serde_json::to_value(&entry).map_err(|e| e.to_string())?;

    let id_str = entry.id.clone();
    let clean_id = id_str.split(':').last().unwrap_or(&id_str).to_string();

    if let Some(obj) = json.as_object_mut() {
        obj.remove("id");
    }

    // Use raw query for robust serialization with custom IdVisitor
    let mut response =
        db.0.query("UPSERT type::thing('tax_profile_entry', $id) CONTENT $data RETURN *, type::string(id) as id")
            .bind(("id", clean_id))
            .bind(("data", json))
            .await
            .map_err(|e| e.to_string())?;

    let saved: TaxProfileEntry = response.take::<Option<TaxProfileEntry>>(0).map_err(|e| e.to_string())?
        .ok_or_else(|| "Failed to save tax profile entry".to_string())?;
    Ok(crate::models::ToDto::to_dto(&saved))
}
#[tauri::command]
pub async fn delete_tax_profile_entry(db: State<'_, DbState>, id: String) -> Result<(), String> {
    let clean_id = id.split(':').last().unwrap_or(&id);
    let _ =
        db.0.query("DELETE type::thing('tax_profile_entry', $id)")
            .bind(("id", clean_id.to_string()))
            .await;
    Ok(())
}
