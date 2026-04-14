use surrealdb::engine::local::Db;
use surrealdb::Surreal;
use crate::models::{Asset, AssetType, Subsector, TaxRule, TaxProfileEntry, FeeProfileEntry};
use crate::db::normalize_id;

pub struct AssetService;

impl AssetService {
    /// Resolve o perfil tributário e de taxas efetivo seguindo a hierarquia obrigatória.
    pub async fn resolve_fiscal_context(
        db: &Surreal<Db>,
        asset: &Asset,
    ) -> Result<(Option<String>, Option<String>), String> {
        let mut tax_id = asset.tax_profile_id.clone();
        let mut fee_id = asset.default_fee_id.clone();

        // Se o ativo não tiver um dos perfis, busca no AssetType
        if (tax_id.is_none() || fee_id.is_none()) && asset.asset_type_id.is_some() {
            let at_id = asset.asset_type_id.as_ref().unwrap();
            let clean_atid = normalize_id("", at_id);
            let sql = format!("SELECT * FROM asset_type:⟨{}⟩ LIMIT 1", clean_atid);
            
            if let Ok(mut res) = db.query(sql).await {
                if let Ok(mut types) = res.take::<Vec<AssetType>>(0) {
                    if let Some(at) = types.pop() {
                        if tax_id.is_none() {
                            tax_id = at.tax_profile_id;
                        }
                        if fee_id.is_none() {
                            fee_id = at.default_fee_id;
                        }
                    }
                }
            }
        }

        Ok((tax_id, fee_id))
    }

    /// Resolve o contexto fiscal completo de um trade (Hierarquia: Snapshot > Asset > AssetType)
    pub async fn resolve_trade_tax_profile_id(
        db: &Surreal<Db>,
        effective_tax_profile_id: &Option<String>,
        asset_id: &Option<String>,
        asset_type_id: &Option<String>,
    ) -> Option<String> {
        // 1. Snapshot do Trade (Soberano)
        if let Some(id) = effective_tax_profile_id {
            if !id.is_empty() && id != "null" {
                return Some(id.clone());
            }
        }

        // 2. Tentar no Ativo
        if let Some(aid) = asset_id {
            let clean_aid = normalize_id("", aid);
            let sql = format!("SELECT tax_profile_id, asset_type_id FROM asset:⟨{}⟩ LIMIT 1", clean_aid);
            if let Ok(mut res) = db.query(sql).await {
                if let Ok(Some(row)) = res.take::<Option<serde_json::Value>>(0) {
                    if let Some(pid) = row.get("tax_profile_id").and_then(|v| v.as_str()) {
                        return Some(pid.to_string());
                    }
                    // Fallback para o tipo do ativo se não houver no ativo
                    if let Some(atid) = row.get("asset_type_id").and_then(|v| v.as_str()) {
                        let clean_atid = normalize_id("", atid);
                        let sql_at = format!("SELECT tax_profile_id FROM asset_type:⟨{}⟩ LIMIT 1", clean_atid);
                        if let Ok(mut res_at) = db.query(sql_at).await {
                            if let Ok(Some(at_row)) = res_at.take::<Option<serde_json::Value>>(0) {
                                if let Some(pid) = at_row.get("tax_profile_id").and_then(|v| v.as_str()) {
                                    return Some(pid.to_string());
                                }
                            }
                        }
                    }
                }
            }
        }

        // 3. Tentar no Tipo de Ativo explicitamente
        if let Some(atid) = asset_type_id {
            let clean_atid = normalize_id("", atid);
            let sql = format!("SELECT tax_profile_id FROM asset_type:⟨{}⟩ LIMIT 1", clean_atid);
            if let Ok(mut res) = db.query(sql).await {
                if let Ok(Some(at_row)) = res.take::<Option<serde_json::Value>>(0) {
                    if let Some(pid) = at_row.get("tax_profile_id").and_then(|v| v.as_str()) {
                        return Some(pid.to_string());
                    }
                }
            }
        }

        None
    }

