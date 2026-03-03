import json
import collections

def count_keys(data):
    if isinstance(data, dict):
        return sum(count_keys(v) for v in data.values()) + len(data)
    elif isinstance(data, list):
        return sum(count_keys(i) for i in data)
    else:
        return 1

def analyze_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        lines = content.count('\n') + 1
        data = json.loads(content)
        keys = count_keys(data)
    return lines, keys

files = [
    r"c:\PROJETOS\TraderLogPro\src\lib\i18n\locales\pt-BR.json",
    r"c:\PROJETOS\TraderLogPro\src\lib\i18n\locales\en-US.json",
    r"c:\PROJETOS\TraderLogPro\src\lib\i18n\locales\es-ES.json",
    r"c:\PROJETOS\TraderLogPro\src\lib\i18n\locales\fr-FR.json"
]

for f in files:
    l, k = analyze_json(f)
    print(f"{f.split('\\')[-1]}: Lines={l}, Keys (Nested Total)={k}")
