import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccountsStore } from './accounts.svelte';

// Mock Tauri service (Backend commands)
vi.mock('$lib/services/tauri', () => ({
    safeInvoke: vi.fn().mockResolvedValue(true)
}));

import { safeInvoke } from '$lib/services/tauri';

describe('AccountsStore', () => {
    let store: AccountsStore;

    beforeEach(() => {
        store = new AccountsStore();
        vi.clearAllMocks();
    });

    it('should add an account', () => {
        store.addAccount({ nickname: 'Test Acc', balance: 1000, currency_id: '1' } as any);
        expect(store.accounts.length).toBe(1);
        expect(store.accounts[0].nickname).toBe('Test Acc');
        expect(safeInvoke).toHaveBeenCalledWith('save_account', expect.any(Object));
    });

    it('should update an account', () => {
        store.accounts = [{ id: '1', nickname: 'Acc 1', balance: 100 } as any];
        store.updateAccount('1', { balance: 200 });
        expect(store.accounts[0].balance).toBe(200);
    });

    it('should delete an account', async () => {
        store.accounts = [{ id: '1', nickname: 'To Delete' } as any];
        const result = await store.deleteAccount('1');
        expect(result.success).toBe(true);
        expect(store.accounts.length).toBe(0);
        expect(safeInvoke).toHaveBeenCalledWith('delete_account', { id: '1' });
    });

    it('should deduplicate accounts by nickname', async () => {
        store.accounts = [
            { id: '1', nickname: 'Dailly', balance: 10 } as any,
            { id: '2', nickname: 'Dailly', balance: 20 } as any,
            { id: '3', nickname: 'Other', balance: 30 } as any
        ];
        
        await store.deduplicateAccounts();
        expect(store.accounts.length).toBe(2);
        expect(store.accounts.map(a => a.nickname)).toContain('Dailly');
        expect(store.accounts.map(a => a.nickname)).toContain('Other');
    });
});
