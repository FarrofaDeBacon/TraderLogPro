import { describe, it, expect } from 'vitest';
import { calculateDailyRiskStatus } from './risk-engine';
import type { RiskProfileConfig, TradeRiskSnapshot } from './types';

describe('risk-engine', () => {
    const baseProfile: RiskProfileConfig = {
        id: '1',
        name: 'Test Profile',
        isActive: true,
        capitalSourceType: 'fixed',
        fixedCapital: 1000,
        dailyTargetType: 'currency',
        dailyTargetValue: 100,
        maxDailyLossType: 'currency',
        maxDailyLossValue: 50,
        lockOnLoss: true
    };

    const today = new Date().toISOString().substring(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().substring(0, 10);

    it('deve retornar NO_TRADES quando não há trades no dia', () => {
        // Sem trades
        const status1 = calculateDailyRiskStatus(baseProfile, []);
        expect(status1.statusLabel).toBe('NO_TRADES');

        // Apenas trade de ontem
        const pastTrade: TradeRiskSnapshot = {
            tradeId: 't1',
            date: yesterday,
            pnl: 50,
            pnlPoints: 100,
            resultR: 1,
            isWin: true,
            isLoss: false,
            contracts: 1
        };
        const status2 = calculateDailyRiskStatus(baseProfile, [pastTrade]);
        expect(status2.statusLabel).toBe('NO_TRADES');
    });

    it('deve detectar TARGET_HIT corretamente', () => {
        const trade: TradeRiskSnapshot = {
            tradeId: 't1',
            date: today,
            pnl: 100, // Alcançou a meta de 100
            pnlPoints: 200,
            resultR: 2,
            isWin: true,
            isLoss: false,
            contracts: 1
        };
        const status = calculateDailyRiskStatus(baseProfile, [trade]);
        expect(status.statusLabel).toBe('TARGET_HIT');
        expect(status.dailyTargetHit).toBe(true);
    });

    it('deve detectar LOSS_LIMIT_HIT corretamente e não travar se lockOnLoss for false', () => {
        const profileNoLock = { ...baseProfile, lockOnLoss: false };
        const trade: TradeRiskSnapshot = {
            tradeId: 't1',
            date: today,
            pnl: -60, // Passou do limite de perda de -50
            pnlPoints: -100,
            resultR: -1,
            isWin: false,
            isLoss: true,
            contracts: 1
        };
        const status = calculateDailyRiskStatus(profileNoLock, [trade]);
        expect(status.statusLabel).toBe('LOSS_LIMIT_HIT');
        expect(status.dailyLossHit).toBe(true);
        expect(status.isLocked).toBe(false);
    });

    it('deve ativar LOCKED quando lockOnLoss estiver habilitado e perda for atingida', () => {
        const trade: TradeRiskSnapshot = {
            tradeId: 't1',
            date: today,
            pnl: -50, // Exatamente no limite de perda de 50
            pnlPoints: -100,
            resultR: -1,
            isWin: false,
            isLoss: true,
            contracts: 1
        };
        const status = calculateDailyRiskStatus(baseProfile, [trade]);
        // LOCKED tem precedência sobre LOSS_LIMIT_HIT na label
        expect(status.statusLabel).toBe('LOCKED');
        expect(status.dailyLossHit).toBe(true);
        expect(status.isLocked).toBe(true);
    });
});
