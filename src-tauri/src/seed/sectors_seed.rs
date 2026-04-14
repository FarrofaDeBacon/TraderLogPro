// src-tauri/src/seed/sectors_seed.rs
use surrealdb::engine::local::Db;
use surrealdb::Surreal;
use crate::models::{Sector, Subsector};

pub async fn seed_sectors(db: &Surreal<Db>) -> Result<(), String> {
    println!("[SEED] 🌱 Semeando Setores e Subsetores da B3...");

    let structural_data = vec![
        ("Petróleo, Gás e Biocombustíveis", "Zap", "amber", vec![
            "Petróleo, Gás e Biocombustíveis"
        ]),
        ("Materiais Básicos", "Shovel", "slate", vec![
            "Mineração", "Siderurgia e Metalurgia", "Químicos", "Madeira e Papel", "Embalagens"
        ]),
        ("Bens Industriais", "Factory", "slate", vec![
            "Construção e Engenharia", "Material de Transporte", "Máquinas e Equipamentos", "Transporte", "Serviços Diversos"
        ]),
        ("Consumo Não Cíclico", "ShoppingCart", "emerald", vec![
            "Agropecuária", "Alimentos Processados", "Bebidas", "Produtos de Uso Pessoal", "Comércio e Distribuição"
        ]),
        ("Consumo Cíclico", "Palette", "rose", vec![
            "Tecidos, Vestuário e Calçados", "Automóveis e Motocicletas", "Hotéis e Restaurantes", "Viagens e Lazer", "Utilidades Domésticas", "Construção Civil"
        ]),
        ("Saúde", "HeartPulse", "rose", vec![
            "Medicamentos e Produtos Farmacêuticos", "Análises e Diagnósticos", "Equipamentos", "Serviços Médicos, Hospitalares e Análises Clínicas"
        ]),
        ("Tecnologia da Informação", "Cpu", "sky", vec![
            "Computadores e Equipamentos", "Programas e Serviços"
        ]),
        ("Comunicações", "Zap", "sky", vec![
            "Telecomunicações", "Mídia"
        ]),
        ("Utilidade Pública", "Droplets", "sky", vec![
            "Energia Elétrica", "Água e Saneamento", "Gás"
        ]),
        ("Financeiro", "Landmark", "indigo", vec![
            "Bancos", "Seguradoras", "Serviços Financeiros Diversos", "Previdência e Capitalização", "Holdings Diversas"
        ]),
        ("Outros", "Layers", "slate", vec![
            "Outros"
        ]),
    ];

    for (s_name, s_icon, s_color, subsectors) in structural_data {
        let id_cleaned = s_name.to_lowercase()
            .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
            .replace("ã", "a").replace("õ", "o").replace("ç", "c")
            .replace(", ", "_").replace(" ", "_");

        let sector_id = format!("sector:{}", id_cleaned);

        let sector = Sector {
            id: Some(sector_id.clone()),
            name: s_name.to_string(),
            macro_sector: s_name.to_string(),
            icon: s_icon.to_string(),
            color: s_color.to_string(),
            description: format!("Setor B3: {}", s_name),
        };

        let mut sector_json = serde_json::to_value(&sector).map_err(|e| e.to_string())?;
        if let Some(obj) = sector_json.as_object_mut() {
            obj.remove("id");
        }

        db.query("UPSERT type::thing('sector', $id) CONTENT $data")
            .bind(("id", id_cleaned.clone())) // Use owned value
            .bind(("data", sector_json))
            .await
            .map_err(|e| format!("Erro ao criar setor {}: {}", s_name, e))?;

        for ss_name in subsectors {
            let ss_id_cleaned = ss_name.to_lowercase()
                .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
                .replace("ã", "a").replace("õ", "o").replace("ç", "c")
                .replace(", ", "_").replace(" ", "_");

            let ss_id = format!("subsector:{}", ss_id_cleaned);

            let subsector = Subsector {
                id: Some(ss_id.clone()),
                sector_id: Some(sector_id.clone()),
                name: ss_name.to_string(),
                segment: ss_name.to_string(),
            };

            let mut ss_json = serde_json::to_value(&subsector).map_err(|e| e.to_string())?;
            if let Some(obj) = ss_json.as_object_mut() {
                obj.remove("id");
            }

            db.query("UPSERT type::thing('subsector', $id) CONTENT $data")
                .bind(("id", ss_id_cleaned.clone())) // Use owned value
                .bind(("data", ss_json))
                .await
                .map_err(|e| format!("Erro ao criar subsetor {}: {}", ss_name, e))?;
        }
    }

    println!("[SEED] ✅ Setores e Subsetores da B3 semeados com sucesso!");
    Ok(())
}
