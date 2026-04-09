import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssetsStore } from './assets.svelte';

// Mock Tauri service (safeInvoke)
vi.mock('$lib/services/tauri', () => ({
    safeInvoke: vi.fn().mockResolvedValue(true)
}));

import { safeInvoke } from '$lib/services/tauri';

describe('AssetsStore', () => {
    let store: AssetsStore;

    beforeEach(() => {
        store = new AssetsStore();
        vi.clearAllMocks();
    });

    it('should add an asset', async () => {
        await store.addAsset({ symbol: 'PETR4', name: 'Petrobras', asset_type_id: 'stock' } as any);
        expect(store.assets.length).toBe(1);
        expect(store.assets[0].symbol).toBe('PETR4');
        expect(safeInvoke).toHaveBeenCalledWith('save_asset', expect.any(Object));
    });

    it('should update an asset', () => {
        store.assets = [{ id: '1', symbol: 'VALE3', point_value: 1 } as any];
        store.updateAsset('1', { point_value: 2 });
        expect(store.assets[0].point_value).toBe(2);
    });

    it('should delete an asset', async () => {
        store.assets = [{ id: '1', symbol: 'TO_DELETE' } as any];
        const result = await store.deleteAsset('1', []);
        expect(result.success).toBe(true);
        expect(store.assets.length).toBe(0);
        expect(safeInvoke).toHaveBeenCalledWith('delete_asset', { id: '1' });
    });
});
