use surrealdb::engine::local::Db;
use surrealdb::Surreal;

pub async fn run_migrations(db: &Surreal<Db>) -> Result<(), String> {
    println!("[MIGRATION] Starting system-wide data sanitization...");

    // 1. Relational Sanitization for Accounts (currency_id: String -> Thing)
    println!("[MIGRATION] Sanitizing Account relational links...");
    let sql_accounts = "
        UPDATE account SET 
            currency_id = (IF type::is::string(currency_id) AND currency_id != '' AND currency_id != null THEN type::thing(currency_id) ELSE currency_id END)
        WHERE type::is::string(currency_id);
    ";
    db.query(sql_accounts).await.map_err(|e| e.to_string())?;

    // 2. Relational Sanitization for Assets
    println!("[MIGRATION] Sanitizing Asset relational links...");
    let sql_assets = "
        UPDATE asset SET 
            asset_type_id = (IF type::is::string(asset_type_id) THEN type::thing(asset_type_id) ELSE asset_type_id END),
            tax_profile_id = (IF type::is::string(tax_profile_id) AND tax_profile_id != '' THEN type::thing(tax_profile_id) ELSE tax_profile_id END),
            default_fee_id = (IF type::is::string(default_fee_id) AND default_fee_id != '' THEN type::thing(default_fee_id) ELSE default_fee_id END),
            root_id = (IF type::is::string(root_id) AND root_id != '' THEN type::thing(root_id) ELSE root_id END)
        WHERE type::is::string(asset_type_id) 
           OR type::is::string(tax_profile_id) 
           OR type::is::string(default_fee_id) 
           OR type::is::string(root_id);
    ";
    db.query(sql_assets).await.map_err(|e| e.to_string())?;

    // 3. Risk Rules Migration (Legacy fields in RiskProfile -> RiskRules)
    // Note: This logic follows what was in risk-settings.svelte.ts but on the Backend.
    // We only migrate if risk_rules is empty or missing.
    println!("[MIGRATION] Checking for legacy Risk Profiles...");
    
    // Sanitization of Thing IDs in risk_profile
    let sql_risk_pre = "
        UPDATE risk_profile SET 
            linked_account_id = (IF type::is::string(linked_account_id) AND linked_account_id != '' THEN type::thing(linked_account_id) ELSE linked_account_id END),
            growth_plan_id = (IF type::is::string(growth_plan_id) AND growth_plan_id != '' THEN type::thing(growth_plan_id) ELSE growth_plan_id END)
        WHERE type::is::string(linked_account_id) OR type::is::string(growth_plan_id);
    ";
    db.query(sql_risk_pre).await.map_err(|e| e.to_string())?;

    println!("[MIGRATION] Data sanitization completed successfully.");
    Ok(())
}
