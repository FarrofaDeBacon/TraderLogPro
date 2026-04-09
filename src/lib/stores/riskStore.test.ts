import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 1. Mock dependencies to prevent auto-loading or rejections
vi.mock('$lib/stores/app.svelte', () => ({
    appStore: {
        loadData: vi.fn().mockResolvedValue(true),
        accounts: []
    }
}));

// Mock tradesStore to satisfy appStore.loadData even if it escapes mock
vi.mock('$lib/stores/trades.svelte', () => ({
    tradesStore: {
        trades: [],
        loadTrades: vi.fn().mockResolvedValue([])
    }
}));

vi.mock('$lib/services/tauri', () => ({
    safeInvoke: vi.fn()
}));

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn().mockResolvedValue([]),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
    message: vi.fn(),
    confirm: vi.fn(),
}));

// 2. Import the store
import { riskStore, RiskStore } from './riskStore.svelte';
import { tradesStore } from './trades.svelte';
import { accountsStore } from './accounts.svelte';
import { assetsStore } from './assets.svelte';
import { riskSettingsStore } from './risk-settings.svelte';

// We only need to override the getters on appStore to mock the inputs
describe('RiskStore Position Sizing Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset state
        riskStore.activeAssetId = null;
        riskSettingsStore.riskProfiles = [];
        assetsStore.assets = [];
        accountsStore.accounts = [];
        tradesStore.trades = [];
    });

    it('returns null if there is no active profile', () => {
        riskSettingsStore.riskProfiles = []; 
        expect(riskStore.positionSizingResult).toBeNull();
    });

    it('returns null if there is no active asset selected', () => {
        riskSettingsStore.riskProfiles = [{ 
            id: '1', 
            name: 'Test', 
            active: true, 
            max_risk_per_trade_percent: 1,
            capital_source: 'Fixed',
            fixed_capital: 1000,
            } as any];

        riskStore.activeAssetId = null;
        expect(riskStore.positionSizingResult).toBeNull();
    });

    it('assembles the input correctly based on selected asset and profile', () => {
        riskSettingsStore.riskProfiles = [{ 
            id: '1', 
            name: 'Test', 
            active: true, 
            max_risk_per_trade_percent: 1.5,
            capital_source: 'Fixed',
            fixed_capital: 5000,
            linked_asset_risk_profile_ids: ['profile-wdo']
        } as any];

        assetsStore.assets = [{
            id: 'WDO',
            symbol: 'WDO',
            name: 'Mini Dólar',
            point_value: 10.0
        } as any];

        riskSettingsStore.assetRiskProfiles = [{
            id: 'profile-wdo',
            asset_ids: ['WDO'],
            name: 'WDO Base',
            default_stop_points: 5,
            min_contracts: 1,
            max_contracts: 10
        } as any];

        riskStore.activeAssetId = 'WDO';
        
        const positionSizing = riskStore.positionSizingResult;
        expect(positionSizing).not.toBeNull();
        if(!positionSizing) return;

        expect(positionSizing.isValid).toBe(true);
    });

    it('computes result securely from the pure engine returning invalid state if stop is zero', () => {
        riskSettingsStore.riskProfiles = [{ 
            active: true, 
            max_risk_per_trade_percent: 1,
            capital_source: 'Fixed',
            fixed_capital: 1000,
            linked_asset_risk_profile_ids: ['profile-win']
        } as any];

        assetsStore.assets = [{
            id: 'WIN',
            point_value: 0.20
        } as any];

        riskSettingsStore.assetRiskProfiles = [{
            id: 'profile-win',
            asset_ids: ['WIN'],
            name: 'WIN No Stop',
            default_stop_points: 0, // NO STOP GIVEN!
            min_contracts: 1,
            max_contracts: 10
        } as any];

        riskStore.activeAssetId = 'WIN';

        const result = riskStore.positionSizingResult;
        expect(result).not.toBeNull();
        
        expect(result?.isValid).toBe(false);
        expect(result?.allowedContracts).toBe(0);
        expect(result?.reasons).toContain("Distância do Stop (stopPoints) deve ser maior que zero.");
    });

    describe('Risk Flow Integration Tests (ETAPA 10)', () => {
        it('Scenario A: Asset selected, NO AssetRiskProfile linked explicitly (Fallback to Auto-Resolution)', () => {
            riskSettingsStore.riskProfiles = [{ 
                id: 'global-1', active: true, 
                linked_asset_risk_profile_ids: [] 
            } as any];
            
            assetsStore.assets = [{ id: 'WDO', symbol: 'WDO', point_value: 10 } as any];
            
            riskSettingsStore.assetRiskProfiles = [{ 
                id: 'profile-wdo', asset_ids: ['WDO'], name: 'WDO Scope',
                default_stop_points: 10, min_contracts: 1
            } as any];
            
            riskStore.activeAssetId = 'WDO';
            
            expect(riskStore.resolvedAssetRiskProfile).toBeDefined();
            expect(riskStore.resolvedAssetRiskProfile?.id).toBe('profile-wdo');
            expect(riskStore.riskCockpitState).not.toBeNull(); 
            expect(riskStore.positionSizingResult).toBeDefined();
        });

        it('Scenario B: Asset selected, AssetRiskProfile linked, Global Growth', () => {
            riskSettingsStore.riskProfiles = [{ 
                id: 'global-1', active: true, linked_asset_risk_profile_ids: ['profile-wdo'],
                growth_plan_id: 'plan-1'
            } as any];
            
            riskSettingsStore.growthPlans = [{
                id: 'plan-1', enabled: true, current_phase_index: 0, 
                phases: [{ name: 'Phase 1', level: 1, lot_size: 1, conditions_to_advance: [], conditions_to_demote: [] }]
            } as any];

            assetsStore.assets = [{ id: 'WDO', symbol: 'WDO', point_value: 10 } as any];
            riskSettingsStore.assetRiskProfiles = [{ 
                id: 'profile-wdo', asset_ids: ['WDO'], 
                growth_override_enabled: false 
            } as any];
            
            riskStore.activeAssetId = 'WDO';
            
            const context = riskStore.resolvedGrowthContext;
            expect(context?.growthSourceType).toBe('assetProfile');
            expect(context?.growthPhase.name).toBe('Phase 1');
        });

        it('Scenario C: Asset selected, AssetRiskProfile linked, Override Growth', () => {
            riskSettingsStore.riskProfiles = [{ 
                id: 'global-1', active: true, linked_asset_risk_profile_ids: ['profile-wdo']
            } as any];
            assetsStore.assets = [{ id: 'WDO', symbol: 'WDO', point_value: 10 } as any];
            riskSettingsStore.assetRiskProfiles = [{ 
                id: 'profile-wdo', asset_ids: ['WDO'], 
                growth_override_enabled: true,
                growth_phases_override: [{ name: 'Override Phase 1', level: 1, lot_size: 15, conditions_to_advance: [], conditions_to_demote: [] }], 
                } as any];
            
            riskStore.activeAssetId = 'WDO';
            
            expect(riskStore.resolvedAssetRiskProfile?.id).toBe('profile-wdo');
            expect(riskStore.resolvedGrowthContext?.growthSourceType).toBe('assetProfile');
            expect(riskStore.resolvedGrowthContext?.growthPhase.maxContracts).toBe(15); 
        });

        it('Scenario D: Asset selected, valid config, output isValid = true with allowedContracts', () => {
             riskSettingsStore.riskProfiles = [{ 
                id: 'global-1', active: true, max_risk_per_trade_percent: 2.0, capital_source: 'Fixed', fixed_capital: 10000,
                linked_asset_risk_profile_ids: ['profile-wdo']
            } as any];
            assetsStore.assets = [{ id: 'WDO', symbol: 'WDO', point_value: 10.0 } as any];
            riskSettingsStore.assetRiskProfiles = [{ 
                id: 'profile-wdo', asset_ids: ['WDO'], default_stop_points: 10, min_contracts: 1, max_contracts: 50
            } as any];

            riskSettingsStore.growthPlans = [];
            
            riskStore.activeAssetId = 'WDO';
            
            const positionSizing = riskStore.positionSizingResult;
            expect(positionSizing).not.toBeNull();
            expect(positionSizing?.isValid).toBe(true);
            
            expect(positionSizing?.allowedContracts).toBe(2);
        });
    });
});

describe('RiskStore Persistence (activeAssetId)', () => {
    let mockStore: Record<string, string> = {};

    beforeEach(() => {
        mockStore = {};
        vi.stubGlobal('localStorage', {
            getItem: (key: string) => mockStore[key] || null,
            setItem: (key: string, value: string) => { mockStore[key] = value.toString(); },
            removeItem: (key: string) => { delete mockStore[key]; },
            clear: () => { mockStore = {}; },
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('restores activeAssetId from localStorage if present upon initialization', () => {
        mockStore['risk_active_asset_id'] = 'WDO';
        
        const testStore = new RiskStore();
        expect(testStore.activeAssetId).toBe('WDO');
    });

    it('updates localStorage when activeAssetId changes', () => {
        const testStore = new RiskStore();
        testStore.activeAssetId = 'WIN';
        expect(mockStore['risk_active_asset_id']).toBe('WIN');
    });
});
