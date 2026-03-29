/**
 * TESTES: Risk Settings Store
 * 
 * Cobre o bug crítico: dados dos Gerenciadores sumiam porque os comandos Tauri
 * `get_asset_risk_profiles`, `save_asset_risk_profile` e `delete_asset_risk_profile`
 * não existiam no backend (commands.rs), causando falhas silenciosas no safeInvoke.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock do safeInvoke para simular o backend Tauri ---
const mockDb: Record<string, Record<string, any>> = {
    risk_profile: {},
    asset_risk_profile: {},
    growth_plan: {},
};

vi.mock('$lib/services/tauri', () => ({
    safeInvoke: vi.fn(async (command: string, args?: any) => {
        switch (command) {
            case 'get_risk_profiles':
                return Object.values(mockDb.risk_profile);
            case 'save_risk_profile': {
                const p = args?.profile;
                if (!p?.id) throw new Error('save_risk_profile: profile.id is required');
                const key = (p.id as string).split(':').pop() || p.id;
                mockDb.risk_profile[key] = p;
                return null;
            }
            case 'delete_risk_profile': {
                const key = (args?.id as string)?.split(':').pop() || args?.id;
                delete mockDb.risk_profile[key];
                return null;
            }
            // Asset Risk Profiles - eram AUSENTES no backend antes do fix
            case 'get_asset_risk_profiles':
                return Object.values(mockDb.asset_risk_profile);
            case 'save_asset_risk_profile': {
                const p = args?.profile;
                if (!p?.id) throw new Error('save_asset_risk_profile: profile.id is required');
                const key = (p.id as string).split(':').pop() || p.id;
                mockDb.asset_risk_profile[key] = p;
                return null;
            }
            case 'delete_asset_risk_profile': {
                const key = (args?.id as string)?.split(':').pop() || args?.id;
                delete mockDb.asset_risk_profile[key];
                return null;
            }
            case 'get_growth_plans':
                return Object.values(mockDb.growth_plan);
            case 'save_growth_plan': {
                const p = args?.plan;
                if (!p?.id) throw new Error('save_growth_plan: plan.id is required');
                const key = (p.id as string).split(':').pop() || p.id;
                mockDb.growth_plan[key] = p;
                return null;
            }
            case 'delete_growth_plan': {
                const key = (args?.id as string)?.split(':').pop() || args?.id;
                delete mockDb.growth_plan[key];
                return null;
            }
            default:
                return null;
        }
    }),
}));

vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('./assets.svelte', () => ({ assetsStore: { assets: [] } }));

import { RiskSettingsStore } from '../risk-settings.svelte';

function makeMockRiskProfile(overrides: Record<string, any> = {}) {
    return {
        id: `risk_profile:rp_${Date.now()}`,
        name: 'Test Profile',
        max_daily_loss: 500, daily_target: 1000, max_risk_per_trade_percent: 1.0,
        max_trades_per_day: 5, min_risk_reward: 2.0, lock_on_loss: true,
        account_type_applicability: 'All', account_ids: [],
        target_type: 'Financial', capital_source: 'Fixed', fixed_capital: 10000,
        active: true, ...overrides,
    };
}

function makeMockAssetRiskProfile(overrides: Record<string, any> = {}) {
    return {
        id: `asset_risk_profile:arp_${Date.now()}`,
        name: 'WIN Scope', asset_id: 'asset:win', asset_ids: ['asset:win'],
        default_stop_points: 150, min_contracts: 1, max_contracts: 5,
        ...overrides,
    };
}

function makeMockGrowthPlan(overrides: Record<string, any> = {}) {
    return {
        id: `growth_plan:gp_${Date.now()}`,
        name: 'Plano Institucional', enabled: true, current_phase_index: 0,
        currentPhaseStartedAt: new Date().toISOString(),
        phases: [{ name: 'Iniciante', lot_size: 1, conditionsToAdvance: [], conditionsToDemote: [] }],
        ...overrides,
    };
}

// ============================================================
describe('RiskSettingsStore - Risk Profiles', () => {
    let store: RiskSettingsStore;
    beforeEach(() => {
        store = new RiskSettingsStore();
        Object.keys(mockDb).forEach(k => (mockDb[k] = {}));
    });

    it('deve carregar perfis do backend', async () => {
        mockDb.risk_profile['rp1'] = makeMockRiskProfile({ id: 'risk_profile:rp1' });
        await store.loadData();
        expect(store.riskProfiles).toHaveLength(1);
    });

    it('deve salvar perfil no backend', async () => {
        const p = makeMockRiskProfile({ id: 'risk_profile:save_test' });
        store.riskProfiles = [p as any];
        await store.saveRiskProfiles();
        expect(Object.values(mockDb.risk_profile)).toHaveLength(1);
    });

    it('deve deletar perfil', async () => {
        mockDb.risk_profile['del1'] = makeMockRiskProfile({ id: 'risk_profile:del1' });
        await store.loadData();
        await store.deleteRiskProfile('risk_profile:del1');
        expect(store.riskProfiles).toHaveLength(0);
        expect(mockDb.risk_profile['del1']).toBeUndefined();
    });

    it('updateRiskProfile deve persistir a mudança', async () => {
        mockDb.risk_profile['upd1'] = makeMockRiskProfile({ id: 'risk_profile:upd1', active: true });
        await store.loadData();
        store.updateRiskProfile('risk_profile:upd1', { name: 'Nome Novo' });
        await vi.waitFor(() => expect(mockDb.risk_profile['upd1']?.name).toBe('Nome Novo'));
        expect(store.activeProfile?.name).toBe('Nome Novo');
    });
});

// ============================================================
describe('RiskSettingsStore - Asset Risk Profiles (BUG FIX: comandos ausentes)', () => {
    let store: RiskSettingsStore;
    beforeEach(() => {
        store = new RiskSettingsStore();
        Object.keys(mockDb).forEach(k => (mockDb[k] = {}));
    });

    it('[BUG] deve salvar asset risk profile no banco (não sumir)', async () => {
        const p = makeMockAssetRiskProfile({ id: 'asset_risk_profile:win1' });
        store.assetRiskProfiles = [p as any];
        await store.saveAssetRiskProfiles();
        const saved = Object.values(mockDb.asset_risk_profile);
        expect(saved).toHaveLength(1);
        expect((saved[0] as any).name).toBe('WIN Scope');
    });

    it('[BUG] deve carregar asset risk profiles após salvar', async () => {
        mockDb.asset_risk_profile['win1'] = makeMockAssetRiskProfile({ id: 'asset_risk_profile:win1' });
        await store.loadData();
        expect(store.assetRiskProfiles).toHaveLength(1);
    });

    it('addAssetRiskProfile deve persistir', async () => {
        const p = makeMockAssetRiskProfile();
        delete (p as any).id;
        store.addAssetRiskProfile(p as any);
        await vi.waitFor(() => expect(Object.values(mockDb.asset_risk_profile).length).toBeGreaterThan(0));
        expect(store.assetRiskProfiles).toHaveLength(1);
    });

    it('deve deletar asset risk profile', async () => {
        mockDb.asset_risk_profile['del_arp'] = makeMockAssetRiskProfile({ id: 'asset_risk_profile:del_arp' });
        await store.loadData();
        await store.deleteAssetRiskProfile('asset_risk_profile:del_arp');
        expect(store.assetRiskProfiles).toHaveLength(0);
        expect(mockDb.asset_risk_profile['del_arp']).toBeUndefined();
    });

    it('getScopeForAsset deve encontrar escopo correto', async () => {
        mockDb.asset_risk_profile['scope1'] = makeMockAssetRiskProfile({ id: 'asset_risk_profile:scope1', asset_ids: ['asset:win'] });
        await store.loadData();
        expect(store.getScopeForAsset('asset:win')?.name).toBe('WIN Scope');
        expect(store.getScopeForAsset('asset:wdo')).toBeUndefined();
    });
});

// ============================================================
describe('RiskSettingsStore - Growth Plans', () => {
    let store: RiskSettingsStore;
    beforeEach(() => {
        store = new RiskSettingsStore();
        Object.keys(mockDb).forEach(k => (mockDb[k] = {}));
    });

    it('deve carregar planos do backend', async () => {
        mockDb.growth_plan['gp1'] = makeMockGrowthPlan({ id: 'growth_plan:gp1' });
        await store.loadData();
        expect(store.growthPlans).toHaveLength(1);
    });

    it('deve salvar plano', async () => {
        const plan = makeMockGrowthPlan({ id: 'growth_plan:save_gp' });
        store.growthPlans = [plan as any];
        await store.saveGrowthPlans();
        expect(Object.values(mockDb.growth_plan)).toHaveLength(1);
    });

    it('não deve ultrapassar número de fases no current_phase_index', async () => {
        mockDb.growth_plan['phase_clamp'] = makeMockGrowthPlan({ id: 'growth_plan:phase_clamp' });
        await store.loadData();
        store.updateGrowthPlan('growth_plan:phase_clamp', { current_phase_index: 99 });
        // Plano tem 1 fase (índice 0), deve ser clampado para 0
        expect(store.growthPlans[0].current_phase_index).toBe(0);
    });

    it('deve deletar plano', async () => {
        mockDb.growth_plan['del_gp'] = makeMockGrowthPlan({ id: 'growth_plan:del_gp' });
        await store.loadData();
        await store.deleteGrowthPlan('growth_plan:del_gp');
        expect(store.growthPlans).toHaveLength(0);
    });

    it('getGrowthPlanForProfile deve retornar plano vinculado', async () => {
        mockDb.growth_plan['linked_gp'] = makeMockGrowthPlan({ id: 'growth_plan:linked_gp' });
        mockDb.risk_profile['rp_linked'] = makeMockRiskProfile({ id: 'risk_profile:rp_linked', growth_plan_id: 'growth_plan:linked_gp' });
        await store.loadData();
        expect(store.getGrowthPlanForProfile('risk_profile:rp_linked')?.name).toBe('Plano Institucional');
    });
});

// ============================================================
describe('RiskSettingsStore - Persistência End-to-End', () => {
    let store: RiskSettingsStore;
    beforeEach(() => {
        store = new RiskSettingsStore();
        Object.keys(mockDb).forEach(k => (mockDb[k] = {}));
    });

    it('[E2E] dados sobrevivem a reload: criar → recarregar → iguais', async () => {
        const arp = makeMockAssetRiskProfile({ id: 'asset_risk_profile:survive' });
        store.assetRiskProfiles = [arp as any];
        await store.saveAssetRiskProfiles();

        const store2 = new RiskSettingsStore();
        await store2.loadData();

        expect(store2.assetRiskProfiles).toHaveLength(1);
        expect(store2.assetRiskProfiles[0].id).toBe('asset_risk_profile:survive');
    });

    it('[E2E] todos os tipos persistem juntos', async () => {
        store.riskProfiles = [makeMockRiskProfile({ id: 'risk_profile:stress' }) as any];
        store.assetRiskProfiles = [makeMockAssetRiskProfile({ id: 'asset_risk_profile:stress' }) as any];
        store.growthPlans = [makeMockGrowthPlan({ id: 'growth_plan:stress' }) as any];

        await Promise.all([store.saveRiskProfiles(), store.saveAssetRiskProfiles(), store.saveGrowthPlans()]);

        const store2 = new RiskSettingsStore();
        await store2.loadData();

        expect(store2.riskProfiles).toHaveLength(1);
        expect(store2.assetRiskProfiles).toHaveLength(1);
        expect(store2.growthPlans).toHaveLength(1);
    });
});
