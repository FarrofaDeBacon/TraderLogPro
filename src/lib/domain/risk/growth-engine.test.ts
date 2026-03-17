import { describe, it, expect } from 'vitest';
import { 
    calculateWinRate, 
    calculateProfitFactor, 
    calculateExpectancyR,
    evaluateGrowthPhase
} from './growth-engine';
import type { GrowthPhase, TradeRiskSnapshot } from './types';

describe('growth-engine metrics', () => {
    const today = new Date().toISOString();

    const makeTrade = (isWin: boolean, pnl: number, resultR: number): TradeRiskSnapshot => ({
        tradeId: Math.random().toString(),
        date: today,
        pnl,
        pnlPoints: pnl * 2,
        resultR,
        isWin,
        isLoss: !isWin,
        contracts: 1
    });

    it('deve calcular win rate corretamente', () => {
        const trades = [
            makeTrade(true, 100, 1),
            makeTrade(false, -50, -1),
            makeTrade(true, 100, 1),
            makeTrade(false, -50, -1),
        ]; // 50%
        expect(calculateWinRate(trades)).toBe(50);
        expect(calculateWinRate([])).toBe(0);
    });

    it('deve calcular profit factor corretamente', () => {
        const trades = [
            makeTrade(true, 150, 1),
            makeTrade(false, -50, -1),
        ]; // Gross profit = 150, Gross Loss = 50 => PF = 3
        expect(calculateProfitFactor(trades)).toBe(3);

        const onlyWins = [makeTrade(true, 100, 1)];
        expect(calculateProfitFactor(onlyWins)).toBe(999); // Tratamento de divisão por zero
    });

    it('deve calcular expectancyR corretamente', () => {
        const trades = [
            makeTrade(true, 100, 2),
            makeTrade(false, -50, -1),
        ]; // sum R = 1, length = 2 => 0.5
        expect(calculateExpectancyR(trades)).toBe(0.5);
    });
});

describe('growth-engine evaluateGrowthPhase', () => {
    const today = new Date().toISOString();
    const makeTrade = (isWin: boolean, pnl: number, resultR: number): TradeRiskSnapshot => ({
        tradeId: Math.random().toString(),
        date: today,
        pnl,
        pnlPoints: pnl * 2,
        resultR,
        isWin,
        isLoss: !isWin,
        contracts: 1
    });

    const phase: GrowthPhase = {
        id: '1',
        name: 'Fase 1',
        maxContracts: 2,
        minTrades: 5,
        minWinRate: 40,
        minProfitFactor: 1.5,
        minExpectancyR: 0.5,
        maxDrawdownPercent: 10,
        minNetPnL: 500,
        allowPromotion: true,
        allowRegression: true
    };

    it('deve detectar canPromote quando todos os critérios são atendidos', () => {
        // Criar amostra ideal
        const trades = [
            makeTrade(true, 200, 1),
            makeTrade(true, 200, 1),
            makeTrade(true, 200, 1),
            makeTrade(false, -50, -0.5),
            makeTrade(false, -50, -0.5),
        ]; 
        // trades = 5
        // WR = 60%, PF = 600/100 = 6, R = (3 - 1)/5 = 0.4... wait, R needs to be >= 0.5
        // Let's adjust R: 200 is +1, 200 is +1, 200 is +1. sum = 3. 50 is -0.5, 50 is -0.5. sum = 2. 2 / 5 = 0.4.
        // Let's make R stronger:
        trades[3].resultR = 0; // break even ish
        trades[4].resultR = 0; 
        // sum R = 3 / 5 = 0.6
        // netPnL = 500
        
        const result = evaluateGrowthPhase(phase, trades, 10000);
        expect(result.canPromote).toBe(true);
        expect(result.shouldRegress).toBe(false);
    });

    it('deve detectar shouldRegress quando drawdown excede o limite', () => {
        // Limit é 10%. Vamos perder 1500 num capital de 10000 (15%)
        const trades = [
            makeTrade(false, -1500, -2)
        ];
        
        const result = evaluateGrowthPhase(phase, trades, 10000);
        expect(result.shouldRegress).toBe(true);
        expect(result.canPromote).toBe(false);
        expect(result.reasons.some(r => r.includes('-Drawdown máximo')) || result.reasons.some(r => r.includes('Aviso Crítico: Drawdown'))).toBe(true);
    });
});
