import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MarketsStore } from './markets.svelte';

// Mock Tauri service (Backend commands)
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn().mockResolvedValue(true)
}));

import { invoke } from '@tauri-apps/api/core';

describe('MarketsStore', () => {
    let store: MarketsStore;

    beforeEach(() => {
        store = new MarketsStore();
        vi.clearAllMocks();
    });

    it('should add a market', () => {
        store.addMarket({ name: 'B3', timezone: 'America/Sao_Paulo' } as any);
        expect(store.markets.length).toBe(1);
        expect(store.markets[0].name).toBe('B3');
    });

    it('should delete a market', async () => {
        store.markets = [{ id: '1', name: 'NYSE' } as any];
        const result = await store.deleteMarket('1');
        expect(result.success).toBe(true);
        expect(store.markets.length).toBe(0);
        expect(invoke).toHaveBeenCalledWith('delete_market', { id: '1' });
    });

    it('should block deletion if market is used by an asset type', async () => {
        const targetId = 'mkt:B3';
        store.markets = [{ id: targetId, name: 'B3' } as any];

        // Mock assetTypesStore
        const { assetTypesStore } = await import('./asset-types.svelte');
        assetTypesStore.assetTypes = [{ id: 'type:1', market_id: targetId }] as any;

        const result = await store.deleteMarket(targetId);
        expect(result.success).toBe(false);
        expect(result.error).toContain('used by one or more asset types');
        expect(store.markets.length).toBe(1);
    });
});
