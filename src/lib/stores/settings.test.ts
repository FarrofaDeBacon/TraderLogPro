import { describe, it, expect, vi, beforeEach } from 'vitest';
import { accountsStore } from './accounts.svelte';
import { currenciesStore } from './currencies.svelte';
import { marketsStore } from './markets.svelte';
import { settingsStore } from './settings.svelte';
import { riskSettingsStore } from './risk-settings.svelte';
import { assetsStore } from './assets.svelte';

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

    it('should initialize with default userProfile values', () => {
        // userProfile is initialized with BRL and pt-BR
        expect(settingsStore.userProfile.language).toBe('pt-BR');
        expect(settingsStore.userProfile.main_currency).toBe('BRL');
        // CRITICAL for detached windows: should start empty to avoid theme flash/override
        expect(settingsStore.userProfile.theme).toBe('');
    });

    it('should calculate trial days correctly', () => {
        const now = new Date();
        const trialStart = new Date(now);
        trialStart.setDate(now.getDate() - 2); // 2 days ago

        settingsStore.userProfile.trial_start_date = trialStart.toISOString();

        // Code has: Math.max(0, 7 - diffDays)
        // 7 - 2 = 5
        expect(settingsStore.trialDaysLeft).toBe(5);
    });

    it('should handle expired trial correctly', () => {
        const now = new Date();
        const trialStart = new Date(now);
        trialStart.setDate(now.getDate() - 10); // 10 days ago (limit is 7)

        settingsStore.userProfile.trial_start_date = trialStart.toISOString();
        expect(settingsStore.trialDaysLeft).toBe(0);
        expect(settingsStore.licenseStatus).toBe('expired');
    });

    it('should calculate license days remaining correctly', () => {
        const now = new Date();
        const expiration = new Date(now);
        expiration.setDate(now.getDate() + 15); // Expiring in 15 days

        settingsStore.licenseDetails = {
            valid: true,
            plan: "Pro",
            expiration: expiration.toISOString(),
            createdAt: now.toISOString()
        };

        expect(settingsStore.licenseDaysRemaining).toBe(15);
        expect(settingsStore.licenseStatus).toBe('active');
    });

    it('should handle lifetime licenses correctly', () => {
        settingsStore.licenseDetails = {
            valid: true,
            plan: "Lifetime",
            expiration: null,
            createdAt: new Date().toISOString()
        };

        expect(settingsStore.licensePlanName).toBe('Lifetime');
        expect(settingsStore.licenseDaysRemaining).toBeNull();
        expect(settingsStore.licenseTotalDays).toBeNull();
    });

    it('should auto-detect asset types and point values in ensureAssetExists', () => {
        // Mock dependencies
        settingsStore.assetTypes = [
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
        settingsStore.ensureAssetExists('WINJ24');
        let asset = settingsStore.assets.find(a => a.symbol === 'WINJ24');
        expect(asset).toBeDefined();
        expect(asset?.asset_type_id).toBe('type_index');
        expect(asset?.point_value).toBe(0.20);

        // Test Mini Dollar (WDO)
        settingsStore.ensureAssetExists('WDOK24');
        asset = settingsStore.assets.find(a => a.symbol === 'WDOK24');
        expect(asset?.point_value).toBe(10.0);

        // Test Stocks (PETR4)
        settingsStore.ensureAssetExists('PETR4');
        asset = settingsStore.assets.find(a => a.symbol === 'PETR4');
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
                growth_plan_enabled: true,
                current_phase_index: 0,
                growth_phases: [{ id: 'gp1', level: 1, name: 'Phase 1', lot_size: 1, conditions_to_advance: [], conditions_to_demote: [] }],
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
            const result = await settingsStore.duplicateRiskProfile('non-existent');
            expect(result).toBeNull();
        });

        it('creates a new RiskProfile with a new id, active false and suffix (TESTE A2)', async () => {
            const { originalProfileId } = setupStore();
            const originalLength = settingsStore.riskProfiles.length;
            
            const newId = await settingsStore.duplicateRiskProfile(originalProfileId);
            
            expect(newId).toBeTruthy();
            expect(newId).not.toBe(originalProfileId);
            expect(settingsStore.riskProfiles.length).toBe(originalLength + 1);

            const clonedProfile = settingsStore.riskProfiles.find(p => p.id === newId);
            expect(clonedProfile!.name).toContain('(Cópia)');
            expect(clonedProfile!.active).toBe(false);
        });

        it('preserves linked account and capital source (TESTE A3)', async () => {
            const { originalProfileId } = setupStore();
            
            const newId = await settingsStore.duplicateRiskProfile(originalProfileId);
            const clonedProfile = settingsStore.riskProfiles.find(p => p.id === newId);
            const originalProfile = settingsStore.riskProfiles.find(p => p.id === originalProfileId);
            
            expect(clonedProfile!.linked_account_id).toBe(originalProfile!.linked_account_id);
            expect(clonedProfile!.capital_source).toBe(originalProfile!.capital_source);
        });

        it('deep clones growth phases with new ids and same content (TESTE A4)', async () => {
            const { originalProfileId } = setupStore();
            
            const newId = await settingsStore.duplicateRiskProfile(originalProfileId);
            const clonedProfile = settingsStore.riskProfiles.find(p => p.id === newId);
            const originalProfile = settingsStore.riskProfiles.find(p => p.id === originalProfileId);
            
            expect(clonedProfile!.growth_phases).toBeDefined();
            expect(clonedProfile!.growth_phases!.length).toBe(originalProfile!.growth_phases!.length);
            expect(clonedProfile!.growth_phases![0].id).not.toBe(originalProfile!.growth_phases![0].id);
            expect(clonedProfile!.growth_phases![0].name).toBe(originalProfile!.growth_phases![0].name);
        });

        it('preserves linked asset risk profile ids without cloning AssetRiskProfiles (TESTE A5)', async () => {
            const { originalProfileId, originalAssetProfileId } = setupStore();
            const originalAssetProfilesCount = settingsStore.assetRiskProfiles.length;
            
            const newId = await settingsStore.duplicateRiskProfile(originalProfileId);
            const clonedProfile = settingsStore.riskProfiles.find(p => p.id === newId);
            
            expect(clonedProfile!.linked_asset_risk_profile_ids).toEqual([originalAssetProfileId]);
            expect(settingsStore.assetRiskProfiles.length).toBe(originalAssetProfilesCount);
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
                growth_plan_enabled: true,
                current_phase_index: 0,
                growth_phases: [{ id: 'gp1', level: 1, name: 'Phase 1', lot_size: 1, conditions_to_advance: [], conditions_to_demote: [] }],
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
            const result = settingsStore.createRiskProfileTemplate('non-existent');
            expect(result).toBeNull();
        });

        it('clears linked_account_id (TESTE B2)', () => {
            const { baseId } = setupStore();
            const template = settingsStore.createRiskProfileTemplate(baseId);
            
            expect(template).toBeDefined();
            expect(template!.linked_account_id).toBeNull();
        });

        it('preserves capital_source (TESTE B3)', () => {
            const { baseId } = setupStore();
            const template = settingsStore.createRiskProfileTemplate(baseId);
            expect(template!.capital_source).toBe('LinkedAccount');
        });

        it('preserves linked asset risk profile ids without generating new ones (TESTE B4)', () => {
            const { baseId, assetProfileId } = setupStore();
            const assetProfilesCount = settingsStore.assetRiskProfiles.length;
            
            const template = settingsStore.createRiskProfileTemplate(baseId);
            
            expect(template!.linked_asset_risk_profile_ids).toEqual([assetProfileId]);
            expect(settingsStore.assetRiskProfiles.length).toBe(assetProfilesCount);
        });

        it('deep clones growth phases with new ids (TESTE B5)', () => {
            const { baseId } = setupStore();
            const original = settingsStore.riskProfiles[0];
            const template = settingsStore.createRiskProfileTemplate(baseId);
            
            expect(template!.growth_phases).toBeDefined();
            expect(template!.growth_phases!.length).toBe(original.growth_phases!.length);
            expect(template!.growth_phases![0].id).not.toBe(original.growth_phases![0].id);
            expect(template!.growth_phases![0].name).toBe(original.growth_phases![0].name);
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

            const startingCount = settingsStore.assetRiskProfiles.length;

            settingsStore.updateAssetRiskProfile(sharedAssetProfileId, { default_stop_points: 200 });
            
            expect(settingsStore.assetRiskProfiles.length).toBe(startingCount);
            expect(settingsStore.assetRiskProfiles.find(p => p.id === sharedAssetProfileId)?.default_stop_points).toBe(200);
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
                growth_plan_enabled: true,
                current_phase_index: 0,
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
                growth_phases: []
            }];

            const newId = await settingsStore.duplicateRiskProfile(originalProfileId);
            
            const original = settingsStore.riskProfiles.find(p => p.id === originalProfileId);
            const copy = settingsStore.riskProfiles.find(p => p.id === newId);

            expect(original!.linked_asset_risk_profile_ids).toEqual([sharedAssetProfileId]);
            expect(copy!.linked_asset_risk_profile_ids).toEqual([sharedAssetProfileId]);
            expect(copy!.linked_asset_risk_profile_ids![0]).toBe(original!.linked_asset_risk_profile_ids![0]);
        });
    });
});
