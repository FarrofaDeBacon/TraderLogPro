/**
 * Configuração principal do Perfil de Risco do Trader.
 * Define os limites, metas e modos operacionais.
 */

export type RiskStatusLabel = 'NO_TRADES' | 'RUNNING' | 'TARGET_HIT' | 'LOSS_LIMIT_HIT' | 'LOCKED';

export type EmotionalStateTag = 'tilt' | 'revenge' | 'greed' | 'fear' | 'fomo' | 'angry' | 'frustrated' | (string & {});

export interface RiskProfileConfig {
    id: string;
    name: string;
    isActive: boolean;
    
    // Capital
    capitalSourceType: 'fixed' | 'subaccount';
    fixedCapital?: number;
    subaccountId?: string;
    
    // Metas Diárias
    dailyTargetType: 'currency' | 'points';
    dailyTargetValue: number;
    
    // Limites de Perda
    maxDailyLossType: 'currency' | 'points';
    maxDailyLossValue: number;
    maxRiskPerTradePercent?: number;
    minimumRiskReward?: number;
    
    // Limites Operacionais
    maxTradesPerDay?: number;
    lockOnLoss?: boolean;
    
    // Modos Especiais
    sniperModeEnabled?: boolean;
    sniperMaxTradesPerDay?: number;
    
    emotionalCouplingEnabled?: boolean;
    emotionalLookbackTrades?: number;
    emotionalPenaltyThreshold?: number;
    
    growthPlanEnabled?: boolean;
    useAdvancedRules?: boolean;
    riskRules?: RiskRuleDefinition[];
}

/**
 * Definição de uma Regra de Risco no domínio.
 */
export interface RiskRuleDefinition {
    id: string;
    name: string;
    enabled: boolean;
    scope: 'global' | 'asset' | 'combined';
    targetType: string;
    operator: string;
    value: number | boolean;
    valueSecondary?: number;
}

/**
 * Definição de uma Fase do Plano de Crescimento.
 * Contém os critérios mínimos para promoção ou regressão.
 */
export interface GrowthPhase {
    id: string;
    name: string;
    index?: number; // Índice 0-based
    level?: number; // Nível para UI (geralmente index + 1)
    
    // Limites da Fase
    maxContracts: number;
    
    // Critérios de Promoção Mínimos
    minTrades: number;
    minWinRate: number;
    minProfitFactor: number;
    minExpectancyR: number;
    minNetPnL: number;
    minPositiveSessions?: number;
    minConsistencyDays?: number; // "Dias O.K" ou Consistência
    
    // Critérios de Regressão
    maxDrawdownPercent: number;
    maxDrawdownAmount?: number;
    maxDailyLoss?: number;
    maxConsecutiveLossDays?: number;
    
    // Permissões
    allowPromotion: boolean;
    allowRegression: boolean;
    
    // Condições Genéricas (Sincronizado com Models.rs)
    conditionsToAdvance: RiskCondition[];
    conditionsToDemote: RiskCondition[];
}

export interface RiskCondition {
    metric: string;
    operator: string;
    value: number;
}

/**
 * Representação de uma Trade formatada para análise de Risco.
 */
export interface TradeRiskSnapshot {
    tradeId: string;
    date: Date | string;
    
    // Resultados Financeiros
    pnl: number;
    pnlPoints: number;
    resultR: number;
    
    // Resultados Binários
    isWin: boolean;
    isLoss: boolean;
    
    // Dados Operacionais
    contracts: number;
    
    // Análises Comportamentais
    emotionalState?: EmotionalStateTag;
    violatedPlan?: boolean;
}

/**
 * Resumo diário do status de risco do Trader.
 */
export interface DailyRiskStatus {
    date: string;
    
    // Resultados Acumulados
    dailyPnL: number;
    dailyPnLPoints: number;
    
    // Status de Limites
    dailyTargetHit: boolean;
    dailyLossHit: boolean;
    
    // Limites Efetivos (Resolvidos das Regras ou Base)
    effectiveMaxDailyLoss: number;
    effectiveDailyTarget: number;
    
    // Distâncias para os Limites
    remainingLossAllowance: number;
    remainingTargetToHit: number;
    
    // Métricas persistentes de prejuízo (não recuperam com lucro)
    dailyGrossLoss: number;
    maxDailyDrawdown: number;
    currentDailyDrawdown: number;
    
    // Travamentos de Segurança
    isLocked: boolean;
    statusLabel: RiskStatusLabel;
}

/**
 * Consolidação das métricas necessárias para avaliação de Crescimento.
 */
export interface GrowthMetrics {
    tradeCount: number;
    winRate: number;
    profitFactor: number;
    expectancyR: number;
    drawdownPercent: number;
    drawdownAmount: number;
    currentDrawdownAmount: number;
    currentDrawdownPercent: number;
    maxDailyLoss: number;
    maxDailyLossPoints: number;
    netPnL: number;
    netPoints: number;
    positiveSessions: number;
    consistencyDays: number;
    consecutiveLossDays: number;
    operatedDays: number;
    bestDayShare: number;
    drawdownAmountPoints: number;
}

/**
 * Resultado da avaliação de uma condição de crescimento.
 */
export interface GrowthConditionStatus {
    metric: string;
    operator: string;
    target: number;
    current: number;
    isMet: boolean;
    label_key: string;
    description_key?: string;
    unit?: string;
}

export type GrowthPhaseStatus = 'active' | 'maintenance' | 'max_reached' | 'protected';

export interface GrowthEvaluationResult {
    currentPhaseId: string;
    phaseIndex: number;
    totalPhases: number;
    phaseStatus: GrowthPhaseStatus;
    canPromote: boolean;
    shouldRegress: boolean;
    regressionReasonKey?: string;
    regressionReasonMetric?: string;
    advanceConditions: GrowthConditionStatus[];
    regressionConditions: GrowthConditionStatus[];
    metrics: GrowthMetrics;
}


/**
 * Resultado da avaliação de Disciplina e Controle Emocional.
 */
export interface DisciplineEvaluationResult {
    score: number;
    warnings: string[];
    violations: string[];
    overtradingDetected: boolean;
    emotionalRiskDetected: boolean;
}

/**
 * Avaliação genérica de condição.
 */
export interface ConditionEvaluation {
    passed: boolean;
    actual: number;
}

export type DeskValidationContext = {
    /** The active AssetRiskProfile (e.g. from the selected asset map) */
    assetRiskProfileId?: string;
    /** Whether the current trade or context is considered a Swing Trade */
    isSwingTrade?: boolean;
    /** Current time in minutes since midnight (0-1439), or undefined if not calculable */
    currentTimeMinutes?: number;
    /** Combined exposure matching the rules in the desk config logic */
    combinedExposure?: number;
};

export type DeskValidationResult = {
    /** True if the context is allowed by the Desk Config */
    allowed: boolean;
    /** Explicit rejection reasons preventing execution */
    reasons: string[];
    /** Operational warnings (e.g. missing context to validate time logic) */
    warnings: string[];
    /** Granular flag check results */
    checks: {
        allowedAsset: boolean;
        combinedExposure: boolean;
        dayTradeOnly: boolean;
        closeBeforeMarketClose: boolean;
    };
};

export type DeskAuditStatus = 'pending' | 'passed' | 'failed';

export type DeskAuditResult = {
    status: DeskAuditStatus;
    reasons: string[];
    warnings: string[];
    metrics: {
        operated_days: number;
        positive_days: number;
        total_net_profit: number;
        best_day_profit: number;
        best_day_share_percent: number;
    };
};