    /// Resolve o contexto de taxas completo de um trade (Hierarquia: Snapshot > Asset > AssetType > Account)
    pub async fn resolve_trade_fee_profile_id(
        db: &Surreal<Db>,
        effective_fee_profile_id: &Option<String>,
        asset_id: &Option<String>,
        asset_type_id: &Option<String>,
        account_id: &Option<String>,
    ) -> Option<String> {
        // 1. Snapshot do Trade (Soberano)
        if let Some(id) = effective_fee_profile_id {
            if !id.is_empty() && id != "null" {
                return Some(id.clone());
            }
        }

        // 2. Tentar no Ativo e seu Tipo
        if let Some(aid) = asset_id {
            let clean_aid = normalize_id("", aid);
            let sql = format!("SELECT default_fee_id, asset_type_id FROM asset:⟨{}⟩ LIMIT 1", clean_aid);
            if let Ok(mut res) = db.query(sql).await {
                if let Ok(Some(row)) = res.take::<Option<serde_json::Value>>(0) {
                    if let Some(fid) = row.get("default_fee_id").and_then(|v| v.as_str()) {
                        return Some(fid.to_string());
                    }
                    if let Some(atid) = row.get("asset_type_id").and_then(|v| v.as_str()) {
                        let clean_atid = normalize_id("", atid);
                        let sql_at = format!("SELECT default_fee_id FROM asset_type:⟨{}⟩ LIMIT 1", clean_atid);
                        if let Ok(mut res_at) = db.query(sql_at).await {
                            if let Ok(Some(at_row)) = res_at.take::<Option<serde_json::Value>>(0) {
                                if let Some(fid) = at_row.get("default_fee_id").and_then(|v| v.as_str()) {
                                    return Some(fid.to_string());
                                }
                            }
                        }
                    }
                }
            }
        }

        // 3. Tentar no Tipo de Ativo explicitamente
        if let Some(atid) = asset_type_id {
            let clean_atid = normalize_id("", atid);
            let sql = format!("SELECT default_fee_id FROM asset_type:⟨{}⟩ LIMIT 1", clean_atid);
            if let Ok(mut res) = db.query(sql).await {
                if let Ok(Some(at_row)) = res.take::<Option<serde_json::Value>>(0) {
                    if let Some(fid) = at_row.get("default_fee_id").and_then(|v| v.as_str()) {
                        return Some(fid.to_string());
                    }
                }
            }
        }

        // 4. Fallback final na Conta
        if let Some(acc_id) = account_id {
            let clean_accid = normalize_id("", acc_id);
            let sql = format!("SELECT default_fee_id FROM account:⟨{}⟩ LIMIT 1", clean_accid);
            if let Ok(mut res) = db.query(sql).await {
                if let Ok(Some(row)) = res.take::<Option<serde_json::Value>>(0) {
                    if let Some(fid) = row.get("default_fee_id").and_then(|v| v.as_str()) {
                        return Some(fid.to_string());
                    }
                }
            }
        }

        None
    }

    /// Retorna o perfil fiscal padrão baseado no ID/Código do Tipo de Ativo (fim do hardcoding)
    pub fn get_default_tax_profile_by_asset_type(asset_type_id: &str) -> Option<String> {
        let clean = normalize_id("", asset_type_id);
        match clean.as_str() {
            "at1" | "acoes" => Some("tax_profile:tp_acoes".to_string()),
            "at2" | "futuros" => Some("tax_profile:tp_futuros".to_string()),
            _ => None
        }
    }

    /// Resolve a regra fiscal (TaxRule) completa baseada no contexto e modalidade.
    /// Segue a hierarquia: Snapshot -> Asset Override -> AssetType Default.
    pub async fn resolve_tax_rule(
        db: &Surreal<Db>,
        effective_profile_id: &Option<String>,
        asset_profile_id: &Option<String>,
        asset_type_profile_id: &Option<String>,
        modality_id: &str,
    ) -> Result<Option<TaxRule>, String> {
        // Encontra o ID soberano via lógica centralizada
        let mut profile_id = None;
        if let Some(p) = effective_profile_id {
            if !p.is_empty() && p != "null" { profile_id = Some(p.clone()); }
        }
        if profile_id.is_none() {
            if let Some(p) = asset_profile_id {
                if !p.is_empty() && p != "null" { profile_id = Some(p.clone()); }
            }
        }
        if profile_id.is_none() {
            if let Some(p) = asset_type_profile_id {
                if !p.is_empty() && p != "null" { profile_id = Some(p.clone()); }
            }
        }

        let Some(pid) = profile_id else {
            return Ok(None);
        };

        let clean_pid = normalize_id("", &pid);
        let clean_mid = normalize_id("", modality_id);

        let sql = "SELECT * FROM tax_profile_entry WHERE tax_profile_id = type::thing('tax_profile', $pid) AND modality_id = type::thing('modality', $mid) LIMIT 1";
        let mut res = db.query(sql)
            .bind(("pid", clean_pid))
            .bind(("mid", clean_mid))
            .await
            .map_err(|e| e.to_string())?;

        let mut entries: Vec<TaxProfileEntry> = res.take(0).map_err(|e| e.to_string())?;
        let Some(entry) = entries.pop() else {
            return Ok(None);
        };

        let Some(rule_id) = entry.tax_rule_id else {
            return Ok(None);
        };

        // 3. Buscar a regra fiscal final
        let clean_rid = normalize_id("", &rule_id);
        let rule_sql = format!("SELECT * FROM tax_rule:⟨{}⟩ LIMIT 1", clean_rid);
        let mut rule_res = db.query(rule_sql).await.map_err(|e| e.to_string())?;
        let mut rules: Vec<TaxRule> = rule_res.take(0).map_err(|e| e.to_string())?;
        
        Ok(rules.pop())
    }

