import { describe, it, expect, vi, beforeEach } from 'vitest';
import { currenciesStore } from './currencies.svelte';
import { setupTauriMock, mockCurrencies } from './test-fixtures';

// Setup basic Tauri Mocks
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

describe('CurrenciesStore Unit Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        currenciesStore.clearCurrencies();
        currenciesStore.currencies = [...mockCurrencies]; // Inject initial state
    });

    it('should read the initial list correctly', () => {
        expect(currenciesStore.currencies.length).toBe(2);
        expect(currenciesStore.currencies[0].code).toBe('USD');
        expect(currenciesStore.currencies[1].code).toBe('BRL');
    });


    it('should update an existing currency and trigger save routines', () => {
        currenciesStore.updateCurrency('currency:BRL', { name: 'Real Brasileiro' });
        
        const updated = currenciesStore.currencies.find(c => c.id === 'currency:BRL');
        expect(updated?.name).toBe('Real Brasileiro');
        expect(updated?.symbol).toBe('R$'); // Untouched values
    });

    it('should delete an currency gracefully when unobstructed', async () => {
        const result = await currenciesStore.deleteCurrency('currency:USD');
        
        expect(result.success).toBe(true);
        expect(currenciesStore.currencies.length).toBe(1);
        expect(currenciesStore.currencies.find(c => c.id === 'currency:USD')).toBeUndefined();
    });

    it('should clear all currencies from state memory', () => {
        currenciesStore.clearCurrencies();
        expect(currenciesStore.currencies.length).toBe(0);
    });
});
