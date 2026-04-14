// src-tauri/src/services/currency_service.rs
pub struct CurrencyService;

impl CurrencyService {
    /// Normaliza uma entrada textual de moeda para o formato canônico Record ID (Thing).
    /// Exemplos:
    /// "BRL" -> "currency:brl"
    /// "brl" -> "currency:brl"
    /// "currency:brl" -> "currency:brl"
    /// "USD" -> "currency:usd"
    pub fn normalize_id(input: &str) -> String {
        let trimmed = input.trim();
        if trimmed.is_empty() {
            return "currency:brl".to_string(); // Fallback padrão do sistema
        }

        // Se já for um ID completo (formato table:id), retornamos limpo e minúsculo
        if trimmed.contains(':') {
            let parts: Vec<&str> = trimmed.split(':').collect();
            if parts.len() == 2 && parts[0] == "currency" {
                return format!("{}:{}", parts[0], parts[1].to_lowercase());
            }
            // Se for outro tipo de ID, mantemos mas garantimos consistência
            return trimmed.to_lowercase();
        }

        // Caso seja apenas o código (BRL, USD, etc)
        format!("currency:{}", trimmed.to_lowercase())
    }
}
