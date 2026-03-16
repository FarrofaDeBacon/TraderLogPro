import sys
import time
import shutil
from deep_translator import GoogleTranslator

def translate_markdown(file_in, file_out, lang_code):
    translator = GoogleTranslator(source='pt', target=lang_code)
    
    with open(file_in, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    translated_lines = []
    
    for idx, line in enumerate(lines):
        stripped = line.strip()
        
        if not stripped:
            translated_lines.append("\n")
            continue
            
        if stripped.startswith("![") and "](" in stripped:
            translated_lines.append(line)
            continue
            
        if stripped.startswith("---") or stripped == "***":
            translated_lines.append(line)
            continue
            
        try:
            time.sleep(0.2)
            res = translator.translate(line)
            # Restore leading spaces (for lists)
            leading_spaces = len(line) - len(line.lstrip())
            safe_line = (" " * leading_spaces) + res + "\n"
            translated_lines.append(safe_line)
            if idx % 50 == 0:
                print(f"[{lang_code.upper()}] Translated line {idx}/{len(lines)}...")
        except Exception as e:
            print(f"Error translating line {idx}: {e}")
            translated_lines.append(line)
            
    with open(file_out, 'w', encoding='utf-8') as f:
        f.writelines(translated_lines)
        
    print(f"Finished {lang_code.upper()} -> {file_out}")

langs = {
    'en': 'docs/USER_MANUAL_en-US.md', 
    'es': 'docs/USER_MANUAL_es-ES.md', 
    'fr': 'docs/USER_MANUAL_fr-FR.md'
}

for code, path in langs.items():
    print(f"\n--- Starting translation logic for {code} ---")
    translate_markdown("docs/USER_MANUAL_pt-BR.md", path, code)
    
    # Also sync these to static folder
    static_path = "static/" + path
    shutil.copy(path, static_path)
    print(f"Copied to {static_path}")
