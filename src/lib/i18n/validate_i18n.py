import json
import os
import sys

def check_collisions(directory):
    all_keys = {}
    files = [f for f in os.listdir(directory) if f.endswith('.json') and f != 'index.json']
    
    collisions = []
    
    for filename in files:
        filepath = os.path.join(directory, filename)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for key in data.keys():
                    if key in all_keys:
                        collisions.append(f"Collision: Key '{key}' found in '{filename}' and '{all_keys[key]}'")
                    else:
                        all_keys[key] = filename
        except Exception as e:
            print(f"Error reading {filename}: {e}")
            return False

    if collisions:
        for c in collisions:
            print(c)
        return False
    
    print(f"No collisions found in {directory}!")
    return True

if __name__ == "__main__":
    base_dir = "c:/PROJETOS/TraderLogPro/src/lib/i18n/locales"
    pt_dir = os.path.join(base_dir, "pt-BR")
    en_dir = os.path.join(base_dir, "en-US")
    
    success = True
    print("Checking pt-BR...")
    if not check_collisions(pt_dir):
        success = False
        
    print("\nChecking en-US...")
    if not check_collisions(en_dir):
        success = False
        
    if not success:
        sys.exit(1)
    sys.exit(0)
