use crate::db::DbState;
use crate::models::{Account, Currency, Trade, EmotionalState, AssetType, Asset};
use tauri::State;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Datelike, Timelike};

// --- Enums Constraints ---

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum StrategyDiagnosticStatus {
    Hot,
    Neutral,
    Cold,
    InsufficientData,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum StrategyRecentTrend {
    Uptrend,
    Downtrend,
    Choppy,
    InsufficientData,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum StrategyStability {
    Stable,
    Volatile,
    InsufficientData,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum StrategyRiskLevel {
    Low,
    Moderate,
    Critical,
    InsufficientData,
}

// --- Data Structures ---

#[derive(Serialize, Deserialize, Clone)]
pub struct DiagnosticPayload {
    pub status: StrategyDiagnosticStatus,
    pub recent_trend: StrategyRecentTrend,
    pub stability: StrategyStability,
    pub current_risk: StrategyRiskLevel,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DatasetCurve {
    pub dates: Vec<String>,
    pub data: Vec<f64>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct RecentMetrics {
    pub trade_count: usize,
    pub pnl: f64,
    pub win_rate: f64,
    pub window_size: usize,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct EmotionBreakdown {
    pub emotion_id: Option<String>,
    pub emotion_name: Option<String>,
    pub trade_count: usize,
    pub win_rate: f64,
    pub net_result: f64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct AssetBreakdown {
    pub asset_symbol: String,
    pub trade_count: usize,
    pub net_result: f64,
    pub win_rate: f64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct OperationalContext {
    pub best_time_of_day: Option<String>,
    pub worst_time_of_day: Option<String>,
    pub best_asset: Option<String>,
    pub worst_asset: Option<String>,
    pub best_direction: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct PsychologyContext {
    pub emotion_breakdown: Vec<EmotionBreakdown>,
    /// Fórmula: (Losses acumulados em estados negativos / Total Loss Cumulativo) * 100
    /// Onde estados negativos são emoções marcadas como `impact == "Negative"` no DB.
    pub negative_state_loss_ratio: f64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct StrategyComprehensiveStats {
    pub net_result: f64,
    pub win_rate: f64,
    pub profit_factor: f64,
    pub payoff: f64,
    pub math_expectation: f64,
    pub max_drawdown: f64,
    pub recovery_factor: f64,
    pub total_trades: usize,
    pub winning_trades: usize,
    pub best_trade: f64,
    pub worst_trade: f64,
    pub avg_duration_win: i64,
    pub avg_duration_loss: i64,
    pub avg_time_between_trades: f64,
    pub plan_adherence: f64,
    
    pub equity_curve: DatasetCurve,
    pub drawdown_curve: DatasetCurve,
    pub heatmap: Vec<Vec<f64>>, // [0=Sun..6=Sat][0..23 hours]
    
    pub recent_metrics: RecentMetrics,
    pub asset_breakdown: Vec<AssetBreakdown>,
    
    pub diagnostic: DiagnosticPayload,
    pub psychology: PsychologyContext,
    pub operational: OperationalContext,
}

// --- Helper Functions ---

fn convert_trade_result(trade: &Trade, accounts: &[Account], currencies: &[Currency]) -> f64 {
    let account = accounts.iter().find(|a| a.id.as_deref() == trade.account_id.as_deref());
    let mut numeric_result = trade.result; // Assume already parsed f64

    if let Some(acc) = account {
        let currency = currencies.iter().find(|c| {
            c.code == acc.currency.as_deref().unwrap_or("") || 
            Some(&c.id) == acc.currency_id.as_ref() ||
            Some(format!("currency:{}", c.id)) == acc.currency_id
        });
        
        let rate = currency.map(|c| c.exchange_rate).unwrap_or(1.0);
        numeric_result *= rate;
    }

    numeric_result
}

// --- Main Command ---

#[tauri::command]
pub async fn get_strategy_comprehensive_stats(
    db: State<'_, DbState>,
    strategy_id: String,
    market_id: Option<String>,
) -> Result<StrategyComprehensiveStats, String> {
    
    // 1. Fetch auxiliary reference data
    let mut acc_res = db.0.query("SELECT *, type::string(id) as id FROM account").await.map_err(|e| e.to_string())?;
    let accounts: Vec<Account> = acc_res.take(0).unwrap_or_default();
    
    let mut curr_res = db.0.query("SELECT *, type::string(id) as id FROM currency").await.map_err(|e| e.to_string())?;
    let currencies: Vec<Currency> = curr_res.take(0).unwrap_or_default();
    
    let mut emo_res = db.0.query("SELECT *, type::string(id) as id FROM emotional_state").await.map_err(|e| e.to_string())?;
    let emotions: Vec<EmotionalState> = emo_res.take(0).unwrap_or_default();
    
    // Fetch assets to resolve markets if filter is passed
    let mut trades_query = "SELECT *, type::string(id) as id, type::string(account_id) as account_id, type::string(entry_emotional_state_id) as entry_emotional_state_id FROM trade WHERE strategy_id = $str_id ORDER BY date ASC".to_string();
    
    let mut response = db.0.query(&trades_query)
        .bind(("str_id", format!("strategy:{}", strategy_id.replace("strategy:", ""))))
        .await.map_err(|e| e.to_string())?;
        
    let mut trades: Vec<Trade> = response.take(0).map_err(|e| e.to_string())?;
    
    // 2. Optional Market Filter (if market_id is provided, filter trades by their asset market)
    if let Some(m_id) = market_id {
        let clean_mid = m_id.replace("market:", "");
        // Optimization: In a real app we would join in SQL, but for conservative safety we filter in memory
        let mut asset_res = db.0.query("SELECT symbol, type::string(asset_type_id) as asset_type_id FROM asset").await.map_err(|e| e.to_string())?;
        let assets: Vec<Asset> = asset_res.take(0).unwrap_or_default();
        
        let mut at_res = db.0.query("SELECT type::string(id) as id, type::string(market_id) as market_id FROM asset_type").await.map_err(|e| e.to_string())?;
        let asset_types: Vec<AssetType> = at_res.take(0).unwrap_or_default();
        
        let mut allowed_symbols = Vec::new();
        for a in assets {
            if let Some(at_id) = &a.asset_type_id {
                if let Some(at) = asset_types.iter().find(|x| x.id.as_ref() == Some(at_id)) {
                    if at.market_id.as_deref() == Some(&m_id) || at.market_id.as_deref() == Some(&format!("market:{}", clean_mid)) {
                        allowed_symbols.push(a.symbol.clone());
                    }
                }
            }
        }
        
        trades.retain(|t| allowed_symbols.contains(&t.asset_symbol));
    }
    
    let total_trades = trades.len();
    
    if total_trades == 0 {
        return Ok(StrategyComprehensiveStats {
            net_result: 0.0, win_rate: 0.0, profit_factor: 0.0, payoff: 0.0, math_expectation: 0.0,
            max_drawdown: 0.0, recovery_factor: 0.0, total_trades: 0,
            winning_trades: 0, best_trade: 0.0, worst_trade: 0.0, avg_duration_win: 0, avg_duration_loss: 0, avg_time_between_trades: 0.0,
            plan_adherence: 0.0,
            equity_curve: DatasetCurve { dates: vec![], data: vec![] },
            drawdown_curve: DatasetCurve { dates: vec![], data: vec![] },
            heatmap: vec![vec![0.0; 24]; 7],
            recent_metrics: RecentMetrics { trade_count: 0, pnl: 0.0, win_rate: 0.0, window_size: 20 },
            asset_breakdown: vec![],
            diagnostic: DiagnosticPayload {
                status: StrategyDiagnosticStatus::InsufficientData,
                recent_trend: StrategyRecentTrend::InsufficientData,
                stability: StrategyStability::InsufficientData,
                current_risk: StrategyRiskLevel::InsufficientData,
            },
            psychology: PsychologyContext { emotion_breakdown: vec![], negative_state_loss_ratio: 0.0 },
            operational: OperationalContext { best_time_of_day: None, worst_time_of_day: None, best_asset: None, worst_asset: None, best_direction: None }
        });
    }

    // --- Core Aggregations ---
    let mut net_result = 0.0;
    let mut total_win = 0.0;
    let mut total_loss = 0.0;
    let mut wins = 0;
    let mut followed_plan_count = 0;
    
    let mut best_trade: f64 = f64::MIN;
    let mut worst_trade: f64 = f64::MAX;
    let mut total_duration_win_minutes: f64 = 0.0;
    let mut total_duration_loss_minutes: f64 = 0.0;
    
    let mut equity_dates = vec!["Start".to_string()];
    let mut equity_data = vec![0.0];
    let mut drawdown_data = vec![0.0];
    
    let mut peak = 0.0;
    let mut max_dd = 0.0;
    
    // Heatmap array: 7 days (0=Sun, 6=Sat) x 24 hours
    let mut heatmap_grid = vec![vec![0.0; 24]; 7];
    
    // Maps for breakdowns
    let mut asset_map: HashMap<String, (usize, usize, f64)> = HashMap::new(); // symbol -> (count, wins, pnl)
    let mut dir_map: HashMap<String, (usize, usize, f64)> = HashMap::new();   // direction -> (count, wins, pnl)
    let mut emo_map: HashMap<Option<String>, (usize, usize, f64)> = HashMap::new(); // emotion_id -> (count, wins, pnl)
    
    // For Psychology constraint: negative state loss ratio
    let mut cumulative_gross_loss = 0.0;
    let mut negative_state_loss = 0.0;
    
    let negative_emotion_ids: Vec<String> = emotions.iter()
        .filter(|e| e.impact.eq_ignore_ascii_case("negative"))
        .filter_map(|e| e.id.clone())
        .map(|id| id.replace("emotional_state:", ""))
        .collect();

    for trade in &trades {
        let pnl = convert_trade_result(trade, &accounts, &currencies);
        net_result += pnl;
        
        let mut trade_dur_min = 0.0;
        if let Some(edate) = &trade.exit_date {
            if let (Ok(s_dt), Ok(e_dt)) = (DateTime::parse_from_rfc3339(&trade.date), DateTime::parse_from_rfc3339(edate)) {
                trade_dur_min = (e_dt - s_dt).num_minutes() as f64;
            } else if let (Ok(s_dt), Ok(e_dt)) = (chrono::NaiveDateTime::parse_from_str(&trade.date, "%Y-%m-%d %H:%M:%S"), chrono::NaiveDateTime::parse_from_str(edate, "%Y-%m-%d %H:%M:%S")) {
                trade_dur_min = (e_dt - s_dt).num_minutes() as f64;
            }
        }
        
        if pnl > 0.0 {
            wins += 1;
            total_win += pnl;
            if pnl > best_trade { best_trade = pnl; }
            total_duration_win_minutes += trade_dur_min;
        } else {
            total_loss += pnl.abs();
            cumulative_gross_loss += pnl.abs();
            if pnl < worst_trade { worst_trade = pnl; }
            total_duration_loss_minutes += trade_dur_min;
            
            // Check if entered in a negative emotional state
            if let Some(entry_emo) = &trade.entry_emotional_state_id {
                let clean_emo = entry_emo.replace("emotional_state:", "");
                if negative_emotion_ids.contains(&clean_emo) {
                    negative_state_loss += pnl.abs();
                }
            }
        }
        
        if trade.followed_plan { followed_plan_count += 1; }
        
        // Curves
        let trade_date_str = trade.date.split('T').next().unwrap_or(&trade.date).to_string(); // Simple date format fallback
        equity_dates.push(trade_date_str);
        equity_data.push(net_result);
        
        if net_result > peak { peak = net_result; }
        let dd = peak - net_result;
        drawdown_data.push(-dd);
        if dd > max_dd { max_dd = dd; }
        
        // Heatmap Processing (Requires valid ISO parsing, fail gracefully to hour 0 if invalid)
        if let Ok(dt) = DateTime::parse_from_rfc3339(&trade.date) {
            let day_idx = dt.weekday().num_days_from_sunday() as usize; // 0 = Sun
            let hour_idx = dt.hour() as usize;
            heatmap_grid[day_idx][hour_idx] += pnl;
        } else if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(&trade.date, "%Y-%m-%d %H:%M:%S") {
            let day_idx = dt.weekday().num_days_from_sunday() as usize;
            let hour_idx = dt.hour() as usize;
            heatmap_grid[day_idx][hour_idx] += pnl;
        }

        // Breakdowns Tracking
        let as_entry = asset_map.entry(trade.asset_symbol.clone()).or_insert((0, 0, 0.0));
        as_entry.0 += 1;
        if pnl > 0.0 { as_entry.1 += 1; }
        as_entry.2 += pnl;
        
        let dir_entry = dir_map.entry(trade.direction.clone()).or_insert((0, 0, 0.0));
        dir_entry.0 += 1;
        if pnl > 0.0 { dir_entry.1 += 1; }
        dir_entry.2 += pnl;
        
        let emo_id_clean = trade.entry_emotional_state_id.as_ref().map(|s| s.replace("emotional_state:", ""));
        let emo_entry = emo_map.entry(emo_id_clean).or_insert((0, 0, 0.0));
        emo_entry.0 += 1;
        if pnl > 0.0 { emo_entry.1 += 1; }
        emo_entry.2 += pnl;
    }
    
    // --- Metric Derivations ---
    let win_rate = (wins as f64 / total_trades as f64) * 100.0;
    let profit_factor = if total_loss == 0.0 { if total_win > 0.0 { 99.0 } else { 0.0 } } else { total_win / total_loss };
    let math_expectation = net_result / total_trades as f64;
    let payoff = if wins > 0 && (total_trades - wins) > 0 {
        (total_win / wins as f64) / (total_loss / (total_trades - wins) as f64)
    } else { 0.0 };
    let recovery_factor = if max_dd == 0.0 { 0.0 } else { net_result / max_dd };
    let plan_adherence = (followed_plan_count as f64 / total_trades as f64) * 100.0;
    
    if best_trade == f64::MIN { best_trade = 0.0; }
    if worst_trade == f64::MAX { worst_trade = 0.0; }
    
    let avg_duration_win = if wins > 0 { (total_duration_win_minutes / wins as f64).round() as i64 } else { 0 };
    let losses = total_trades - wins;
    let avg_duration_loss = if losses > 0 { (total_duration_loss_minutes / losses as f64).round() as i64 } else { 0 };
    
    let avg_time_between_trades = if total_trades > 1 {
        let first_date = &trades[0].date;
        let last_date = &trades[total_trades - 1].date;
        let diff_ms = if let (Ok(f), Ok(l)) = (DateTime::parse_from_rfc3339(first_date), DateTime::parse_from_rfc3339(last_date)) {
            (l - f).num_milliseconds() as f64
        } else if let (Ok(f), Ok(l)) = (chrono::NaiveDateTime::parse_from_str(first_date, "%Y-%m-%d %H:%M:%S"), chrono::NaiveDateTime::parse_from_str(last_date, "%Y-%m-%d %H:%M:%S")) {
            (l - f).num_milliseconds() as f64
        } else {
            0.0
        };
        let diff_days = diff_ms / (1000.0 * 3600.0 * 24.0);
        let avg = diff_days / (total_trades - 1) as f64;
        (avg * 10.0).round() / 10.0
    } else { 0.0 };
    
    let negative_state_loss_ratio = if cumulative_gross_loss > 0.0 {
        (negative_state_loss / cumulative_gross_loss) * 100.0
    } else { 0.0 };

    // --- Asset Breakdown Transform ---
    let mut asset_breakdown: Vec<AssetBreakdown> = asset_map.into_iter().map(|(symbol, (count, wins, pnl))| {
        AssetBreakdown {
            asset_symbol: symbol,
            trade_count: count,
            net_result: pnl,
            win_rate: (wins as f64 / count as f64) * 100.0,
        }
    }).collect();
    asset_breakdown.sort_by(|a, b| b.net_result.partial_cmp(&a.net_result).unwrap_or(std::cmp::Ordering::Equal));

    // --- Emotion Breakdown Transform ---
    let emotion_breakdown: Vec<EmotionBreakdown> = emo_map.into_iter().map(|(id_opt, (count, w, pnl))| {
        let emotion_name = if let Some(ref id) = id_opt {
            emotions.iter().find(|e| e.id.as_deref().map(|s| s.replace("emotional_state:", "")) == Some(id.clone())).map(|e| e.name.clone())
        } else { Some("Unmapped".to_string()) };
        
        EmotionBreakdown {
            emotion_id: id_opt,
            emotion_name,
            trade_count: count,
            win_rate: (w as f64 / count as f64) * 100.0,
            net_result: pnl,
        }
    }).collect();

    // --- Operational Context Derivations ---
    let best_asset = asset_breakdown.first().map(|a| a.asset_symbol.clone());
    let worst_asset = asset_breakdown.last().map(|a| a.asset_symbol.clone());
    
    let best_direction = dir_map.into_iter().max_by(|a, b| a.1.2.partial_cmp(&b.1.2).unwrap_or(std::cmp::Ordering::Equal)).map(|(k, _)| k);
    
    // Find best/worst hours from heatmap (gross accumulation ignoring days)
    let mut hourly_totals = vec![0.0; 24];
    for day in &heatmap_grid {
        for (h, val) in day.iter().enumerate() {
            hourly_totals[h] += val;
        }
    }
    let mut max_hour_val = f64::MIN;
    let mut min_hour_val = f64::MAX;
    let mut best_hour = None;
    let mut worst_hour = None;
    for (h, val) in hourly_totals.iter().enumerate() {
        if *val > max_hour_val { max_hour_val = *val; best_hour = Some(h); }
        if *val < min_hour_val { min_hour_val = *val; worst_hour = Some(h); }
    }
    let best_time_of_day = best_hour.map(|h| format!("{:02}h-{:02}h", h, h+1));
    let worst_time_of_day = worst_hour.map(|h| format!("{:02}h-{:02}h", h, h+1));

    // --- Recent Metrics (Last 20 trades) ---
    let window_size = 20.min(trades.len());
    let recent_slice = &trades[trades.len() - window_size..];
    let mut recent_pnl = 0.0;
    let mut recent_wins = 0;
    for rt in recent_slice {
        let p = convert_trade_result(rt, &accounts, &currencies);
        recent_pnl += p;
        if p > 0.0 { recent_wins += 1; }
    }
    let recent_metrics = RecentMetrics {
        trade_count: window_size,
        pnl: recent_pnl,
        win_rate: (recent_wins as f64 / window_size as f64) * 100.0,
        window_size: 20,
    };

    // --- Diagnostic Algorithms ---
    let recent_trend = if window_size >= 5 {
        if recent_pnl > 0.0 && (recent_wins as f64) / (window_size as f64) > 0.5 { StrategyRecentTrend::Uptrend }
        else if recent_pnl < 0.0 && (recent_wins as f64) / (window_size as f64) < 0.4 { StrategyRecentTrend::Downtrend }
        else { StrategyRecentTrend::Choppy }
    } else { StrategyRecentTrend::InsufficientData };

    let status = match recent_trend {
        StrategyRecentTrend::Uptrend => StrategyDiagnosticStatus::Hot,
        StrategyRecentTrend::Downtrend => StrategyDiagnosticStatus::Cold,
        StrategyRecentTrend::Choppy => StrategyDiagnosticStatus::Neutral,
        StrategyRecentTrend::InsufficientData => StrategyDiagnosticStatus::InsufficientData,
    };
    
    let stability = if max_dd > 0.0 && max_dd < net_result * 0.3 { StrategyStability::Stable } else { StrategyStability::Volatile };
    
    let current_risk = if peak > 0.0 {
        let cur_distance = peak - net_result;
        if cur_distance == 0.0 { StrategyRiskLevel::Low }
        else if cur_distance < max_dd * 0.5 { StrategyRiskLevel::Moderate }
        else { StrategyRiskLevel::Critical }
    } else { StrategyRiskLevel::Moderate };

    Ok(StrategyComprehensiveStats {
        net_result,
        win_rate,
        profit_factor,
        payoff,
        math_expectation,
        max_drawdown: max_dd,
        recovery_factor,
        total_trades,
        winning_trades: wins,
        best_trade,
        worst_trade,
        avg_duration_win,
        avg_duration_loss,
        avg_time_between_trades,
        plan_adherence,
        
        equity_curve: DatasetCurve { dates: equity_dates.clone(), data: equity_data },
        drawdown_curve: DatasetCurve { dates: equity_dates, data: drawdown_data },
        heatmap: heatmap_grid,
        
        recent_metrics,
        asset_breakdown,
        
        diagnostic: DiagnosticPayload {
            status,
            recent_trend,
            stability,
            current_risk,
        },
        psychology: PsychologyContext {
            emotion_breakdown,
            negative_state_loss_ratio,
        },
        operational: OperationalContext {
            best_time_of_day,
            worst_time_of_day,
            best_asset,
            worst_asset,
            best_direction,
        }
    })
}
