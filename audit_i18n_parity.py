import json
import os
import glob

def get_all_keys(d, prefix=''):
    keys = set()
    for k, v in d.items():
        if isinstance(v, dict):
            keys.update(get_all_keys(v, prefix + k + '.'))
        else:
            keys.add(prefix + k)
    return keys

def compare_locales(path_pt, path_en):
    try:
        with open(path_pt, 'r', encoding='utf-8') as f:
            data_pt = json.load(f)
        with open(path_en, 'r', encoding='utf-8') as f:
            data_en = json.load(f)
        
        keys_pt = get_all_keys(data_pt)
        keys_en = get_all_keys(data_en)
        
        only_pt = keys_pt - keys_en
        only_en = keys_en - keys_pt
        
        return only_pt, only_en
    except Exception as e:
        return f"Error: {e}", f"Error: {e}"

base_path = r"c:\PROJETOS\TraderLogPro\src\lib\i18n\locales"
locales = ["pt-BR", "en-US"]

files = [os.path.basename(x) for x in glob.glob(os.path.join(base_path, "pt-BR", "*.json"))]

print(f"{'File':<20} | {'Only PT':<15} | {'Only EN':<15}")
print("-" * 55)

for f in files:
    pt_f = os.path.join(base_path, "pt-BR", f)
    en_f = os.path.join(base_path, "en-US", f)
    
    if not os.path.exists(en_f):
        print(f"{f:<20} | {'MISSING EN':<15} | {'-'*15}")
        continue
        
    opt, oen = compare_locales(pt_f, en_f)
    print(f"{f:<20} | {len(opt):<15} | {len(oen):<15}")
    if opt:
        print(f"  Missing in EN: {list(opt)[:5]}...")
    if oen:
        print(f"  Missing in PT: {list(oen)[:5]}...")
