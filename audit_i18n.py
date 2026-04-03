import os
import json

def count_keys(d):
    count = 0
    for k, v in d.items():
        count += 1
        if isinstance(v, dict):
            count += count_keys(v)
    return count

def get_all_keys(d, prefix=""):
    keys = set()
    for k, v in d.items():
        full_key = f"{prefix}.{k}" if prefix else k
        keys.add(full_key)
        if isinstance(v, dict):
            keys.update(get_all_keys(v, full_key))
    return keys

locales_dir = "src/lib/i18n/locales"
languages = ["pt-BR", "en-US", "es-ES", "fr-FR"]
all_files = set()

for lang in languages:
    lang_path = os.path.join(locales_dir, lang)
    if os.path.exists(lang_path):
        for f in os.listdir(lang_path):
            if f.endswith(".json"):
                all_files.add(f)

print(f"{'File':<20} | {'Lang':<6} | {'Keys':<6} | {'Diff'}")
print("-" * 50)

for filename in sorted(list(all_files)):
    reference_keys = set()
    counts = {}
    
    # Use pt-BR as reference if it exists
    ref_path = os.path.join(locales_dir, "pt-BR", filename)
    if os.path.exists(ref_path):
        with open(ref_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            reference_keys = get_all_keys(data)
            counts["pt-BR"] = count_keys(data)
    
    for lang in languages:
        path = os.path.join(locales_dir, lang, filename)
        if not os.path.exists(path):
            print(f"{filename:<20} | {lang:<6} | MISSING")
            continue
            
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            curr_keys = get_all_keys(data)
            curr_count = count_keys(data)
            counts[lang] = curr_count
            
            diff = reference_keys - curr_keys
            diff_str = f"Missing: {len(diff)}" if diff else "OK"
            print(f"{filename:<20} | {lang:<6} | {curr_count:<6} | {diff_str}")
    print("-" * 50)
