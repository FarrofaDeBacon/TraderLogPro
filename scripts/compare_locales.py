import json
import os

def get_keys(data, prefix=''):
    keys = {}
    if isinstance(data, dict):
        for k, v in data.items():
            new_prefix = f"{prefix}.{k}" if prefix else k
            keys.update(get_keys(v, new_prefix))
    else:
        keys[prefix] = data
    return keys

def compare_locales(base_path, other_paths):
    with open(base_path, 'r', encoding='utf-8') as f:
        base_data = json.load(f)
    
    base_keys = get_keys(base_data)
    
    results = {}
    for path in other_paths:
        lang = os.path.basename(path).split('.')[0]
        with open(path, 'r', encoding='utf-8') as f:
            other_data = json.load(f)
        
        other_keys = get_keys(other_data)
        
        missing = [k for k in base_keys if k not in other_keys]
        results[lang] = missing
        
    return results

if __name__ == "__main__":
    base = r"c:\PROJETOS\TraderLogPro\src\lib\i18n\locales\pt-BR.json"
    others = [
        r"c:\PROJETOS\TraderLogPro\src\lib\i18n\locales\en-US.json",
        r"c:\PROJETOS\TraderLogPro\src\lib\i18n\locales\es-ES.json",
        r"c:\PROJETOS\TraderLogPro\src\lib\i18n\locales\fr-FR.json"
    ]
    
    diffs = compare_locales(base, others)
    for lang, missing in diffs.items():
        print(f"--- {lang} (Missing {len(missing)} keys) ---")
        for m in missing:
            print(m)
