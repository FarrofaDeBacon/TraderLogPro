import type { RiskProfileConfig, TradeRiskSnapshot, DailyRiskStatus } from './types';

export function calculateDailyRiskStatus(profile: RiskProfileConfig, trades: TradeRiskSnapshot[]): DailyRiskStatus {
    const todayStr = new Date().toISOString().substring(0, 10);
    const todayTrades = trades.filter(t => {
        const tDate = typeof t.date === 'string' ? t.date : t.date.toISOString();
        return tDate.substring(0, 10) === todayStr;
    });

    let dailyPnL = 0;
    let dailyPnLPoints = 0;

    for (const t of todayTrades) {
        dailyPnL += t.pnl;
        dailyPnLPoints += t.pnlPoints;
    }

    const isCurrencyLoss = profile.maxDailyLossType === 'currency';
    const isCurrencyTarget = profile.dailyTargetType === 'currency';

    const currentLossMetric = isCurrencyLoss ? dailyPnL : dailyPnLPoints;
    const currentTargetMetric = isCurrencyTarget ? dailyPnL : dailyPnLPoints;

    const dailyLossHit = currentLossMetric <= -profile.maxDailyLossValue;
    const dailyTargetHit = currentTargetMetric >= profile.dailyTargetValue;

    const remainingLossAllowance = isCurrencyLoss 
        ? Math.max(0, profile.maxDailyLossValue + dailyPnL)
        : Math.max(0, profile.maxDailyLossValue + dailyPnLPoints);

    const remainingTargetToHit = isCurrencyTarget
        ? Math.max(0, profile.dailyTargetValue - dailyPnL)
        : Math.max(0, profile.dailyTargetValue - dailyPnLPoints);

    const isLocked = Boolean(profile.lockOnLoss && dailyLossHit);

    let statusLabel = 'NO_TRADES';
    if (todayTrades.length > 0) {
        if (isLocked) statusLabel = 'LOCKED';
        else if (dailyLossHit) statusLabel = 'LOSS_LIMIT_HIT';
        else if (dailyTargetHit) statusLabel = 'TARGET_HIT';
        else statusLabel = 'RUNNING';
    }

    return {
        date: todayStr,
        dailyPnL,
        dailyPnLPoints,
        dailyTargetHit,
        dailyLossHit,
        remainingLossAllowance,
        remainingTargetToHit,
        isLocked,
        statusLabel
    };
}

export function calculateCurrentCapital(profile: RiskProfileConfig, fallbackCapital?: number): number {
    if (profile.capitalSourceType === 'fixed') {
        return profile.fixedCapital ?? 0;
    }
    if (profile.capitalSourceType === 'subaccount') {
        return fallbackCapital ?? 0;
    }
    return 0;
}

export function calculateAllowedRiskPerTrade(currentCapital: number, maxRiskPerTradePercent?: number): number {
    if (!maxRiskPerTradePercent || currentCapital <= 0) return 0;
    return (currentCapital * maxRiskPerTradePercent) / 100;
}
