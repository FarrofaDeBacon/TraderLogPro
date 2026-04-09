import { describe, it, expect } from 'vitest';
import { 
    calculateGrowthMetrics,
    evaluateGrowthPhase
} from './growth-engine';
import type { GrowthPhase, TradeRiskSnapshot } from './types';

describe('Domain: Growth Engine - Métricas Isoladas', () => {
    const today = '2026-03-27T10:00:00Z';

    const createTestTrade = (pnl: number, date: string = today): TradeRiskSnapshot => {
        return {
            tradeId: Math.random().toString(),
            date,
            pnl,
            pnlPoints: pnl * 2,
            resultR: pnl > 0 ? 1 : -1,
            isWin: pnl > 0,
            isLoss: pnl < 0,
            contracts: 1
        };
    };

    it('deve calcular métricas básicas corretamente', () => {
        const trades = [
            createTestTrade(100),
            createTestTrade(-50),
            createTestTrade(100),
            createTestTrade(-50),
        ]; 
        
        const metrics = calculateGrowthMetrics(trades, 1000);
        expect(metrics.winRate).toBe(50);
        expect(metrics.profitFactor).toBe(2); // 200 / 100
        expect(metrics.netPnL).toBe(100);
    });

    it('deve calcular loss streak baseada em PnL DIÁRIO (Regra Crítica)', () => {
        const trades = [
            // Dia 1: Loss
            createTestTrade(-100, '2026-03-01T10:00:00Z'),
            // Dia 2: Loss (Vários trades totalizando negativo)
            createTestTrade(-50, '2026-03-02T10:00:00Z'),
            createTestTrade(-20, '2026-03-02T15:00:00Z'),
            // Dia 3: Neutro (Reset)
            createTestTrade(-50, '2026-03-03T10:00:00Z'),
            createTestTrade(50, '2026-03-03T15:00:00Z'), // Net PnL = 0 -> Reset Streak
            // Dia 4: Loss
            createTestTrade(-10, '2026-03-04T10:00:00Z'),
        ];
        
        const metrics = calculateGrowthMetrics(trades, 1000);
        // Streak máx deve ser 2 (dias 1 e 2). O dia 3 resetou a sequência.
        expect(metrics.consecutiveLossDays).toBe(2);
    });

    it('deve resetar loss streak com dia positivo (Regra do Usuário)', () => {
        const trades = [
            createTestTrade(-100, '2026-03-01T10:00:00Z'),
            createTestTrade(-100, '2026-03-02T10:00:00Z'),
            createTestTrade(10, '2026-03-03T10:00:00Z'), // Reset
            createTestTrade(-100, '2026-03-04T10:00:00Z'),
        ];
        
        const metrics = calculateGrowthMetrics(trades, 1000);
        expect(metrics.consecutiveLossDays).toBe(2);
    });
});

describe('Domain: Growth Engine - evaluateGrowthPhase (Genérico)', () => {
    const today = '2026-03-27T10:00:00Z';
    
    const createTestTrade = (pnl: number, date: string = today): TradeRiskSnapshot => {
        return {
            tradeId: Math.random().toString(),
            date,
            pnl,
            pnlPoints: pnl * 2,
            resultR: pnl > 0 ? 1 : -1,
            isWin: pnl > 0,
            isLoss: pnl < 0,
            contracts: 1
        };
    };

    const targetPhase: GrowthPhase = {
        id: '1',
        name: 'Fase 1',
        maxContracts: 2,
        minTrades: 0,
        minWinRate: 0,
        minProfitFactor: 0,
        minExpectancyR: 0,
        minNetPnL: 0,
        maxDrawdownPercent: 10,
        allowPromotion: true,
        allowRegression: true,
        conditionsToAdvance: [
            { metric: 'profit_target', operator: '>=', value: 500 },
            { metric: 'trade_count', operator: '>=', value: 5 }
        ],
        conditionsToDemote: [
            { metric: 'loss_streak', operator: '>=', value: 3 }
        ]
    };

    it('deve autorizar canPromote = true quando condições genéricas são atendidas (com aliases)', () => {
        const trades = Array(5).fill(0).map(() => createTestTrade(100));
        
        // Testando com nomes em Português (como aparecem na UI)
        const phaseWithAliases: GrowthPhase = {
            ...targetPhase,
            conditionsToAdvance: [
                { metric: 'Meta de Lucro', operator: '>=', value: 500 },
                { metric: 'Dias de Negociação', operator: '>=', value: 5 }
            ]
        };

        const result = evaluateGrowthPhase(phaseWithAliases, trades, 10000, 0, 2);
        expect(result.canPromote).toBe(true);
    });

    it('deve reconhecer "Sessões Positivas" corretamente via alias', () => {
        const trades = [
            createTestTrade(100, '2026-03-01T10:00:00Z'),
            createTestTrade(100, '2026-03-02T10:00:00Z'),
        ];
        
        const phase: GrowthPhase = {
            ...targetPhase,
            conditionsToAdvance: [
                { metric: 'Sessões Positivas', operator: '>=', value: 2 }
            ]
        };

        const result = evaluateGrowthPhase(phase, trades, 10000, 0, 2);
        expect(result.advanceConditions[0].current).toBe(2);
        expect(result.advanceConditions[0].isMet).toBe(true);
    });
 
    it('deve autorizar canPromote = true quando condições genéricas são atendidas', () => {
        const trades = Array(5).fill(0).map(() => createTestTrade(100));
        const result = evaluateGrowthPhase(targetPhase, trades, 10000, 0, 2);
        
        expect(result.canPromote).toBe(true);
        expect(result.metrics.netPnL).toBe(500);
    });

    it('deve disparar shouldRegress = true quando condição de loss streak é atingida', () => {
        const trades = [
            createTestTrade(-100, '2026-03-01T10:00:00Z'),
            createTestTrade(-100, '2026-03-02T10:00:00Z'),
            createTestTrade(-100, '2026-03-03T10:00:00Z'),
        ];
        
        const result = evaluateGrowthPhase(targetPhase, trades, 10000, 1, 3);
        expect(result.shouldRegress).toBe(true);
        expect(result.regressionReasonKey).toContain('loss_streak');
    });

    it('não deve regredir se a streak foi interrompida por dia positivo', () => {
        const trades = [
            createTestTrade(-100, '2026-03-01T10:00:00Z'),
            createTestTrade(-100, '2026-03-02T10:00:00Z'),
            createTestTrade(10, '2026-03-03T10:00:00Z'), // Win breaks streak
            createTestTrade(-100, '2026-03-04T10:00:00Z'),
        ];
        
        const result = evaluateGrowthPhase(targetPhase, trades, 10000, 1, 3);
        expect(result.shouldRegress).toBe(false);
        expect(result.metrics.consecutiveLossDays).toBe(2);
    });
});
