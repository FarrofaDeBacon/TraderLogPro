import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assetTypesStore } from './asset-types.svelte';
import { setupTauriMock, mockAssetTypes } from './test-fixtures';

// Setup basic Tauri Mocks
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

describe('AssetTypesStore Unit Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        assetTypesStore.clearAssetTypes();
        assetTypesStore.assetTypes = [...mockAssetTypes]; // Inject initial state
    });

    it('should read the initial list correctly', () => {
        expect(assetTypesStore.assetTypes.length).toBe(2);
        expect(assetTypesStore.assetTypes[0].code).toBe('STK_BR');
    });

    it('should resolve asset type name by ID natively', () => {
        expect(assetTypesStore.getAssetTypeName('type_stock_br')).toBe('Ações BR');
        expect(assetTypesStore.getAssetTypeName('non_existent')).toBe('N/A');
    });

    it('should add an asset type securely', () => {
        assetTypesStore.addAssetType({
            name: 'Opções BR',
            code: 'OPT_BR',
            market_id: 'market:B3',
            tax_profile_id: 'tax_br_opt'
        } as any);

        expect(assetTypesStore.assetTypes.length).toBe(3);
        const added = assetTypesStore.assetTypes.find(at => at.code === 'OPT_BR');
        expect(added).toBeDefined();
        expect(added?.id).toBeDefined();
    });

    it('should update an existing asset type correctly', () => {
        assetTypesStore.updateAssetType('type_stock_br', { name: 'Ações Nacionais' });
        
        const updated = assetTypesStore.assetTypes.find(at => at.id === 'type_stock_br');
        expect(updated?.name).toBe('Ações Nacionais');
        expect(updated?.code).toBe('STK_BR'); // Untouched
    });

    it('should delete an asset type gracefully', async () => {
        const result = await assetTypesStore.deleteAssetType('type_fut_br');
        
        expect(result.success).toBe(true);
        expect(assetTypesStore.assetTypes.length).toBe(1);
        expect(assetTypesStore.assetTypes.find(at => at.id === 'type_fut_br')).toBeUndefined();
    });

    it('should clear all asset types from state memory', () => {
        assetTypesStore.clearAssetTypes();
        expect(assetTypesStore.assetTypes.length).toBe(0);
    });
});
