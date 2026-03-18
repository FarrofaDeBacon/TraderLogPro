const fs = require('fs');
let content = fs.readFileSync('c:/PROJETOS/TraderLogPro/src/lib/stores/settings.test.ts', 'utf8');

// Match the trailing 3 closure blocks of the file
content = content.replace(/}\s*\);\s*}\s*\);\s*}\s*\);\s*$/, '');

const appendix = `
        });
    });

    describe('Facade Pattern & Domain Delegation (Block C)', () => {
        beforeEach(() => {
            vi.clearAllMocks();
            accountsStore.clearAccounts();
            assetsStore.clearAssets();
            riskSettingsStore.clearRiskSettings();
            currenciesStore.clearCurrencies();
            marketsStore.clearMarkets();
            assetTypesStore.clearAssetTypes();
            modalitiesStore.clearModalities();
            timeframesStore.clearTimeframes();
            chartTypesStore.clearChartTypes();
            indicatorsStore.clearIndicators();
        });

        it('should correctly proxy passive read states to their domain endpoints', () => {
            assetsStore.assets = [{ id: 'mock-asset' }] as any;
            accountsStore.accounts = [{ id: 'mock-account' }] as any;
            riskSettingsStore.riskProfiles = [{ id: 'mock-risk' }] as any;
            currenciesStore.currencies = [{ id: 'mock-currency' }] as any;
            marketsStore.markets = [{ id: 'mock-market' }] as any;
            assetTypesStore.assetTypes = [{ id: 'mock-type' }] as any;
            modalitiesStore.modalities = [{ id: 'mock-modality' }] as any;
            timeframesStore.timeframes = [{ id: 'mock-timeframe' }] as any;
            chartTypesStore.chartTypes = [{ id: 'mock-chart' }] as any;
            indicatorsStore.indicators = [{ id: 'mock-indicator' }] as any;

            expect(settingsStore.assets.length).toBe(1);
            expect(settingsStore.accounts.length).toBe(1);
            expect(settingsStore.riskProfiles.length).toBe(1);
            expect(settingsStore.currencies.length).toBe(1);
            expect(settingsStore.markets.length).toBe(1);
            expect(settingsStore.assetTypes.length).toBe(1);
            expect(settingsStore.modalities.length).toBe(1);
            expect(settingsStore.timeframes.length).toBe(1);
            expect(settingsStore.chartTypes.length).toBe(1);
            expect(settingsStore.indicators.length).toBe(1);
            
            expect(settingsStore.assets).toBe(assetsStore.assets);
        });

        it('should seamlessly delegate mutation methods to domain handlers', () => {
            const addAssetSpy = vi.spyOn(assetsStore, 'addAsset').mockImplementation(() => 'test');
            const addAccountSpy = vi.spyOn(accountsStore, 'addAccount').mockImplementation(() => {});
            const addCurrencySpy = vi.spyOn(currenciesStore, 'addCurrency').mockImplementation(() => {});
            const addMarketSpy = vi.spyOn(marketsStore, 'addMarket').mockImplementation(() => {});
            const addIndicatorSpy = vi.spyOn(indicatorsStore, 'addIndicator').mockImplementation(() => {});

            settingsStore.addAsset({} as any);
            settingsStore.addAccount({} as any);
            settingsStore.addCurrency({} as any);
            settingsStore.addMarket({} as any);
            settingsStore.addIndicator({} as any);

            expect(addAssetSpy).toHaveBeenCalledOnce();
            expect(addAccountSpy).toHaveBeenCalledOnce();
            expect(addCurrencySpy).toHaveBeenCalledOnce();
            expect(addMarketSpy).toHaveBeenCalledOnce();
            expect(addIndicatorSpy).toHaveBeenCalledOnce();
        });
    });

    describe('Cross-Domain Integration & Safe Deletion (Block D)', () => {
        beforeEach(() => {
            vi.clearAllMocks();
            accountsStore.clearAccounts();
            assetsStore.clearAssets();
            currenciesStore.clearCurrencies();
            marketsStore.clearMarkets();
            assetTypesStore.clearAssetTypes();
            riskSettingsStore.clearRiskSettings();
        });

        it('Scenario A: Blocks Currency deletion if bound to an existing Account', async () => {
            currenciesStore.currencies = [{ id: 'cur:BRL', code: 'BRL', name: '', symbol: '' }];
            accountsStore.accounts = [{ id: 'acc:1', currency_id: 'cur:BRL' }] as any;

            const res = await settingsStore.deleteCurrency('cur:BRL');
            expect(res.success).toBe(false);
            expect(currenciesStore.currencies.length).toBe(1); 
        });

        it('Scenario B: Blocks Market deletion if bound to an Asset Type or Asset', async () => {
            marketsStore.markets = [{ id: 'mkt:B3', code: 'B3', name: '', country: '' }];
            assetTypesStore.assetTypes = [{ id: 'type:1', market_id: 'mkt:B3' }] as any;
            
            let res = await settingsStore.deleteMarket('mkt:B3');
            expect(res.success).toBe(false);

            assetTypesStore.clearAssetTypes();
            assetsStore.assets = [{ id: 'ast:1', market_id: 'mkt:B3' }] as any;
            res = await settingsStore.deleteMarket('mkt:B3');
            expect(res.success).toBe(false);
        });

        it('Scenario C: Blocks AssetType deletion if logically bound to an Asset', async () => {
            assetTypesStore.assetTypes = [{ id: 'type:STK', code: 'STK', name: '', market_id: '', has_expiration: false, tax_profile_id: '' }];
            assetsStore.assets = [{ id: 'ast:PETR4', asset_type_id: 'type:STK' }] as any;

            const res = await settingsStore.deleteAssetType('type:STK');
            expect(res.success).toBe(false);
        });

        it('Scenario D: Current assets continue reading cleanly from isolated store proxy', () => {
            assetsStore.assets = [{ id: 'ast:1', symbol: 'WIN', point_value: 0.20, tick_size: 5 }] as any;
            const asset = settingsStore.getAssetById('ast:1');
            expect(asset?.symbol).toBe('WIN');
        });

        it('Scenario E: Risk and AssetProfiles retain account associations natively', () => {
            accountsStore.accounts = [{ id: 'acc:1', nickname: 'Main' }] as any;
            riskSettingsStore.riskProfiles = [{ id: 'risk:1', account_ids: ['acc:1'] }] as any;
            const active = riskSettingsStore.getActiveRiskProfileForAccount('acc:1');
            expect(active?.id).toBe('risk:1');
        });
    });
});
`;

fs.writeFileSync('c:/PROJETOS/TraderLogPro/src/lib/stores/settings.test.ts', content + appendix);
console.log('Successfully patched settings.test.ts');
