import json
import os

def deep_merge(source, target):
    """
    Merge source into target. If key exists in source but not target,
    add it to target. If it exists in both and is a dict, recurse.
    """
    for key, value in source.items():
        if isinstance(value, dict):
            # get node or create one
            node = target.setdefault(key, {})
            if not isinstance(node, dict):
                # source has dict, target has scalar? replace target with dict
                target[key] = value.copy()
            else:
                deep_merge(value, node)
        else:
            if key not in target:
                target[key] = f"[TODO] {value}"
    return target

def sync_locales():
    locales_dir = r"c:\PROJETOS\TraderLogPro\src\lib\i18n\locales"
    pt_br_path = os.path.join(locales_dir, "pt-BR.json")
    
    with open(pt_br_path, 'r', encoding='utf-8') as f:
        source_of_truth = json.load(f)
    
    # Save pt-BR normalized
    with open(pt_br_path, 'w', encoding='utf-8') as f:
        json.dump(source_of_truth, f, indent=2, sort_keys=True, ensure_ascii=False)
    
    others = ["en-US.json", "es-ES.json", "fr-FR.json"]
    for filename in others:
        path = os.path.join(locales_dir, filename)
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Merge source (pt-BR) into target (data)
        synced_data = deep_merge(source_of_truth, data)
        
        # Save synced and normalized
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(synced_data, f, indent=2, sort_keys=True, ensure_ascii=False)
        print(f"Synced {filename}")

if __name__ == "__main__":
    sync_locales()
