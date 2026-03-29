import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RiskSettingsStore } from './risk-settings.svelte';
import type { RiskScopeProfile } from '$lib/types';

// Mock do Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn().mockResolvedValue({})
}));

// Mock do Sonner Toast
vi.mock('svelte-sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn()
    }
}));

describe('RiskScope Architecture - Phase 1', () => {
    let store: RiskSettingsStore;

    beforeEach(() => {
        vi.clearAllMocks();
        store = new RiskSettingsStore();
    });

    it('deve migrar perfil legado (asset_id) para novo modelo (asset_ids) de forma idempotente', async () => {
        // Setup com dado "sujo" (legado)
        store.assetRiskProfiles = [
            {
                id: 'scope1',
                name: 'Legado WDO',
                asset_id: 'asset:WDO', // Legado
                asset_ids: [],        // Novo vazio
                default_stop_points: 10,
                min_contracts: 1,
                max_contracts: 5
            } as any
        ];

        await store.migrateAssetScopes();

        expect(store.assetRiskProfiles[0].asset_ids).toContain('asset:WDO');
        expect(store.assetRiskProfiles[0].asset_ids.length).toBe(1);
    });

    it('deve resolver o escopo correto para um ativo pertencente a um grupo', () => {
        const scope: RiskScopeProfile = {
            id: 'scope-futuros',
            name: 'Futuros',
            asset_ids: ['asset:WDO', 'asset:WIN'],
            default_stop_points: 10,
            min_contracts: 1,
            max_contracts: 10
        };
        store.assetRiskProfiles = [scope];

        const resolved = store.getScopeForAsset('asset:WDO');
        expect(resolved?.id).toBe('scope-futuros');
        expect(resolved?.name).toBe('Futuros');
    });

    it('deve retornar undefined (fallback global) para ativo sem escopo definido', () => {
        store.assetRiskProfiles = [{
            id: 'scope-futuros',
            name: 'Futuros',
            asset_ids: ['asset:WDO'],
            default_stop_points: 10,
            min_contracts: 1,
            max_contracts: 10
        }];

        const resolved = store.getScopeForAsset('asset:PETR4');
        expect(resolved).toBeUndefined();
    });

    it('deve impedir que um ativo seja adicionado a dois escopos ao mesmo tempo (Regra de Integridade)', async () => {
        const scope1: RiskScopeProfile = {
            id: 's1',
            name: 'Grupo A',
            asset_ids: ['asset:WDO'],
            default_stop_points: 10,
            min_contracts: 1,
            max_contracts: 10
        };
        store.assetRiskProfiles = [scope1];

        // Tentar atualizar um segundo escopo para conter o mesmo ativo
        store.assetRiskProfiles.push({
            id: 's2',
            name: 'Grupo B',
            asset_ids: [],
            default_stop_points: 10,
            min_contracts: 1,
            max_contracts: 10
        });

        store.updateAssetRiskProfile('s2', { asset_ids: ['asset:WDO'] });

        // O s2 não deve ter sido atualizado
        const s2 = store.assetRiskProfiles.find(p => p.id === 's2');
        expect(s2?.asset_ids).toEqual([]);
        
        // Verifica se o erro foi exibido (toast mockado no topo)
        const { toast } = await import('svelte-sonner');
        expect(toast.error).toHaveBeenCalled();
    });
});
