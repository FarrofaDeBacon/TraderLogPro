import { describe, it, expect } from 'vitest';
import { evaluateDiscipline } from './discipline-engine';
import type { RiskProfileConfig, TradeRiskSnapshot } from './types';

describe('discipline-engine', () => {
    const today = new Date().toISOString().substring(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().substring(0, 10);

    const baseProfile: RiskProfileConfig = {
        id: '1',
        name: 'Profile',
        isActive: true,
        capitalSourceType: 'fixed',
        dailyTargetType: 'currency',
        dailyTargetValue: 100,
        maxDailyLossType: 'currency',
        maxDailyLossValue: 50,
        maxTradesPerDay: 3,
        emotionalCouplingEnabled: true,
        emotionalLookbackTrades: 5,
        emotionalPenaltyThreshold: 30
    };

    const makeTrade = (date: string, violated: boolean = false, isLoss: boolean = false, emotionalState: string = ''): TradeRiskSnapshot => ({
        tradeId: Math.random().toString(),
        date,
        pnl: isLoss ? -10 : 10,
        pnlPoints: isLoss ? -20 : 20,
        resultR: isLoss ? -1 : 1,
        isWin: !isLoss,
        isLoss,
        contracts: 1,
        violatedPlan: violated,
        emotionalState
    });

    it('deve detectar overtrading', () => {
        // max trades = 3
        const trades = [
            makeTrade(today),
            makeTrade(today),
            makeTrade(today),
            makeTrade(today), // 4ª operação do dia excede (max = 3)
        ];
        const result = evaluateDiscipline(baseProfile, trades);
        
        expect(result.overtradingDetected).toBe(true);
        expect(result.score).toBeLessThan(100);
        expect(result.violations.some(v => v.includes('Overtrading'))).toBe(true);
    });

    it('deve reduzir score por violatedPlan', () => {
        const trades = [
            makeTrade(yesterday, true), // trade de ontem que violou o plano
            makeTrade(yesterday, true)
        ];
        // max trades de hoje não foi tocado
        const result = evaluateDiscipline(baseProfile, trades);
        
        expect(result.score).toBe(80); // 100 - (2 * 10)
        expect(result.violations.some(v => v.includes('violaram o plano'))).toBe(true);
    });

    it('deve detectar emotionalRiskDetected quando aplicável', () => {
        const trades = [
            makeTrade(today, false, true, 'tilt'),
            makeTrade(today, false, true, 'revenge')
        ];
        // 2 perdas consecutivas associadas a emoções negativas
        const result = evaluateDiscipline(baseProfile, trades);
        
        expect(result.emotionalRiskDetected).toBe(true);
        expect(result.score).toBe(70); // 100 - 30
        expect(result.warnings.some(w => w.includes('Risco emocional alto'))).toBe(true);
    });
});
