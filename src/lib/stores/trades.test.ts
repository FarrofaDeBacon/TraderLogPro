import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Mock dependency stores that tradesStore uses or that use tradesStore
// Use the EXACT SAME path that is used in trades.svelte.ts: "$lib/stores/app.svelte"
vi.mock('$lib/stores/app.svelte', () => ({
    appStore: {
        loadData: vi.fn().mockResolvedValue(true),
        loadCashTransactions: vi.fn()
    }
}));

vi.mock('$lib/services/tauri', () => ({
    safeInvoke: vi.fn()
}));

// Mock @tauri-apps/api/core if needed
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn().mockResolvedValue(true)
}));

// Now import tradesStore (it will use the mocks)
import { tradesStore } from './trades.svelte';

describe('TradesStore Unit Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        tradesStore.trades = [];
    });

    it('should calculate daily results correctly for a specific account', () => {
        const mockAccounts = [
            { id: 'acc1', nickname: 'Real Account', currency: 'BRL', balance: 0 }
        ];

        tradesStore.trades = [
            {
                id: 't1',
                account_id: 'acc1',
                result: 150.0,
                date: '2024-03-02T10:00:00Z',
                exit_date: '2024-03-02T10:30:00Z',
                exit_price: 15.0
            },
            {
                id: 't2',
                account_id: 'acc1',
                result: -50.0,
                date: '2024-03-02T11:00:00Z',
                exit_date: '2024-03-02T11:30:00Z',
                exit_price: 14.5
            }
        ] as any;

        const results = tradesStore.getDailyResultByAccount('2024-03-02', mockAccounts as any);
        expect(results[0].result).toBe(100.0);
        expect(results[0].trades_count).toBe(2);
    });

    it('should count closed trades for a specific date', () => {
        tradesStore.trades = [
            { id: 't1', exit_price: 10, result: 0, date: '2024-03-02' },
            { id: 't4', exit_price: null, result: 0, date: '2024-03-02' } // Open
        ] as any;

        expect(tradesStore.getTradesCountForDate('2024-03-02')).toBe(1);
    });

    it('should calculate strategy stats correctly', () => {
        const mockAccounts = [{ id: 'acc1', currency: 'BRL' }] as any;
        const mockProfile = { main_currency: 'BRL' } as any;

        tradesStore.trades = [
            { strategy_id: 's1', account_id: 'acc1', result: 100 },
            { strategy_id: 's1', account_id: 'acc1', result: -50 }
        ] as any;

        const stats = tradesStore.getStrategyStats('s1', mockAccounts, [], mockProfile);
        expect(stats.total_trades).toBe(2);
        expect(stats.total_profit).toBe(50);
    });
});
