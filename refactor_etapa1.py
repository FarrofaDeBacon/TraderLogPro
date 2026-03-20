import os
import re

MAPPING = {
    'accounts': {'store': 'accountsStore', 'import_path': '"$lib/stores/accounts.svelte"'},
    'currencies': {'store': 'currenciesStore', 'import_path': '"$lib/stores/currencies.svelte"'},
    'assets': {'store': 'assetsStore', 'import_path': '"$lib/stores/assets.svelte"'},
    'assetTypes': {'store': 'assetTypesStore', 'import_path': '"$lib/stores/asset-types.svelte"'},
    'markets': {'store': 'marketsStore', 'import_path': '"$lib/stores/markets.svelte"'},
    'modalities': {'store': 'modalitiesStore', 'import_path': '"$lib/stores/modalities.svelte"'},
    'timeframes': {'store': 'timeframesStore', 'import_path': '"$lib/stores/timeframes.svelte"'},
    'indicators': {'store': 'indicatorsStore', 'import_path': '"$lib/stores/indicators.svelte"'},
    'chartTypes': {'store': 'chartTypesStore', 'import_path': '"$lib/stores/chart-types.svelte"'},
    'riskProfiles': {'store': 'riskSettingsStore', 'import_path': '"$lib/stores/risk-settings.svelte"'},
    'assetRiskProfiles': {'store': 'riskSettingsStore', 'import_path': '"$lib/stores/risk-settings.svelte"'},
    'growthPlans': {'store': 'riskSettingsStore', 'import_path': '"$lib/stores/risk-settings.svelte"'},
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    needed_imports = set()

    # Find and replace
    for prop, config in MAPPING.items():
        pattern = r'settingsStore\.' + prop + r'\b'
        if re.search(pattern, content):
            content = re.sub(pattern, f"{config['store']}.{prop}", content)
            needed_imports.add((config['store'], config['import_path']))

    # Also replace method calls if any
    # getGrowthPlanForProfile, addGrowthPlan, updateGrowthPlan, deleteGrowthPlan
    methods_risk = ['getGrowthPlanForProfile', 'addGrowthPlan', 'updateGrowthPlan', 'deleteGrowthPlan']
    for method in methods_risk:
        pattern = r'settingsStore\.' + method + r'\b'
        if re.search(pattern, content):
            content = re.sub(pattern, f"riskSettingsStore.{method}", content)
            needed_imports.add(('riskSettingsStore', '"$lib/stores/risk-settings.svelte"'))

    if content == original_content:
        return # No changes

    # Inject missing imports
    for store_name, imp_path in needed_imports:
        import_stmt = f'import {{ {store_name} }} from {imp_path};'
        if import_stmt in content:
            continue
        
        # Determine where to inject
        if filepath.endswith('.svelte'):
            # Find <script> tag
            script_match = re.search(r'<script.*?>', content)
            if script_match:
                insert_pos = script_match.end()
                content = content[:insert_pos] + f'\n  {import_stmt}' + content[insert_pos:]
        elif filepath.endswith('.ts'):
            # Just put at the top (after other imports/frontmatter if needed)
            # Find first import
            import_match = re.search(r'import\s+', content)
            if import_match:
                insert_pos = import_match.start()
                content = content[:insert_pos] + f'{import_stmt}\n' + content[insert_pos:]
            else:
                content = f'{import_stmt}\n' + content

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated: {filepath}")

def main():
    src_dir = os.path.join(os.getcwd(), 'src')
    for root, dirs, files in os.walk(src_dir):
        # Skip the stores directory itself for pure domain stores so we don't accidentally do weird replacements
        # BUT we must process tests and other things. Actually, let's process all, but maybe skip `settings.svelte.ts`
        if 'settings.svelte.ts' in files and os.path.normpath(root).endswith('stores'):
            # Don't modify the God Store itself via regex, I'll do it manually.
            pass

        for file in files:
            if file == 'settings.svelte.ts' and 'stores' in root:
                continue
            if file.endswith('.svelte') or file.endswith('.ts'):
                process_file(os.path.join(root, file))

if __name__ == '__main__':
    main()
