// src-tauri/src/seed/currencies_seed.rs
use crate::models::Currency;
use surrealdb::engine::local::Db;
use surrealdb::Surreal;

pub async fn seed_currencies(db: &Surreal<Db>) -> Result<(), String> {
    println!("[SEED] Verificando Moedas...");

    let currencies = vec![
        ("BRL", "BRL", "R$", "Real Brasileiro", 1.0),
        ("USD", "USD", "$", "Dólar Americano", 5.0),
        ("EUR", "EUR", "€", "Euro", 5.40),
    ];

    for (id, code, symbol, name, rate) in currencies {
        let currency_data = Currency {
            id: id.into(),
            code: code.into(),
            symbol: symbol.into(),
            name: name.into(),
            exchange_rate: rate,
        };
        let mut json_data = serde_json::to_value(&currency_data).unwrap();
        if let Some(obj) = json_data.as_object_mut() {
            obj.remove("id");
        }

        // Use raw query for robust serialization
        db.query("UPSERT type::thing('currency', $id) CONTENT $data RETURN NONE")
            .bind(("id", id))
            .bind(("data", json_data))
            .await
            .map_err(|e| e.to_string())?;
        println!("  ✓ {}", name);
    }

    Ok(())
}
