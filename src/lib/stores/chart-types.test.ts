import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chartTypesStore } from './chart-types.svelte';
import { setupTauriMock, mockChartTypes } from './test-fixtures';

// Setup basic Tauri Mocks
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

describe('ChartTypesStore Unit Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        chartTypesStore.clearChartTypes();
        chartTypesStore.chartTypes = [...mockChartTypes]; // Inject initial state
    });

    it('should initialize and read the chart types accurately', () => {
        expect(chartTypesStore.chartTypes.length).toBe(2);
        expect(chartTypesStore.chartTypes[0].base_type).toBe('TimeBased');
        expect(chartTypesStore.chartTypes[1].name).toBe('Renko');
    });

    it('should add a newly defined chart type safely', () => {
        chartTypesStore.addChartType({
            name: 'Line',
            base_type: 'TimeBased',
            parameter: ''
        });

        expect(chartTypesStore.chartTypes.length).toBe(3);
        const added = chartTypesStore.chartTypes.find(c => c.base_type === 'TimeBased' && c.name === 'Line');
        expect(added?.name).toBe('Line');
        expect(added?.id).toBeDefined();
    });

    it('should perform partial property updates', () => {
        chartTypesStore.updateChartType('chart:renko', { name: 'Renko Bricks' });
        
        const updated = chartTypesStore.chartTypes.find(c => c.id === 'chart:renko');
        expect(updated?.name).toBe('Renko Bricks');
    });

    it('should execute raw deletion accurately', async () => {
        const result = await chartTypesStore.deleteChartType('chart:candles');
        
        expect(result.success).toBe(true);
        expect(chartTypesStore.chartTypes.length).toBe(1);
    });

    it('should flush all state bindings during cleanup', () => {
        chartTypesStore.clearChartTypes();
        expect(chartTypesStore.chartTypes.length).toBe(0);
    });
});
