import type { GrowthPhase, TradeRiskSnapshot, GrowthEvaluationResult } from './types';

export function calculateWinRate(trades: TradeRiskSnapshot[]): number {
    if (trades.length === 0) return 0;
    const wins = trades.filter(t => t.isWin).length;
    return (wins / trades.length) * 100;
}

export function calculateProfitFactor(trades: TradeRiskSnapshot[]): number {
    const grossProfit = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + Math.abs(t.pnl), 0);
    
    if (grossLoss === 0) return grossProfit > 0 ? 999 : 0; // Se não houver perdas, fator de lucro "ilimitado" (usado 999 para fins práticos)
    return grossProfit / grossLoss;
}

export function calculateExpectancyR(trades: TradeRiskSnapshot[]): number {
    if (trades.length === 0) return 0;
    const totalR = trades.reduce((sum, t) => sum + (t.resultR || 0), 0);
    return totalR / trades.length;
}

export function calculateNetPnL(trades: TradeRiskSnapshot[]): number {
    return trades.reduce((sum, t) => sum + t.pnl, 0);
}

export function calculateDrawdownPercent(trades: TradeRiskSnapshot[], startingCapital: number): number {
    if (startingCapital <= 0 || trades.length === 0) return 0;

    let peak = startingCapital;
    let currentEquity = startingCapital;
    let maxDrawdown = 0;

    // Assumir trades ordenadas cronologicamente
    for (const t of trades) {
        currentEquity += t.pnl;
        if (currentEquity > peak) {
            peak = currentEquity;
        }
        
        const currentDrawdown = peak - currentEquity;
        const currentDrawdownPercent = (currentDrawdown / peak) * 100;
        
        if (currentDrawdownPercent > maxDrawdown) {
            maxDrawdown = currentDrawdownPercent;
        }
    }

    return maxDrawdown;
}

export function evaluateGrowthPhase(
    currentPhase: GrowthPhase,
    trades: TradeRiskSnapshot[],
    startingCapital: number
): GrowthEvaluationResult {
    const metrics = {
        tradeCount: trades.length,
        winRate: calculateWinRate(trades),
        profitFactor: calculateProfitFactor(trades),
        expectancyR: calculateExpectancyR(trades),
        drawdownPercent: calculateDrawdownPercent(trades, startingCapital),
        netPnL: calculateNetPnL(trades)
    };

    let canPromote = false;
    let shouldRegress = false;
    const reasons: string[] = [];

    // Checagem de promoção
    if (currentPhase.allowPromotion) {
        const meetsTradeCount = metrics.tradeCount >= currentPhase.minTrades;
        const meetsWinRate = metrics.winRate >= currentPhase.minWinRate;
        const meetsProfitFactor = metrics.profitFactor >= currentPhase.minProfitFactor;
        const meetsExpectancy = metrics.expectancyR >= currentPhase.minExpectancyR;
        const meetsNetPnL = metrics.netPnL >= currentPhase.minNetPnL;

        if (meetsTradeCount && meetsWinRate && meetsProfitFactor && meetsExpectancy && meetsNetPnL) {
            canPromote = true;
            reasons.push("Todas as métricas de promoção foram atingidas.");
        } else {
            if (!meetsTradeCount) reasons.push(`Mínimo de trades não alcançado: ${metrics.tradeCount}/${currentPhase.minTrades}`);
            if (!meetsWinRate) reasons.push(`Taxa de acerto abaixo da meta: ${metrics.winRate.toFixed(1)}% / ${currentPhase.minWinRate}%`);
            if (!meetsProfitFactor) reasons.push(`Fator de lucro abaixo da meta: ${metrics.profitFactor.toFixed(2)} / ${currentPhase.minProfitFactor}`);
            if (!meetsExpectancy) reasons.push(`Expectativa (R) abaixo da meta: ${metrics.expectancyR.toFixed(2)} / ${currentPhase.minExpectancyR}`);
            if (!meetsNetPnL) reasons.push(`Lucratividade líquida insuficiente: ${metrics.netPnL.toFixed(2)} / ${currentPhase.minNetPnL}`);
        }
    } else {
        reasons.push("Promoção desabilitada para esta fase.");
    }

    // Checagem de regressão - Se passou nos critérios de regressão, anula a promoção.
    if (currentPhase.allowRegression) {
        const maxDrawdownExceeded = metrics.drawdownPercent > currentPhase.maxDrawdownPercent;
        const negativeExpectancy = metrics.expectancyR < 0 && metrics.tradeCount > 5; // Margem de safety pra early trades

        if (maxDrawdownExceeded) {
            shouldRegress = true;
            canPromote = false;
            reasons.push(`Aviso Crítico: Drawdown máximo atingido (${metrics.drawdownPercent.toFixed(1)}% > ${currentPhase.maxDrawdownPercent}%)`);
        }
        if (negativeExpectancy) {
            shouldRegress = true;
            canPromote = false;
            reasons.push(`Aviso Crítico: Expectativa matemática negativa detectada (${metrics.expectancyR.toFixed(2)}R)`);
        }
    }

    return {
        currentPhaseId: currentPhase.id,
        canPromote,
        shouldRegress,
        reasons,
        metrics
    };
}
