import json
import os

def fix_json(file_path):
    print(f"Fixing {file_path}...")
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 1. Handle root "Settings" (Capital S) collision
    if "Settings" in data:
        print(f"  Found root 'Settings' (caps). Merging into 'settings'...")
        caps_settings = data.pop("Settings")
        
        if "settings" not in data:
            data["settings"] = {}
        
        # Simple recursive merge for the caps Settings into lowercase settings
        def merge(source, destination):
            for key, value in source.items():
                if isinstance(value, dict) and key in destination and isinstance(destination[key], dict):
                    merge(value, destination[key])
                else:
                    destination[key.lower() if isinstance(key, str) else key] = value
            return destination

        merge(caps_settings, data["settings"])

    # 2. Ensure orphans are moved to "settings"
    # Permitted root keys according to safeMerge and es-ES template: finance, license, settings
    permitted = {"finance", "license", "settings"}
    orphans = [k for k in data.keys() if k not in permitted]
    
    if orphans:
        if "settings" not in data:
            data["settings"] = {}
        for orphan in orphans:
            print(f"  Moving orphan '{orphan}' to 'settings'...")
            val = data.pop(orphan)
            # If the orphan is already in settings, merge it
            if orphan in data["settings"] and isinstance(val, dict) and isinstance(data["settings"][orphan], dict):
                # Simple merge
                data["settings"][orphan].update(val)
            else:
                data["settings"][orphan] = val

    # 3. Sort keys for consistency (optional but good)
    # Ordered root: finance, license, settings
    ordered_data = {}
    for k in sorted(data.keys()):
        ordered_data[k] = data[k]

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(ordered_data, f, indent=4, ensure_ascii=False)
    print(f"  Done fixing {file_path}.")

# Paths
base_path = r"c:\PROJETOS\TraderLogPro\src\lib\i18n\locales"
locales = ["pt-BR", "en-US"]

for locale in locales:
    p = os.path.join(base_path, locale, "settings.json")
    if os.path.exists(p):
        fix_json(p)
    else:
        print(f"File not found: {p}")
