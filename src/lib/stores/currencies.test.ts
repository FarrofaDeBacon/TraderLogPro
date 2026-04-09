import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CurrenciesStore } from './currencies.svelte';
import { invoke } from '@tauri-apps/api/core';

// Mock Tauri service
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn().mockResolvedValue(true)
}));

describe('CurrenciesStore', () => {
    let store: CurrenciesStore;

    beforeEach(() => {
        store = new CurrenciesStore();
        vi.clearAllMocks();
    });

    it('should add a currency', () => {
        store.addCurrency({ code: 'BRL', symbol: 'R$', name: 'Real' } as any);
        expect(store.currencies.length).toBe(1);
        expect(store.currencies[0].code).toBe('BRL');
    });

    it('should delete a currency', async () => {
        store.currencies = [{ id: '1', code: 'USD' } as any];
        const result = await store.deleteCurrency('1');
        expect(result.success).toBe(true);
        expect(store.currencies.length).toBe(0);
    });

    it('should block deletion if currency is used by an account', async () => {
        const targetId = 'cur:BRL';
        store.currencies = [{ id: targetId, code: 'BRL' } as any];
        
        // Mock accountsStore
        const { accountsStore } = await import('./accounts.svelte');
        accountsStore.accounts = [{ id: 'acc:1', currency_id: targetId }] as any;

        const result = await store.deleteCurrency(targetId);
        expect(result.success).toBe(false);
        expect(result.error).toContain('used by one or more accounts');
        expect(store.currencies.length).toBe(1);
    });
});