    /// Resolve os valores de taxas (FeeProfileEntry) baseada no perfil e modalidade.
    pub async fn resolve_fee_entry(
        db: &Surreal<Db>,
        profile_id: &str,
        modality_id: &str,
    ) -> Result<Option<FeeProfileEntry>, String> {
        let clean_pid = normalize_id("", profile_id);
        let clean_mid = normalize_id("", modality_id);

        let sql = "SELECT * FROM fee_profile_entry WHERE fee_profile_id = type::thing('fee_profile', $pid) AND modality_id = type::thing('modality', $mid) LIMIT 1";
        let mut res = db.query(sql)
            .bind(("pid", clean_pid))
            .bind(("mid", clean_mid))
            .await
            .map_err(|e| e.to_string())?;

        let mut entries: Vec<FeeProfileEntry> = res.take(0).map_err(|e| e.to_string())?;
        Ok(entries.pop())
    }

    /// Valida a integridade econômica (Setor/Subsetor) e realiza inferência se necessário.
    pub async fn validate_and_infer_economic_context(
        db: &Surreal<Db>,
        asset_sector_id: &mut Option<String>,
        asset_subsector_id: &Option<String>,
    ) -> Result<(), String> {
        if let Some(sub_id) = asset_subsector_id {
            let clean_sub_id = normalize_id("", sub_id);
            let sql = format!("SELECT * FROM subsector:⟨{}⟩ LIMIT 1", clean_sub_id);
            
            let mut res = db.query(sql).await.map_err(|e| e.to_string())?;
            let mut subsectors: Vec<Subsector> = res.take(0).map_err(|e| e.to_string())?;
            
            if let Some(sub) = subsectors.pop() {
                if let Some(expected_sector_id) = sub.sector_id {
                    let clean_expected = normalize_id("", &expected_sector_id);
                    
                    if let Some(current_sector_id) = asset_sector_id {
                        let clean_current = normalize_id("", current_sector_id);
                        if clean_current != clean_expected {
                            return Err(format!(
                                "Conflito de Integridade: O subsetor selecionado pertence ao setor '{}', mas o ativo está vinculado ao setor '{}'.",
                                clean_expected, clean_current
                            ));
                        }
                    } else {
                        // Inferência automática
                        *asset_sector_id = Some(format!("sector:{}", clean_expected));
                    }
                }
            } else {
                return Err(format!("Subsetor '{}' não encontrado.", clean_sub_id));
            }
        }

        // Validação de obrigatoriedade
        if asset_sector_id.is_none() {
            return Err("O campo 'sector_id' é obrigatório para a classificação econômica do ativo.".to_string());
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use surrealdb::engine::local::Mem;

    #[tokio::test]
    async fn test_resolve_fee_entry_modality_differentiation() -> Result<(), String> {
        let db = Surreal::new::<Mem>(()).await.map_err(|e| e.to_string())?;
        db.use_ns("test").use_db("test").await.map_err(|e| e.to_string())?;

        // Setup: Um perfil com duas entradas (Day Trade vs Swing Trade)
        db.query("CREATE fee_profile:p1 SET name = 'Test Profile'").await.map_err(|e| e.to_string())?;
        
        // Day Trade entry (modality:m1) -> 5.0 fixed
        db.query("CREATE fee_profile_entry SET 
            fee_profile_id = fee_profile:p1, 
            modality_id = modality:m1, 
            fixed_fee = 5.0,
            percentage_fee = 0.0,
            exchange_fee = 0.0,
            iss = 0.0,
            currency_spread = 0.0,
            withholding_tax = 0.0,
            income_tax_rate = 0.0")
            .await.map_err(|e| e.to_string())?;

        // Swing Trade entry (modality:m2) -> 15.0 fixed
        db.query("CREATE fee_profile_entry SET 
            fee_profile_id = fee_profile:p1, 
            modality_id = modality:m2, 
            fixed_fee = 15.0,
            percentage_fee = 0.0,
            exchange_fee = 0.0,
            iss = 0.0,
            currency_spread = 0.0,
            withholding_tax = 0.0,
            income_tax_rate = 0.0")
            .await.map_err(|e| e.to_string())?;

        // Teste Scenario A: Valores diferentes por modalidade
        let entry_dt = AssetService::resolve_fee_entry(&db, "fee_profile:p1", "modality:m1").await?;
        let entry_st = AssetService::resolve_fee_entry(&db, "fee_profile:p1", "modality:m2").await?;

        assert!(entry_dt.is_some());
        assert!(entry_st.is_some());
        
        let val_dt = entry_dt.unwrap().fixed_fee;
        let val_st = entry_st.unwrap().fixed_fee;

        println!("[VAL_DT] {:?} | [VAL_ST] {:?}", val_dt, val_st);

        assert_eq!(val_dt, 5.0, "Day Trade deve retornar 5.0");
        assert_eq!(val_st, 15.0, "Swing Trade deve retornar 15.0");
        assert_ne!(val_dt, val_st, "Valores por modalidade devem ser distintos");

        Ok(())
    }
}
