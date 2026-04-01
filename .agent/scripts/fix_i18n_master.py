import json
import os

locales = ["pt-BR", "en-US", "es-ES", "fr-FR"]
base_path = r"c:\PROJETOS\TraderLogPro\src\lib\i18n\locales"

def process_trades(lang):
    file_path = os.path.join(base_path, lang, "trades.json")
    if not os.path.exists(file_path): return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 1. Alias trades.wizard to root wizard
    if "trades" in data and "wizard" in data["trades"]:
        data["wizard"] = data["trades"]["wizard"]
        print(f"[{lang}] Aliased trades.wizard to root wizard")
        
    # 2. Alias trades.messages to root messages (some components use this)
    if "trades" in data and "messages" in data["trades"]:
        # Only if it doesn't exist to avoid collisions
        if "messages" not in data:
            data["messages"] = data["trades"]["messages"]
            print(f"[{lang}] Aliased trades.messages to root messages")
            
    # 3. Add explicit common keys for Wizard missing labels seen in screenshots
    if "wizard" in data:
        if "placeholders" not in data["wizard"]: data["wizard"]["placeholders"] = {}
        if "fields" not in data["wizard"]: data["wizard"]["fields"] = {}
        
        # Ensure select placeholder exists at root level for the wizard
        if "select" not in data["wizard"]["placeholders"]:
            data["wizard"]["placeholders"]["select"] = "Select..." if lang != "pt-BR" else "Selecione..."

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

def process_strategies(lang):
    file_path = os.path.join(base_path, lang, "strategies.json")
    if not os.path.exists(file_path): return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 1. Alias strategyDashboard to strategy.dashboard
    # 2. Alias strategyDossier to strategy.dossier
    # 3. Alias strategies.notFound to strategy.notFound
    
    if "strategy" not in data:
        data["strategy"] = {}
    
    if "strategyDashboard" in data:
        data["strategy"]["dashboard"] = data["strategyDashboard"]
    
    if "strategyDossier" in data:
        data["strategy"]["dossier"] = data["strategyDossier"]
        
    if "strategies" in data and "notFound" in data["strategies"]:
        data["strategy"]["notFound"] = data["strategies"]["notFound"]
        
    if "strategyNotFound" in data:
        data["strategy"]["notFound"] = data["strategyNotFound"]

    # Specific missing key from screenshot
    if "strategy" in data and "dashboard" in data["strategy"]:
        if "messages" not in data["strategy"]["dashboard"]:
           data["strategy"]["dashboard"]["messages"] = {}
        if "noTrades" not in data["strategy"]["dashboard"]["messages"]:
           data["strategy"]["dashboard"]["messages"]["noTrades"] = "No trades found" if lang != "pt-BR" else "Nenhum trade encontrado"

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

def process_fiscal(lang):
    file_path = os.path.join(base_path, lang, "fiscal.json")
    if not os.path.exists(file_path): return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 1. Alias darf_warning (from screenshot)
    if "fiscal" in data:
        if "darf" in data["fiscal"] and "complementary_warning" in data["fiscal"]["darf"]:
            data["fiscal"]["darf_warning"] = data["fiscal"]["darf"]["complementary_warning"]
            data["fiscal"]["darf_description"] = data["fiscal"]["darf"].get("complementary_description", "")
            print(f"[{lang}] Aliased fiscal.darf_warning")

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

def process_common(lang):
    file_path = os.path.join(base_path, lang, "common.json")
    if not os.path.exists(file_path): return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 1. Inject LIST.TABLE (from screenshot 2)
    if "LIST" not in data:
        data["LIST"] = {"TABLE": {}}
    
    table_map = {
        "pt-BR": {
            "ASSET": "Ativo",
            "DIRECTION": "Direção",
            "ENTRY": "Entrada",
            "EXIT": "Saída",
            "PL": "Resultado",
            "QUANTITY": "Qtd",
            "STRATEGY": "Estratégia"
        },
        "en-US": {
            "ASSET": "Asset",
            "DIRECTION": "Direction",
            "ENTRY": "Entry",
            "EXIT": "Exit",
            "PL": "Result",
            "QUANTITY": "Qty",
            "STRATEGY": "Strategy"
        },
        "es-ES": {
            "ASSET": "Activo",
            "DIRECTION": "Dirección",
            "ENTRY": "Entrada",
            "EXIT": "Salida",
            "PL": "Resultado",
            "QUANTITY": "Cant",
            "STRATEGY": "Estrategia"
        },
        "fr-FR": {
            "ASSET": "Actif",
            "DIRECTION": "Direction",
            "ENTRY": "Entrée",
            "EXIT": "Sortie",
            "PL": "Résultat",
            "QUANTITY": "Qté",
            "STRATEGY": "Stratégie"
        }
    }
    
    data["LIST"]["TABLE"].update(table_map.get(lang, table_map["en-US"]))
    print(f"[{lang}] Injected LIST.TABLE keys")

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

for lang in locales:
    print(f"Processing {lang}...")
    process_trades(lang)
    process_strategies(lang)
    process_fiscal(lang)
    process_common(lang)

print("Done!")
