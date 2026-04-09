import json

def get_keys(d, p=''): 
    return [p+k for k in d] + [i for k, v in d.items() if isinstance(v, dict) for i in get_keys(v, p+k+'.')]

pt = json.load(open('src/lib/i18n/locales/pt-BR/settings.json', encoding='utf-8'))
en = json.load(open('src/lib/i18n/locales/en-US/settings.json', encoding='utf-8'))

pt_keys = set(get_keys(pt))
en_keys = set(get_keys(en))

print('Missing in EN:', pt_keys - en_keys)
print('Missing in PT:', en_keys - pt_keys)
