import os
import json

def sort_dict(d):
    """Sorts dictionary keys recursively."""
    if isinstance(d, dict):
        return {k: sort_dict(v) for k, v in sorted(d.items())}
    return d

def sync_dicts(source, target):
    """Ensures all keys in source exist in target. Returns synced target."""
    if not isinstance(source, dict):
        return target
        
    synced = target if isinstance(target, dict) else {}
    
    for k, v in source.items():
        if k not in synced:
            # Key missing in target - copy from source (placeholder/auto-translate)
            synced[k] = v
        elif isinstance(v, dict):
            # Recursively sync nested dicts
            synced[k] = sync_dicts(v, synced.get(k, {}))
            
    return synced

def sync_file(filename):
    locales_dir = "src/lib/i18n/locales"
    pt_path = os.path.join(locales_dir, "pt-BR", filename)
    
    if not os.path.exists(pt_path):
        print(f"Source file {pt_path} not found.")
        return

    with open(pt_path, 'r', encoding='utf-8') as f:
        source_data = json.load(f)
        
    languages = ["en-US", "es-ES", "fr-FR", "pt-BR"] # Include pt-BR just for sorting
    
    for lang in languages:
        path = os.path.join(locales_dir, lang, filename)
        
        target_data = {}
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                target_data = json.load(f)
        
        # Sync and Sort
        synced_data = sync_dicts(source_data, target_data)
        sorted_data = sort_dict(synced_data)
        
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(sorted_data, f, ensure_ascii=False, indent=4)
        
        print(f"Synced and Sorted: {lang}/{filename}")

# Run for remaining files
sync_file("settings.json")
sync_file("trades.json")
sync_file("reports.json")
