import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assetsStore } from './assets.svelte';
import { mockAssets } from './test-fixtures';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

describe('AssetsStore Unit Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        assetsStore.clearAssets();
        assetsStore.assets = [...mockAssets]; 
    });

    it('should initialize and read the asset objects accurately', () => {
        expect(assetsStore.assets.length).toBe(2);
        expect(assetsStore.assets[0].symbol).toBe('PETR4');
        expect(assetsStore.assets[1].point_value).toBe(0.20);
    });

    it('should perform partial property updates', () => {
        assetsStore.updateAsset('asset:WIN', { point_value: 10 } as any);
        const updated = assetsStore.assets.find(a => a.id === 'asset:WIN');
        expect(updated?.point_value).toBe(10);
    });

    it('should execute raw deletion accurately', async () => {
        const result = await assetsStore.deleteAsset('asset:WIN', []);
        
        expect(result.success).toBe(true);
        expect(assetsStore.assets.length).toBe(1);
    });

    it('should flush all state bindings during cleanup procedures', () => {
        assetsStore.clearAssets();
        expect(assetsStore.assets.length).toBe(0);
    });
});
