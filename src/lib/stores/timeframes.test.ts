import { describe, it, expect, vi, beforeEach } from 'vitest';
import { timeframesStore } from './timeframes.svelte';
import { setupTauriMock, mockTimeframes } from './test-fixtures';

// Setup basic Tauri Mocks
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

describe('TimeframesStore Unit Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        timeframesStore.clearTimeframes();
        timeframesStore.timeframes = [...mockTimeframes]; // Inject initial state
    });

    it('should initialize and read the timeframes accurately', () => {
        expect(timeframesStore.timeframes.length).toBe(2);
    });

    it('should add a newly defined timeframe safely', () => {
        timeframesStore.addTimeframe({
            name: '1 Hora',
            value: '1H'
        } as any);

        expect(timeframesStore.timeframes.length).toBe(3);
    });

    it('should execute raw deletion accurately', async () => {
        const result = await timeframesStore.deleteTimeframe('timeframe:m5');
        
        expect(result.success).toBe(true);
        expect(timeframesStore.timeframes.length).toBe(1);
    });

    it('should flush all state bindings during cleanup procedures', () => {
        timeframesStore.clearTimeframes();
        expect(timeframesStore.timeframes.length).toBe(0);
    });
});
