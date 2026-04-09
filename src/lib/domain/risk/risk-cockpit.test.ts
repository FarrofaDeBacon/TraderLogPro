import { describe, it, expect } from 'vitest';
import { buildRiskCockpitState } from './risk-cockpit';

import type { 
    RiskProfileConfig, 
    TradeRiskSnapshot, 
    GrowthPhase 
} from './types';

describe('Domain: Risk Cockpit', () => {
    const today = new Date().toISOString().substring(0, 10);

    const baseProfile: RiskProfileConfig = {
        id: '1',
        name: 'Profile',
        isActive: true,
        capitalSourceType: 'fixed',
        dailyTargetType: 'currency',
        dailyTargetValue: 100,
        maxDailyLossType: 'currency',
        maxDailyLossValue: 50,
        maxTradesPerDay: 5,
        emotionalCouplingEnabled: false
    };

    const targetPhase: GrowthPhase = {
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
        allowRegression: true,
        conditionsToAdvance: [],
        conditionsToDemote: []
    };

    const createTestTrade = (pnl: number): TradeRiskSnapshot => {
        return {
            tradeId: Math.random().toString(),
            date: today,
            pnl,
            pnlPoints: pnl * 2,
            resultR: pnl > 0 ? 1 : -1,
            isWin: pnl > 0,
            isLoss: pnl < 0,
            contracts: 1,
            violatedPlan: false,
        };
    };

    it('deve agregar os status financeiros e comportamentais sem motor de growth caso o capital inicial não seja preenchido', () => {
        const trades = [
            createTestTrade(20)
        ];

        const state = buildRiskCockpitState(
            baseProfile, 
            trades
        );

        expect(state.dailyRiskStatus.dailyPnL).toBe(20);
        expect(state.disciplineEvaluation.score).toBe(100);
        expect(state.growthEvaluation).toBeUndefined();
    });

    it('deve agregar todos os três módulos estruturalmente caso a growth phase e o capital estatico sejam supridos', () => {
        const trades = [
            createTestTrade(200), 
            createTestTrade(-50)
        ];

        const startingCapital = 1000;
        
        const state = buildRiskCockpitState(
            baseProfile, 
            trades, 
            targetPhase, 
            startingCapital
        );

        // 200 - 50 = +150 today
        expect(state.dailyRiskStatus.dailyPnL).toBe(150); 
        expect(state.disciplineEvaluation.score).toBe(100); 
        expect(state.growthEvaluation).toBeDefined();
        
        // NetPnL for growth (evaluating 200 - 50 = 150)
        if (state.growthEvaluation) {
            expect(state.growthEvaluation.metrics.netPnL).toBe(150);
            expect(state.growthEvaluation.metrics.profitFactor).toBe(4); // 200 / 50
        }
    });
});
