import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appStore } from "./app.svelte";
import { riskSettingsStore } from './risk-settings.svelte';
import { assetsStore } from './assets.svelte';
import { accountsStore } from './accounts.svelte';
import { currenciesStore } from './currencies.svelte';
import { marketsStore } from './markets.svelte';
import { assetTypesStore } from './asset-types.svelte';
import { modalitiesStore } from './modalities.svelte';
import { timeframesStore } from './timeframes.svelte';
import { chartTypesStore } from './chart-types.svelte';
import { indicatorsStore } from './indicators.svelte';

// Mock Tauri
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
    message: vi.fn(),
    confirm: vi.fn(),
}));

// Mock License Utility
vi.mock('$lib/utils/license', () => ({
    validateLicenseKey: vi.fn().mockResolvedValue({ valid: true, plan: "Pro", expiration: null }),
    computeCustomerId: vi.fn().mockResolvedValue("MOCK_CID"),
}));

describe('SettingsStore Unit Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset state for each test if possible, or handle dirty state
    });

    // Removed userProfile and license tests as they are now handled by userProfileStore

    it('should auto-detect asset types and point values in ensureAssetExists', () => {
        // Mock dependencies
        assetTypesStore.assetTypes = [
            { id: 'type_index', name: 'Contrato Futuro', code: 'INDEX' },
            { id: 'type_stock', name: 'Ações', code: 'STK' }
        ] as any;
        assetsStore.clearAssets();
        accountsStore.clearAccounts();
        currenciesStore.clearCurrencies();
        marketsStore.clearMarkets();
        riskSettingsStore.clearRiskSettings();

        // Mock crypto.randomUUID
        const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('mock-uuid' as any);

        // Test Mini Index (WIN)
        assetsStore.ensureAssetExists('WINJ24', undefined, assetTypesStore.assetTypes);
        let asset = assetsStore.assets.find(a => a.symbol === 'WINJ24');
        expect(asset).toBeDefined();
        expect(asset?.asset_type_id).toBe('type_index');
        expect(asset?.point_value).toBe(0.20);

        // Test Mini Dollar (WDO)
        assetsStore.ensureAssetExists('WDOK24', undefined, assetTypesStore.assetTypes);
        asset = assetsStore.assets.find(a => a.symbol === 'WDOK24');
        expect(asset?.point_value).toBe(10.0);

        // Test Stocks (PETR4)
        assetsStore.ensureAssetExists('PETR4', undefined, assetTypesStore.assetTypes);
        asset = assetsStore.assets.find(a => a.symbol === 'PETR4');
        expect(asset?.asset_type_id).toBe('type_stock');
        expect(asset?.point_value).toBe(1.0);

        uuidSpy.mockRestore();
    });

    describe('duplicateRiskProfile (Block A)', () => {
        const setupStore = () => {
            const originalProfileId = crypto.randomUUID();
            const originalAssetProfileId = crypto.randomUUID();

            riskSettingsStore.assetRiskProfiles = [{
                id: originalAssetProfileId,
                asset_id: 'asset1',
                name: 'Original Asset Profile',
                default_stop_points: 100,
                min_contracts: 1,
                max_contracts: 10,
                growth_override_enabled: false
            }];

            riskSettingsStore.riskProfiles = [{
                id: originalProfileId,
                name: 'Original Profile',
                active: true,
                max_daily_loss: 1000,
                daily_target: 2000,
                max_risk_per_trade_percent: 1,
                max_trades_per_day: 5,
                min_risk_reward: 2,
                lock_on_loss: true,
                target_type: 'Financial',
                capital_source: 'Fixed',
                fixed_capital: 10000,
                linked_account_id: 'acc1',
                
                psychological_coupling_enabled: false,
                outlier_regression_enabled: false,
                sniper_mode_enabled: false,
                sniper_mode_selectivity: 3,
                psychological_lookback_count: 10,
                outlier_lookback_count: 20,
                psychological_threshold: -2,
                lot_reduction_multiplier: 0.5,
                psychological_search_strategy: 'Strict',
                account_type_applicability: 'All',
                account_ids: [],
                linked_asset_risk_profile_ids: [originalAssetProfileId]
            }];

            return { originalProfileId, originalAssetProfileId };
        };

        it('returns null if profile does not exist (TESTE A1)', async () => {
            const result = await riskSettingsStore.duplicateRiskProfile('non-existent');
            expect(result).toBeNull();
        });

        it('creates a new RiskProfile with a new id, active false and suffix (TESTE A2)', async () => {
            const { originalProfileId } = setupStore();
            const originalLength = riskSettingsStore.riskProfiles.length;
            
            const newId = await riskSettingsStore.duplicateRiskProfile(originalProfileId);
            
            expect(newId).toBeTruthy();
            expect(newId).not.toBe(originalProfileId);
            expect(riskSettingsStore.riskProfiles.length).toBe(originalLength + 1);

            const clonedProfile = riskSettingsStore.riskProfiles.find(p => p.id === newId);
            expect(clonedProfile!.name).toContain('(Cópia)');
            expect(clonedProfile!.active).toBe(false);
        });

        it('preserves linked account and capital source (TESTE A3)', async () => {
            const { originalProfileId } = setupStore();
            
            const newId = await riskSettingsStore.duplicateRiskProfile(originalProfileId);
            const clonedProfile = riskSettingsStore.riskProfiles.find(p => p.id === newId);
            const originalProfile = riskSettingsStore.riskProfiles.find(p => p.id === originalProfileId);
            
            expect(clonedProfile!.linked_account_id).toBe(originalProfile!.linked_account_id);
            expect(clonedProfile!.capital_source).toBe(originalProfile!.capital_source);
        });

        it('preserves linked asset risk profile ids without cloning AssetRiskProfiles (TESTE A5)', async () => {
            const { originalProfileId, originalAssetProfileId } = setupStore();
            const originalAssetProfilesCount = riskSettingsStore.assetRiskProfiles.length;
            
            const newId = await riskSettingsStore.duplicateRiskProfile(originalProfileId);
            const clonedProfile = riskSettingsStore.riskProfiles.find(p => p.id === newId);
            
            expect(clonedProfile!.linked_asset_risk_profile_ids).toEqual([originalAssetProfileId]);
            expect(riskSettingsStore.assetRiskProfiles.length).toBe(originalAssetProfilesCount);
        });
    });

    describe('createRiskProfileTemplate (Block B)', () => {
        const setupStore = () => {
            const baseId = crypto.randomUUID();
            const assetProfileId = crypto.randomUUID();

            riskSettingsStore.riskProfiles = [{
                id: baseId,
                name: 'Base Template',
                active: true,
                max_daily_loss: 500,
                daily_target: 1000,
                max_risk_per_trade_percent: 1,
                max_trades_per_day: 3,
                min_risk_reward: 2,
                lock_on_loss: true,
                target_type: 'Financial',
                capital_source: 'LinkedAccount',
                fixed_capital: 0,
                linked_account_id: 'acc1',
                
                psychological_coupling_enabled: false,
                outlier_regression_enabled: false,
                sniper_mode_enabled: false,
                sniper_mode_selectivity: 3,
                psychological_lookback_count: 10,
                outlier_lookback_count: 20,
                psychological_threshold: -2,
                lot_reduction_multiplier: 0.5,
                psychological_search_strategy: 'Strict',
                account_type_applicability: 'All',
                account_ids: [],
                linked_asset_risk_profile_ids: [assetProfileId]
            }];

            return { baseId, assetProfileId };
        };

        it('does nothing if base profile does not exist (TESTE B1)', () => {
            const result = riskSettingsStore.createRiskProfileTemplate('non-existent');
            expect(result).toBeNull();
        });

        it('clears linked_account_id (TESTE B2)', () => {
            const { baseId } = setupStore();
            const template = riskSettingsStore.createRiskProfileTemplate(baseId);
            
            expect(template).toBeDefined();
            expect(template!.linked_account_id).toBeNull();
        });

        it('preserves capital_source (TESTE B3)', () => {
            const { baseId } = setupStore();
            const template = riskSettingsStore.createRiskProfileTemplate(baseId);
            expect(template!.capital_source).toBe('LinkedAccount');
        });

        it('preserves linked asset risk profile ids without generating new ones (TESTE B4)', () => {
            const { baseId, assetProfileId } = setupStore();
            const assetProfilesCount = riskSettingsStore.assetRiskProfiles.length;
            
            const template = riskSettingsStore.createRiskProfileTemplate(baseId);
            
            expect(template!.linked_asset_risk_profile_ids).toEqual([assetProfileId]);
            expect(riskSettingsStore.assetRiskProfiles.length).toBe(assetProfilesCount);
        });
    });

    describe('Regression / Security (Block C)', () => {
        it('editing an AssetRiskProfile shared by multiple RiskProfiles does not create new asset profiles (TESTE C1)', () => {
            const sharedAssetProfileId = crypto.randomUUID();
            
            riskSettingsStore.assetRiskProfiles = [{
                id: sharedAssetProfileId,
                asset_id: 'asset1',
                name: 'Shared Profile',
                default_stop_points: 100,
                min_contracts: 1,
                max_contracts: 10,
                growth_override_enabled: false
            }];

            const startingCount = riskSettingsStore.assetRiskProfiles.length;

            riskSettingsStore.updateAssetRiskProfile(sharedAssetProfileId, { default_stop_points: 200 });
            
            expect(riskSettingsStore.assetRiskProfiles.length).toBe(startingCount);
            expect(riskSettingsStore.assetRiskProfiles.find(p => p.id === sharedAssetProfileId)?.default_stop_points).toBe(200);
        });

        it('duplicateRiskProfile preserves shared asset profile references over time (TESTE C2)', async () => {
            const originalProfileId = crypto.randomUUID();
            const sharedAssetProfileId = crypto.randomUUID();

            riskSettingsStore.riskProfiles = [{
                id: originalProfileId,
                name: 'Original',
                active: true,
                max_daily_loss: 1000,
                daily_target: 2000,
                max_risk_per_trade_percent: 1,
                max_trades_per_day: 5,
                min_risk_reward: 2,
                lock_on_loss: true,
                target_type: 'Financial',
                capital_source: 'Fixed',
                fixed_capital: 10000,
                linked_account_id: null,
                psychological_coupling_enabled: false,
                outlier_regression_enabled: false,
                sniper_mode_enabled: false,
                sniper_mode_selectivity: 3,
                psychological_lookback_count: 10,
                outlier_lookback_count: 20,
                psychological_threshold: -2,
                lot_reduction_multiplier: 0.5,
                psychological_search_strategy: 'Strict',
                account_type_applicability: 'All',
                account_ids: [],
                linked_asset_risk_profile_ids: [sharedAssetProfileId],
                }];

            const newId = await riskSettingsStore.duplicateRiskProfile(originalProfileId);
            
            const original = riskSettingsStore.riskProfiles.find(p => p.id === originalProfileId);
            const copy = riskSettingsStore.riskProfiles.find(p => p.id === newId);

            expect(original!.linked_asset_risk_profile_ids).toEqual([sharedAssetProfileId]);
            expect(copy!.linked_asset_risk_profile_ids).toEqual([sharedAssetProfileId]);
            expect(copy!.linked_asset_risk_profile_ids![0]).toBe(original!.linked_asset_risk_profile_ids![0]);
        
        });
    });

    describe.skip('Facade Pattern & Domain Delegation (Block C)', () => {
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

            expect(assetsStore.assets.length).toBe(1);
            expect(accountsStore.accounts.length).toBe(1);
            expect(riskSettingsStore.riskProfiles.length).toBe(1);
            expect(currenciesStore.currencies.length).toBe(1);
            expect(marketsStore.markets.length).toBe(1);
            expect(assetTypesStore.assetTypes.length).toBe(1);
            expect(modalitiesStore.modalities.length).toBe(1);
            expect(timeframesStore.timeframes.length).toBe(1);
            expect(chartTypesStore.chartTypes.length).toBe(1);
            expect(indicatorsStore.indicators.length).toBe(1);
            
            expect(assetsStore.assets).toBe(assetsStore.assets);
        });

        it('should seamlessly delegate mutation methods to domain handlers', () => {
            const addAssetSpy = vi.spyOn(assetsStore, 'addAsset').mockImplementation(async () => {});
            const addAccountSpy = vi.spyOn(accountsStore, 'addAccount').mockImplementation(() => {});
            const addCurrencySpy = vi.spyOn(currenciesStore, 'addCurrency').mockImplementation(() => {});
            const addMarketSpy = vi.spyOn(marketsStore, 'addMarket').mockImplementation(() => {});
            const addIndicatorSpy = vi.spyOn(indicatorsStore, 'addIndicator').mockImplementation(() => {});

            assetsStore.addAsset({} as any);
            accountsStore.addAccount({} as any);
            currenciesStore.addCurrency({} as any);
            marketsStore.addMarket({} as any);
            indicatorsStore.addIndicator({} as any);

            expect(addAssetSpy).toHaveBeenCalledOnce();
            expect(addAccountSpy).toHaveBeenCalledOnce();
            expect(addCurrencySpy).toHaveBeenCalledOnce();
            expect(addMarketSpy).toHaveBeenCalledOnce();
            expect(addIndicatorSpy).toHaveBeenCalledOnce();
        });
    });

    describe.skip('Cross-Domain Integration & Safe Deletion (Block D)', () => {
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
            currenciesStore.currencies = [{ id: 'cur:BRL', code: 'BRL', name: '', symbol: '', exchange_rate: 1 }];
            accountsStore.accounts = [{ id: 'acc:1', currency_id: 'cur:BRL', currency: 'cur:BRL' }] as any;

            const res = await currenciesStore.deleteCurrency('cur:BRL');
            expect(res.success).toBe(false);
            expect(currenciesStore.currencies.length).toBe(1); 
        });

        it('Scenario B: Blocks Market deletion if bound to an Asset Type or Asset', async () => {
            marketsStore.markets = [{ id: 'mkt:B3', code: 'B3', name: '' } as any];
            assetTypesStore.assetTypes = [{ id: 'type:1', market_id: 'mkt:B3' }] as any;
            
            let res = await marketsStore.deleteMarket('mkt:B3');
            expect(res.success).toBe(false);
        });

        it('Scenario C: Blocks AssetType deletion if logically bound to an Asset', async () => {
            assetTypesStore.assetTypes = [{ id: 'type:STK', code: 'STK', name: '', market_id: '', tax_profile_id: '', result_type: 'currency', unit_label: '' } as any];
            assetsStore.assets = [{ id: 'ast:PETR4', asset_type_id: 'type:STK' }] as any;

            const res = await assetTypesStore.deleteAssetType('type:STK');
            expect(res.success).toBe(false);
        });

        it('Scenario D: Current assets continue reading cleanly from isolated store proxy', () => {
            assetsStore.assets = [{ id: 'ast:1', symbol: 'WIN', point_value: 0.20, tick_size: 5 }] as any;
            const asset = assetsStore.assets.find(a => a.id === 'ast:1');
            expect(asset?.symbol).toBe('WIN');
        });

        it('Scenario E: Risk and AssetProfiles retain account associations natively', () => {
            accountsStore.accounts = [{ id: 'acc:1', nickname: 'Main' }] as any;
            riskSettingsStore.riskProfiles = [{ id: 'risk:1', account_ids: ['acc:1'] }] as any;
            const active = riskSettingsStore.riskProfiles.find(p => p.account_ids?.includes('acc:1'));
            expect(active?.id).toBe('risk:1');
        });
    });
});
