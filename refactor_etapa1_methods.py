import os
import re

MAPPING = {
    # Accounts
    'addAccount': {'store': 'accountsStore', 'import_path': '"$lib/stores/accounts.svelte"'},
    'updateAccount': {'store': 'accountsStore', 'import_path': '"$lib/stores/accounts.svelte"'},
    'deleteAccount': {'store': 'accountsStore', 'import_path': '"$lib/stores/accounts.svelte"'},
    'deduplicateAccounts': {'store': 'accountsStore', 'import_path': '"$lib/stores/accounts.svelte"'},
    
    # Currencies
    'syncExchangeRates': {'store': 'currenciesStore', 'import_path': '"$lib/stores/currencies.svelte"'},
    'addCurrency': {'store': 'currenciesStore', 'import_path': '"$lib/stores/currencies.svelte"'},
    'updateCurrency': {'store': 'currenciesStore', 'import_path': '"$lib/stores/currencies.svelte"'},
    'deleteCurrency': {'store': 'currenciesStore', 'import_path': '"$lib/stores/currencies.svelte"'},
    'getCurrencySymbol': {'store': 'currenciesStore', 'import_path': '"$lib/stores/currencies.svelte"'},

    # Assets
    'addAsset': {'store': 'assetsStore', 'import_path': '"$lib/stores/assets.svelte"'},
    'updateAsset': {'store': 'assetsStore', 'import_path': '"$lib/stores/assets.svelte"'},
    'deleteAsset': {'store': 'assetsStore', 'import_path': '"$lib/stores/assets.svelte"'},
    'ensureAssetExists': {'store': 'assetsStore', 'import_path': '"$lib/stores/assets.svelte"'},

    # Asset Types
    'addAssetType': {'store': 'assetTypesStore', 'import_path': '"$lib/stores/asset-types.svelte"'},
    'updateAssetType': {'store': 'assetTypesStore', 'import_path': '"$lib/stores/asset-types.svelte"'},
    'deleteAssetType': {'store': 'assetTypesStore', 'import_path': '"$lib/stores/asset-types.svelte"'},

    # Markets
    'addMarket': {'store': 'marketsStore', 'import_path': '"$lib/stores/markets.svelte"'},
    'updateMarket': {'store': 'marketsStore', 'import_path': '"$lib/stores/markets.svelte"'},
    'deleteMarket': {'store': 'marketsStore', 'import_path': '"$lib/stores/markets.svelte"'},

    # Modalities
    'addModality': {'store': 'modalitiesStore', 'import_path': '"$lib/stores/modalities.svelte"'},
    'updateModality': {'store': 'modalitiesStore', 'import_path': '"$lib/stores/modalities.svelte"'},
    'deleteModality': {'store': 'modalitiesStore', 'import_path': '"$lib/stores/modalities.svelte"'},

    # Timeframes
    'addTimeframe': {'store': 'timeframesStore', 'import_path': '"$lib/stores/timeframes.svelte"'},
    'updateTimeframe': {'store': 'timeframesStore', 'import_path': '"$lib/stores/timeframes.svelte"'},
    'deleteTimeframe': {'store': 'timeframesStore', 'import_path': '"$lib/stores/timeframes.svelte"'},

    # Indicators
    'addIndicator': {'store': 'indicatorsStore', 'import_path': '"$lib/stores/indicators.svelte"'},
    'updateIndicator': {'store': 'indicatorsStore', 'import_path': '"$lib/stores/indicators.svelte"'},
    'deleteIndicator': {'store': 'indicatorsStore', 'import_path': '"$lib/stores/indicators.svelte"'},

    # Chart Types
    'addChartType': {'store': 'chartTypesStore', 'import_path': '"$lib/stores/chart-types.svelte"'},
    'updateChartType': {'store': 'chartTypesStore', 'import_path': '"$lib/stores/chart-types.svelte"'},
    'deleteChartType': {'store': 'chartTypesStore', 'import_path': '"$lib/stores/chart-types.svelte"'},

    # Risk Profiles
    'addRiskProfile': {'store': 'riskSettingsStore', 'import_path': '"$lib/stores/risk-settings.svelte"'},
    'updateRiskProfile': {'store': 'riskSettingsStore', 'import_path': '"$lib/stores/risk-settings.svelte"'},
    'deleteRiskProfile': {'store': 'riskSettingsStore', 'import_path': '"$lib/stores/risk-settings.svelte"'},
    'updateRiskProfilePhase': {'store': 'riskSettingsStore', 'import_path': '"$lib/stores/risk-settings.svelte"'},
    'duplicateRiskProfile': {'store': 'riskSettingsStore', 'import_path': '"$lib/stores/risk-settings.svelte"'},
    'createRiskProfileTemplate': {'store': 'riskSettingsStore', 'import_path': '"$lib/stores/risk-settings.svelte"'},

    # Asset Risk Profiles
    'addAssetRiskProfile': {'store': 'riskSettingsStore', 'import_path': '"$lib/stores/risk-settings.svelte"'},
    'updateAssetRiskProfile': {'store': 'riskSettingsStore', 'import_path': '"$lib/stores/risk-settings.svelte"'},
    'deleteAssetRiskProfile': {'store': 'riskSettingsStore', 'import_path': '"$lib/stores/risk-settings.svelte"'},
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    needed_imports = set()

    for method, config in MAPPING.items():
        pattern = r'settingsStore\.' + method + r'\b'
        if re.search(pattern, content):
            content = re.sub(pattern, f"{config['store']}.{method}", content)
            needed_imports.add((config['store'], config['import_path']))

    if content == original_content:
        return

    # Inject missing imports
    for store_name, imp_path in needed_imports:
        import_stmt = f'import {{ {store_name} }} from {imp_path};'
        if import_stmt in content:
            continue
        
        if filepath.endswith('.svelte'):
            script_match = re.search(r'<script.*?>', content)
            if script_match:
                insert_pos = script_match.end()
                content = content[:insert_pos] + f'\n  {import_stmt}' + content[insert_pos:]
        elif filepath.endswith('.ts'):
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
        for file in files:
            if file == 'settings.svelte.ts' and 'stores' in root:
                continue
            if file.endswith('.svelte') or file.endswith('.ts'):
                process_file(os.path.join(root, file))

if __name__ == '__main__':
    main()
