use crate::models::{Asset, Trade};
use crate::services::asset_service::AssetService;
use chrono::{NaiveDateTime, TimeZone, Utc};
use serde_json::Value;
use surrealdb::engine::local::Db;
use surrealdb::Surreal;
use tauri::State;
use crate::db::DbState;
use std::fs;
use encoding_rs::WINDOWS_1252;
use std::collections::HashMap;

#[derive(Debug, Clone)]
struct ProfitLine {
    symbol: String,
    entry_date: String,
    exit_date: Option<String>,
    quantity: f64,
    direction: String,
    entry_price: f64,
    exit_price: Option<f64>,
    result: f64,
    line_num: usize,
}

#[tauri::command]
pub async fn import_profit_trades(
    db: State<'_, DbState>,
    file_path: String,
    account_id: String,
) -> Result<String, String> {
    let bytes = fs::read(&file_path).map_err(|e| format!("Falha ao ler arquivo: {}", e))?;
    let (content, _, _) = WINDOWS_1252.decode(&bytes);

    let lines: Vec<&str> = content.lines().collect();
    
    // Find header
    let header_line_index = lines
        .iter()
        .position(|&line| line.trim().to_lowercase().starts_with("ativo;"));

    let start_index = match header_line_index {
        Some(index) => index + 1,
        None => return Err("Cabeçalho 'Ativo' não encontrado no arquivo CSV.".to_string()),
    };

    let mut raw_lines = Vec::new();

    for (line_num, line) in lines.iter().enumerate().skip(start_index) {
        let fields: Vec<&str> = line.split(';').collect();
        if fields.len() < 17 {
            continue;
        }

        let symbol = fields[0].trim().to_uppercase();
        if symbol.is_empty() {
            continue;
        }

        let entry_date_str = fields[1].trim();
        let exit_date_str = fields[2].trim();
        let quantity: f64 = fields[4].trim().replace(".", "").replace(",", ".").parse().unwrap_or(0.0);
        let side = fields[6].trim(); // "C" or "V"
        let entry_price_raw = fields[7].trim();
        let exit_price_raw = fields[8].trim();
        let result_raw = fields[13].trim();

        if quantity == 0.0 { continue; }

        let entry_date = parse_profit_datetime(entry_date_str)
            .map_err(|e| format!("Linha {}: {}", line_num + 1, e))?;
        let exit_date = parse_profit_datetime(exit_date_str).ok();
        
        let entry_price = parse_profit_currency(entry_price_raw)?;
        let exit_price = parse_profit_currency(exit_price_raw).ok();
        let result = parse_profit_currency(result_raw).unwrap_or(0.0);

        let direction = if side == "C" { "Buy".to_string() } else { "Sell".to_string() };

        raw_lines.push(ProfitLine {
            symbol,
            entry_date,
            exit_date,
            quantity,
            direction,
            entry_price,
            exit_price,
            result,
            line_num: line_num + 1,
        });
    }

    // Grouping by (Symbol, Account, EntryDate (Minute Window), Direction)
    let mut groups: HashMap<(String, String, String, String), Vec<ProfitLine>> = HashMap::new();
    for line in raw_lines {
        // Use slice to remove seconds for grouping (fuzzy grouping within the same minute)
        // ISO string: "2024-05-15T09:30:15Z" -> "2024-05-15T09:30"
        let entry_minute = if line.entry_date.len() >= 16 {
            line.entry_date[..16].to_string()
        } else {
            line.entry_date.clone()
        };
        
        let key = (line.symbol.clone(), account_id.clone(), entry_minute, line.direction.clone());
        groups.entry(key).or_default().push(line);
    }

    let mut imported_count = 0;
    for ((symbol, _, entry_date, direction), group_lines) in groups {
        // Aggregate values
        let total_quantity: f64 = group_lines.iter().map(|l| l.quantity).sum();
        let total_result: f64 = group_lines.iter().map(|l| l.result).sum();
        
        // Weighted average for prices
        let entry_price = group_lines.iter().map(|l| l.entry_price * l.quantity).sum::<f64>() / total_quantity;
        let exit_price = group_lines.iter().filter_map(|l| l.exit_price.map(|p| p * l.quantity)).sum::<f64>() / total_quantity;
        
        // Latest exit date
        let exit_date = group_lines.iter().filter_map(|l| l.exit_date.clone()).max();

        // Partials
        let partial_exits: Vec<serde_json::Value> = group_lines
            .iter()
            .map(|l| {
                serde_json::json!({
                    "date": l.exit_date.clone().unwrap_or_else(|| l.entry_date.clone()).replace(" ", "T").chars().take(16).collect::<String>(),
                    "price": l.exit_price.unwrap_or(l.entry_price),
                    "quantity": l.quantity,
                    "result": l.result,
                    "type": "exit",
                    "notes": format!("Importado da linha {}", l.line_num)
                })
            })
            .collect();

        // 1. Get or Create Asset with Full Metadata
        let asset_meta = get_or_create_asset(&db.0, &symbol).await
            .map_err(|e| format!("Erro ao processar ativo {}: {}", symbol, e))?;

        let asset_id = asset_meta.id.clone().unwrap_or_else(|| format!("asset:{}", symbol.to_lowercase()));
        let asset_type_id = asset_meta.asset_type_id.clone();
        let mut notes_override: Option<String> = None;
        
        // --- RESOLUÇÃO DE MODALIDADE ---
        let mut modality_id = "modality:m1".to_string(); // Default DayTrade
        if let Some(exit_dt) = &exit_date {
            // ISO format: "2024-05-15T09:30:15Z"
            if entry_date.len() >= 10 && exit_dt.len() >= 10 {
                let entry_day = &entry_date[..10];
                let exit_day = &exit_dt[..10];
                
                if entry_day != exit_day {
                    modality_id = "modality:m2".to_string(); // SwingTrade
                    println!("[IMPORT] Trade em '{}' identificado como SwingTrade ({} != {}).", symbol, entry_day, exit_day);
                } else {
                    println!("[IMPORT] Trade em '{}' identificado como DayTrade ({} == {}).", symbol, entry_day, exit_day);
                }
            } else {
                modality_id = "modality:m2".to_string(); // Fallback Seguro
                notes_override = Some("[REVISÃO REQUERIDA: Falha no cálculo de Modalidade]".to_string());
                println!("[IMPORT] [ERROR] Falha de parsing de data para modalidade em '{}'. Usando padrão SwingTrade com aviso de revisão. (Entry: {}, Exit: {:?})", symbol, entry_date, exit_date);
            }
        } else {
            println!("[IMPORT] Trade em '{}' sem data de saída. Assumindo DayTrade (m1).", symbol);
        }

        // 2. Create Trade Record
        let trade_id = uuid::Uuid::new_v4().to_string();
        let mut notes = format!("Importado do Profit (Agrupado de {} execuções)", group_lines.len());
        if let Some(over) = notes_override {
            notes = format!("{} - {}", over, notes);
        }
        
        let mut trade = Trade {
            id: format!("trade:⟨{}⟩", trade_id),
            date: entry_date,
            asset_symbol: symbol.clone(),
            asset_type_id,
            strategy_id: Some("strategy:manual".to_string()),
            account_id: Some(account_id.clone()),
            result: total_result,
            quantity: total_quantity,
            direction: direction.clone(),
            entry_price,
            exit_price: Some(exit_price),
            exit_date,
            fee_total: 0.0,
            notes,
            timeframe: "1m".to_string(),
            volatility: "Medium".to_string(),
            entry_emotional_state_id: None,
            entry_emotional_state_name: None,
            exit_reason: Some("Imported".to_string()),
            exit_emotional_state_id: None,
            exit_emotional_state_name: None,
            entry_rationale: "Imported from Profit Report (Grouped)".to_string(),
            psychology_analysis_during: "".to_string(),
            confirmation_signals: "External".to_string(),
            market_context: "B3".to_string(),
            relevant_news: "N/A".to_string(),
            followed_plan: true,
            what_worked: "".to_string(),
            mistakes_improvements: "".to_string(),
            lessons_learned: "".to_string(),
            images: vec![],
            partial_exits: crate::models::SurrealJson(serde_json::Value::Array(partial_exits)),
            asset_id: Some(asset_id.clone()),
            modality_id: Some(modality_id),
            stop_loss: None,
            take_profit: None,
            intensity: 5.0,
            tax_profile_id: None,
            effective_tax_profile_id: None,
            effective_fee_profile_id: None,
        };

        // --- RESOLUÇÃO CENTRALIZADA (Saneamento) ---
        let resolved_tax_profile = AssetService::resolve_trade_tax_profile_id(
            &db.0,
            &trade.effective_tax_profile_id,
            &trade.asset_id,
            &trade.asset_type_id
        ).await;

        let resolved_fee_profile = AssetService::resolve_trade_fee_profile_id(
            &db.0,
            &trade.effective_fee_profile_id,
            &trade.asset_id,
            &trade.asset_type_id,
            &trade.account_id
        ).await;

        trade.effective_tax_profile_id = resolved_tax_profile;
        trade.effective_fee_profile_id = resolved_fee_profile;

        let mut trade_json = serde_json::to_value(&trade).map_err(|e| e.to_string())?;
        if let Some(obj) = trade_json.as_object_mut() {
            obj.remove("id");
        }

        let query = format!("UPSERT trade:⟨{}⟩ CONTENT $data RETURN NONE", trade_id);
        let _ = db.0.query(&query).bind(("data", trade_json)).await.map_err(|e| e.to_string())?;

        // 3. Relational conversion
        let update_query = format!("
            UPDATE trade:⟨{}⟩ SET 
                account_id = type::thing(account_id),
                asset_type_id = type::thing(asset_type_id),
                asset_id = type::thing(asset_id),
                strategy_id = type::thing(strategy_id),
                modality_id = type::thing(modality_id),
                effective_tax_profile_id = (IF effective_tax_profile_id THEN type::thing(effective_tax_profile_id) ELSE null END),
                effective_fee_profile_id = (IF effective_fee_profile_id THEN type::thing(effective_fee_profile_id) ELSE null END)
            WHERE id = trade:⟨{}⟩;
        ", trade_id, trade_id);
        let _ = db.0.query(&update_query).await.map_err(|e| e.to_string())?;

        imported_count += 1;
    }

    Ok(format!("{} trades importados (agrupados) com sucesso!", imported_count))
}

async fn get_or_create_asset(db: &Surreal<Db>, symbol: &str) -> Result<Asset, String> {
    let clean_symbol = symbol.to_uppercase();
    let id_str = format!("asset:{}", clean_symbol.to_lowercase());

    // 1. Tentar encontrar ativo existente (Cadastro Real)
    let sql_find = "SELECT * FROM asset WHERE symbol = $sym LIMIT 1";
    let mut res = db.query(sql_find).bind(("sym", clean_symbol.clone())).await.map_err(|e: surrealdb::Error| e.to_string())?;
    let mut existing: Vec<Asset> = res.take(0).map_err(|e: surrealdb::Error| e.to_string())?;
    
    if let Some(asset) = existing.pop() {
        println!("[IMPORT] Ativo '{}' encontrado no cadastro real.", clean_symbol);
        return Ok(asset);
    }
    

    // 2. Se não existir, preparar criação com base na Raiz (Root)
    println!("[IMPORT] Ativo '{}' não encontrado. Iniciando criação automática...", clean_symbol);
    
    let mut root_asset: Option<Asset> = None;
    if clean_symbol.len() >= 3 {
        let prefix = &clean_symbol[..3];
        let sql_root = "SELECT * FROM asset WHERE is_root = true AND symbol = $prefix LIMIT 1";
        let mut root_res = db.query(sql_root).bind(("prefix", prefix.to_string())).await.map_err(|e: surrealdb::Error| e.to_string())?;
        let mut roots: Vec<Asset> = root_res.take(0).map_err(|e: surrealdb::Error| e.to_string())?;
        root_asset = roots.pop();
    }

    // Definir metadados por herança ou fallback
    let (asset_type_id, point_value, tax_profile_id, root_id, sector_id, subsector_id, origin) = if let Some(root) = root_asset {
        println!("[IMPORT] Ativo '{}' herdando metadados da Raiz '{}'.", clean_symbol, root.symbol);
        (
            root.asset_type_id.clone(),
            root.point_value,
            root.tax_profile_id.clone(),
            root.id.clone(),
            root.sector_id.clone(),
            root.subsector_id.clone(),
            "RAIZ"
        )
    } else {
        // Fallback Failsafe Final (Legado)
        let (inf_type, inf_point) = if clean_symbol.starts_with("WDO") {
            ("asset_type:at2", 10.0)
        } else if clean_symbol.starts_with("WIN") {
            ("asset_type:at2", 0.2)
        } else {
            ("asset_type:at1", 1.0) // Ações fallback
        };
        println!("[IMPORT] [FALLBACK] Ativo '{}' sem raiz encontrada. Inferindo: Type={}, Point={}", clean_symbol, inf_type, inf_point);
        (Some(inf_type.to_string()), inf_point, None, None, Some("sector:others".to_string()), None, "FALLBACK")
    };

    let new_asset = Asset {
        id: Some(id_str.clone()),
        symbol: clean_symbol.clone(),
        name: clean_symbol.clone(),
        asset_type_id,
        point_value,
        default_fee_id: None,
        tax_profile_id,
        is_root: false,
        root_id,
        sector_id,
        subsector_id,
        contract_size: None,
    };

    let mut asset_json = serde_json::to_value(&new_asset).map_err(|e| e.to_string())?;
    if let Some(obj) = asset_json.as_object_mut() {
        obj.remove("id");
    }

    db.query("UPSERT type::thing('asset', $sym) CONTENT $data RETURN NONE")
        .bind(("sym", clean_symbol.to_lowercase()))
        .bind(("data", asset_json))
        .await
        .map_err(|e: surrealdb::Error| e.to_string())?;

    // Relational clean-up (garante que IDs gravados como String virem Thing no Surreal)
    let update_sql = "
        UPDATE asset SET 
            asset_type_id = (IF type::is::string(asset_type_id) THEN type::thing(asset_type_id) ELSE asset_type_id END),
            root_id = (IF type::is::string(root_id) THEN type::thing(root_id) ELSE root_id END),
            tax_profile_id = (IF type::is::string(tax_profile_id) THEN type::thing(tax_profile_id) ELSE tax_profile_id END)
        WHERE symbol = $sym;
    ";
    db.query(update_sql).bind(("sym", clean_symbol)).await.map_err(|e: surrealdb::Error| e.to_string())?;

    println!("[IMPORT] Ativo '{}' criado com sucesso (Origem: {}).", symbol, origin);
    Ok(new_asset)
}

fn parse_profit_datetime(datetime_str: &str) -> Result<String, String> {
    let s = datetime_str.trim();
    if s.is_empty() {
        return Err("Data vazia".to_string());
    }
    // Expected: 15/05/2024 09:30:15 or 15/05/2024 09:30
    let fmt_with_seconds = "%d/%m/%Y %H:%M:%S";
    let fmt_without_seconds = "%d/%m/%Y %H:%M";
    
    if let Ok(ndt) = NaiveDateTime::parse_from_str(s, fmt_with_seconds) {
        // Assume local time (America/Sao_Paulo usually for B3 traders)
        // For simplicity and matching current project style, we might just store as UTC RFC3339
        return Ok(Utc.from_local_datetime(&ndt).unwrap().to_rfc3339());
    }
    if let Ok(ndt) = NaiveDateTime::parse_from_str(s, fmt_without_seconds) {
        return Ok(Utc.from_local_datetime(&ndt).unwrap().to_rfc3339());
    }
    Err(format!("Formato de data inválido: '{}'", datetime_str))
}

fn parse_profit_currency(currency_str: &str) -> Result<f64, String> {
    let s = currency_str.trim().replace(".", "").replace(",", ".");
    s.parse::<f64>().map_err(|e| {
        format!(
            "Formato de número inválido: '{}'. Erro: {}",
            currency_str, e
        )
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_profit_datetime() {
        assert!(parse_profit_datetime("15/05/2024 09:30:15").is_ok());
        assert!(parse_profit_datetime("15/05/2024 09:30").is_ok());
        assert!(parse_profit_datetime("invalid").is_err());
    }

    #[test]
    fn test_parse_profit_currency() {
        assert_eq!(parse_profit_currency("1.234,56").unwrap(), 1234.56);
        assert_eq!(parse_profit_currency("100,00").unwrap(), 100.0);
        assert_eq!(parse_profit_currency("0,20").unwrap(), 0.2);
    }

    #[test]
    fn test_date_part_extraction() {
        let rfc = "2026-03-10T10:15:33Z";
        let date_part = rfc.chars().take(10).collect::<String>();
        assert_eq!(date_part, "2026-03-10");
        
        let rfc2 = "2026-03-10T15:16:36.123+00:00";
        let date_part2 = rfc2.chars().take(10).collect::<String>();
        assert_eq!(date_part2, "2026-03-10");
    }

    #[test]
    fn test_grouping_logic_simulation() {
        let account_id = "test_acc".to_string();
        let raw_lines = vec![
            ProfitLine {
                symbol: "WINJ26".to_string(),
                entry_date: "2026-03-10T10:15:33Z".to_string(),
                exit_date: Some("2026-03-10T10:28:33Z".to_string()),
                quantity: 3.0,
                direction: "Sell".to_string(),
                entry_price: 183723.33,
                exit_price: Some(183561.67),
                result: -97.0,
                line_num: 5,
            },
            ProfitLine {
                symbol: "WINJ26".to_string(),
                entry_date: "2026-03-10T15:16:36Z".to_string(),
                exit_date: Some("2026-03-10T15:26:53Z".to_string()),
                quantity: 2.0,
                direction: "Sell".to_string(),
                entry_price: 186417.50,
                exit_price: Some(186310.00),
                result: -43.0,
                line_num: 15,
            },
        ];

        let mut groups: HashMap<(String, String, String, String), Vec<ProfitLine>> = HashMap::new();
        for line in raw_lines {
            let key = (line.symbol.clone(), account_id.clone(), line.entry_date.clone(), line.direction.clone());
            groups.entry(key).or_default().push(line);
        }

        assert_eq!(groups.len(), 2); // Should be 2 separate groups now
        let group1 = groups.get(&("WINJ26".to_string(), "test_acc".to_string(), "2026-03-10T10:15:33Z".to_string(), "Sell".to_string())).unwrap();
        assert_eq!(group1.len(), 1);
        let group2 = groups.get(&("WINJ26".to_string(), "test_acc".to_string(), "2026-03-10T15:16:36Z".to_string(), "Sell".to_string())).unwrap();
        assert_eq!(group2.len(), 1);
    }
}
