import { describe, it, expect } from 'vitest';
import { getLiveIntervention } from './insights-engine';

describe('Live Behavioral Feedback Engine', () => {
    const mockConverter = (t: any) => t.result;
    const baseDate = new Date('2026-03-20T12:00:00Z');

    it('returns null if there are no trades today', () => {
        expect(getLiveIntervention([], baseDate, mockConverter)).toBeNull();
    });

    it('returns warning on 2 consecutive losses', () => {
        const trades = [
            { date: '2026-03-20T10:00:00Z', result: -50 },
            { date: '2026-03-20T10:30:00Z', result: -100 }
        ];
        const res = getLiveIntervention(trades, baseDate, mockConverter);
        expect(res?.id).toBe('consecutive_losses_2');
        expect(res?.type).toBe('warning');
    });

    it('returns danger on 3 consecutive losses', () => {
        const trades = [
            { date: '2026-03-20T10:00:00Z', result: -50 },
            { date: '2026-03-20T10:30:00Z', result: -100 },
            { date: '2026-03-20T11:00:00Z', result: -20 }
        ];
        const res = getLiveIntervention(trades, baseDate, mockConverter);
        expect(res?.id).toBe('tilt_imminent');
        expect(res?.type).toBe('danger');
    });

    it('prioritizes danger limit breach over consecutive losses', () => {
        const trades = [
            { date: '2026-03-20T10:00:00Z', result: -400 },
            { date: '2026-03-20T10:30:00Z', result: -450 }
        ];
        const riskCockpitState = { dailyLossLimit: 1000 };
        const res = getLiveIntervention(trades, baseDate, mockConverter, riskCockpitState);
        
        // PnL is -850, Limit is 1000. 850 >= 80% (800) -> breach
        expect(res?.id).toBe('daily_limit_danger');
        expect(res?.type).toBe('danger');
    });

    it('does not trigger limit breach if underneath 80%', () => {
        const trades = [
            { date: '2026-03-20T10:00:00Z', result: -400 },
            { date: '2026-03-20T10:30:00Z', result: -300 }
        ];
        const riskCockpitState = { dailyLossLimit: 1000 };
        const res = getLiveIntervention(trades, baseDate, mockConverter, riskCockpitState);
        
        // PnL is -700. 700 < 800. Will fallback to 2 consecutive losses.
        expect(res?.id).toBe('consecutive_losses_2');
    });
});
