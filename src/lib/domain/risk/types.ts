export interface RiskProfileConfig {
    id: string;
    name: string;
    isActive: boolean;
    capitalSourceType: 'fixed' | 'subaccount';
    fixedCapital?: number;
    subaccountId?: string;
    dailyTargetType: 'currency' | 'points';
    dailyTargetValue: number;
    maxDailyLossType: 'currency' | 'points';
    maxDailyLossValue: number;
    maxRiskPerTradePercent?: number;
    minimumRiskReward?: number;
    maxTradesPerDay?: number;
    lockOnLoss?: boolean;
    sniperModeEnabled?: boolean;
    sniperMaxTradesPerDay?: number;
    emotionalCouplingEnabled?: boolean;
    emotionalLookbackTrades?: number;
    emotionalPenaltyThreshold?: number;
    growthPlanEnabled?: boolean;
}

export interface GrowthPhase {
    id: string;
    name: string;
    maxContracts: number;
    minTrades: number;
    minWinRate: number;
    minProfitFactor: number;
    minExpectancyR: number;
    maxDrawdownPercent: number;
    minNetPnL: number;
    allowPromotion: boolean;
    allowRegression: boolean;
}

export interface TradeRiskSnapshot {
    tradeId: string;
    date: Date | string;
    pnl: number;
    pnlPoints: number;
    resultR: number;
    isWin: boolean;
    isLoss: boolean;
    contracts: number;
    emotionalState?: string;
    violatedPlan?: boolean;
}

export interface DailyRiskStatus {
    date: string;
    dailyPnL: number;
    dailyPnLPoints: number;
    dailyTargetHit: boolean;
    dailyLossHit: boolean;
    remainingLossAllowance: number;
    remainingTargetToHit: number;
    isLocked: boolean;
    statusLabel: string;
}

export interface GrowthMetrics {
    tradeCount: number;
    winRate: number;
    profitFactor: number;
    expectancyR: number;
    drawdownPercent: number;
    netPnL: number;
}

export interface GrowthEvaluationResult {
    currentPhaseId: string;
    canPromote: boolean;
    shouldRegress: boolean;
    reasons: string[];
    metrics: GrowthMetrics;
}

export interface DisciplineEvaluationResult {
    score: number;
    warnings: string[];
    violations: string[];
    overtradingDetected: boolean;
    emotionalRiskDetected: boolean;
}
