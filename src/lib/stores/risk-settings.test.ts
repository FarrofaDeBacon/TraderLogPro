import { describe, it, expect, vi, beforeEach } from 'vitest';
import { riskSettingsStore } from './risk-settings.svelte';
import { setupTauriMock, mockRiskProfiles, mockAssetRiskProfiles } from './test-fixtures';

// Setup basic Tauri Mocks
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

describe('RiskSettingsStore Unit Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        riskSettingsStore.clearRiskSettings();
        riskSettingsStore.riskProfiles = [...mockRiskProfiles];
        riskSettingsStore.assetRiskProfiles = [...mockAssetRiskProfiles];
    });

    it('should initialize and read active risk profiles accurately', () => {
        expect(riskSettingsStore.riskProfiles.length).toBe(1);
        expect(riskSettingsStore.riskProfiles[0].name).toBe('Agressivo B3');
        expect(riskSettingsStore.assetRiskProfiles.length).toBe(1);
    });

    it('should extract active profiles linked to specific accounts', () => {
        const active = riskSettingsStore.riskProfiles.find(p => p.active && p.account_ids?.includes('account:1'));
        expect(active).toBeDefined();
        expect(active?.name).toBe('Agressivo B3');

        const unlinked = riskSettingsStore.riskProfiles.find(p => p.active && p.account_ids?.includes('account:2'));
        expect(unlinked).toBeUndefined();
    });

    it('should extract asset-specific risk metrics inheriting from profiles', () => {
        const activeProfile = riskSettingsStore.riskProfiles.find(p => p.active && p.account_ids?.includes('account:1'));
        const assetRisk = riskSettingsStore.assetRiskProfiles.find(a => a.asset_id === 'asset:WIN' && activeProfile?.linked_asset_risk_profile_ids?.includes(a.id!));
        expect(assetRisk).toBeDefined();
        expect(assetRisk?.min_contracts).toBe(1);
        expect(assetRisk?.default_stop_points).toBe(150);

        // Fallback constraint checks
        const missingProfile = riskSettingsStore.riskProfiles.find(p => p.active && p.account_ids?.includes('account:2'));
        const missingRisk = riskSettingsStore.assetRiskProfiles.find(a => a.asset_id === 'asset:WIN' && missingProfile?.linked_asset_risk_profile_ids?.includes(a.id!));
        expect(missingRisk).toBeUndefined();
    });

    it('should safely add root risk profiles', () => {
        riskSettingsStore.addRiskProfile({
            name: 'Conservador',
            account_ids: [],
            active: false
        } as any);

        expect(riskSettingsStore.riskProfiles.length).toBe(2);
        const added = riskSettingsStore.riskProfiles.find(r => r.name === 'Conservador');
        expect(added?.id).toBeDefined();
    });

    it('should cleanly execute deletion and purge linked arrays', async () => {
        const result = await riskSettingsStore.deleteRiskProfile('risk_profile:1');
        
        expect(result.success).toBe(true);
        expect(riskSettingsStore.riskProfiles.length).toBe(0);
    });

    it('should flush all state bindings during cleanup', () => {
        riskSettingsStore.clearRiskSettings();
        expect(riskSettingsStore.riskProfiles.length).toBe(0);
        expect(riskSettingsStore.assetRiskProfiles.length).toBe(0);
    });
});
