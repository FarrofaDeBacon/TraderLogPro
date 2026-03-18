import { describe, it, expect, vi, beforeEach } from 'vitest';
import { indicatorsStore } from './indicators.svelte';
import { setupTauriMock, mockIndicators } from './test-fixtures';

// Setup basic Tauri Mocks
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

describe('IndicatorsStore Unit Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        indicatorsStore.clearIndicators();
        indicatorsStore.indicators = [...mockIndicators]; // Inject initial state
    });

    it('should initialize and read the indicators accurately', () => {
        expect(indicatorsStore.indicators.length).toBe(2);
        expect(indicatorsStore.indicators[0].code).toBe('VWAP');
        expect(indicatorsStore.indicators[1].category).toBe('Momentum');
    });

    it('should add a newly defined indicator safely', () => {
        indicatorsStore.addIndicator({
            name: 'Moving Average',
            code: 'MA',
            category: 'Trend'
        });

        expect(indicatorsStore.indicators.length).toBe(3);
        const added = indicatorsStore.indicators.find(i => i.code === 'MA');
        expect(added?.name).toBe('Moving Average');
        expect(added?.id).toBeDefined();
    });

    it('should perform partial property updates', () => {
        indicatorsStore.updateIndicator('ind:rsi', { name: 'Relative Strength Index' });
        
        const updated = indicatorsStore.indicators.find(i => i.id === 'ind:rsi');
        expect(updated?.name).toBe('Relative Strength Index');
    });

    it('should execute core deletion accurately', async () => {
        const result = await indicatorsStore.deleteIndicator('ind:vwap');
        
        expect(result.success).toBe(true);
        expect(indicatorsStore.indicators.length).toBe(1);
    });

    it('should flush all state bindings during cleanup routines', () => {
        indicatorsStore.clearIndicators();
        expect(indicatorsStore.indicators.length).toBe(0);
    });
});
