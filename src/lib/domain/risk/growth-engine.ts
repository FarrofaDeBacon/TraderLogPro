import type { 
    GrowthPhase, 
    TradeRiskSnapshot, 
    GrowthEvaluationResult,
    GrowthMetrics,
    RiskCondition,
    GrowthConditionStatus
} from './types';
import { toLocalDateStr } from './risk-utils';

/**
 * Mapeamento centralizado de Aliases para Normalização de Métricas.
 */
const METRIC_MAP: Record<string, string> = {
    'profit_target': 'net_pnl',
    'target_financial': 'net_pnl',
    'meta_de_lucro': 'net_pnl',
    'objetivo_de_lucro': 'net_pnl',
    'profit_target_financial': 'net_pnl',
    'profit_target_amount': 'net_pnl',
    'profit': 'net_pnl',
    'pnl': 'net_pnl',
    'lucro': 'net_pnl',
    'ganho': 'net_pnl',
    
    'days': 'operated_days',
    'operated_days': 'operated_days',
    'dias_operados': 'operated_days',
    
    'trade_count': 'trade_count',
    'min_trades': 'trade_count',
    'min_trading_days': 'trade_count',
    'contagem_de_trades': 'trade_count',
    'dias_de_negociacao': 'trade_count',
    
    'win_rate': 'win_rate',
    'taxa_de_acerto': 'win_rate',
    'min_win_rate': 'win_rate',
    'taxa_de_acerto_percent': 'win_rate',
    'win_rate_percent': 'win_rate',
    
    'positive_sessions': 'positive_sessions',
    'days_positive': 'positive_sessions',
    'sessoes_positivas': 'positive_sessions',
    'dias_positivos': 'positive_sessions',
    
    'consistency_days': 'consistency_days',
    'consistencia': 'consistency_days',
    'consistência': 'consistency_days',
    'consistency': 'consistency_days',
    'consistencia_dias': 'consistency_days',
    'consistencia_de_ganhos': 'consistency_days',
    'dias_ok': 'consistency_days',
    'dias_seguidos': 'consistency_days',
    'consecutive_days': 'consistency_days',
    'consecutive_profit_days': 'consistency_days',
    
    'best_day_share': 'best_day_share',
    'melhor_dia': 'best_day_share',
    'regra_do_melhor_dia': 'best_day_share',
    'best_day_percent': 'best_day_share',
    
    'max_drawdown': 'max_drawdown',
    'max_drawdown_amount': 'max_drawdown',
    'max_drawdown_financial': 'max_drawdown',
    'drawdown_limit': 'max_drawdown',
    'drawdown_maximo': 'max_drawdown',
    'daily_drawdown_limit': 'max_drawdown',
    
    'max_daily_loss': 'max_daily_loss',
    'max_daily_loss_amount': 'max_daily_loss',
    'max_daily_loss_financial': 'max_daily_loss',
    'daily_loss_limit': 'max_daily_loss',
    'perda_diaria': 'max_daily_loss',
    'max_loss_limit': 'max_daily_loss',
    
    'loss_streak': 'loss_streak',
    'lossstreak': 'loss_streak',
    'max_consecutive_loss_days': 'loss_streak',
    'sequenica_de_loss': 'loss_streak',
    'sequencia_de_loss': 'loss_streak',
    'dias_de_loss_consecutivos': 'loss_streak',
    'max_daily_loss_streak': 'loss_streak'
};

/**
 * Normaliza o nome de uma métrica para a chave canônica.
 */
function getCanonicalMetric(rawKey: string): string {
    if (!rawKey) return '';
    const normalized = rawKey
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
    
    return METRIC_MAP[normalized] || normalized;
}

/**
 * Calcula métricas de crescimento a partir de uma lista de trades.
 */
export function calculateGrowthMetrics(
    trades: TradeRiskSnapshot[], 
    startingCapital: number,
    dailyLossMode: 'accumulate' | 'recover' = 'accumulate',
    phaseDrawdownMode: 'accumulate' | 'recover' = 'accumulate'
): GrowthMetrics {
    const tradeCount = trades.length;
    if (tradeCount === 0) {
        return {
            tradeCount: 0, winRate: 0, profitFactor: 0, expectancyR: 0,
            drawdownPercent: 0, drawdownAmount: 0, drawdownAmountPoints: 0,
            currentDrawdownAmount: 0, currentDrawdownPercent: 0,
            maxDailyLoss: 0, maxDailyLossPoints: 0, netPnL: 0, netPoints: 0,
            positiveSessions: 0, consistencyDays: 0, consecutiveLossDays: 0, operatedDays: 0,
            bestDayShare: 0
        };
    }

    const wins = trades.filter(t => t.isWin).length;
    const winRate = (wins / tradeCount) * 100;

    const grossProfit = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + Math.abs(t.pnl), 0);
    const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 99.99 : 0) : grossProfit / grossLoss;

    const expectancyR = trades.reduce((sum, t) => sum + (t.resultR || 0), 0) / tradeCount;
    const netPnL = trades.reduce((sum, t) => sum + t.pnl, 0);

    let peak = startingCapital;
    let currentEquity = startingCapital;
    let maxDrawdownAmount = 0;
    let maxDrawdownPercent = 0;

    const dailyNetPnL: Record<string, number> = {};
    const dailyLossExposure: Record<string, number> = {};
    const dailyNetPoints: Record<string, number> = {};
    const dailyLossPointsExposure: Record<string, number> = {};
    
    let peakPoints = 0;
    let currentEquityPoints = 0;
    let maxDrawdownPoints = 0;
    
    for (const trade of trades) {
        currentEquity += trade.pnl;
        if (currentEquity > peak) peak = currentEquity;
        const currentDD = peak - currentEquity;
        if (currentDD > maxDrawdownAmount) maxDrawdownAmount = currentDD;
        const currentDDPercent = peak > 0 ? (currentDD / peak) * 100 : 0;
        if (currentDDPercent > maxDrawdownPercent) maxDrawdownPercent = currentDDPercent;

        // Peak / Drawdown em PONTOS
        currentEquityPoints += (trade.pnlPoints || 0);
        if (currentEquityPoints > peakPoints) peakPoints = currentEquityPoints;
        const currentDDPoints = peakPoints - currentEquityPoints;
        if (currentDDPoints > maxDrawdownPoints) maxDrawdownPoints = currentDDPoints;

        const dateStr = toLocalDateStr(trade.date);
        
        // Mapa 1: Saldo Líquido Diário (Métricas de Performance e Dias Operados)
        dailyNetPnL[dateStr] = (dailyNetPnL[dateStr] || 0) + trade.pnl;
        dailyNetPoints[dateStr] = (dailyNetPoints[dateStr] || 0) + (trade.pnlPoints || 0);

        // Mapa 2: Exposição de Perda (Regras de Risco e drawdown diário)
        if (dailyLossMode === 'accumulate') {
            if (trade.pnl < 0) {
                dailyLossExposure[dateStr] = (dailyLossExposure[dateStr] || 0) + trade.pnl;
            }
            if ((trade.pnlPoints || 0) < 0) {
                dailyLossPointsExposure[dateStr] = (dailyLossPointsExposure[dateStr] || 0) + (trade.pnlPoints || 0);
            }
        } else {
            dailyLossExposure[dateStr] = (dailyLossExposure[dateStr] || 0) + trade.pnl;
            dailyLossPointsExposure[dateStr] = (dailyLossPointsExposure[dateStr] || 0) + (trade.pnlPoints || 0);
        }
    }

    const dailyValues = Object.entries(dailyNetPnL).sort((a, b) => a[0].localeCompare(b[0]));
    const positiveSessions = dailyValues.filter(v => v[1] > 0).length;
    
    // Perda Diária Máxima Financeira
    const minPnLExposure = Math.min(...Object.values(dailyLossExposure), 0);
    const maxDailyLoss = Math.abs(minPnLExposure);

    // Perda Diária Máxima em Pontos
    const minLossPointsExposure = Math.min(...Object.values(dailyLossPointsExposure), 0);
    const maxDailyLossPoints = Math.abs(minLossPointsExposure);

    let consistencyDays = 0;
    let currentConsistency = 0;
    let consecutiveLossDays = 0;
    let currentLossStreak = 0;

    for (const [_, pnl] of dailyValues) {
        if (pnl < 0) {
            currentLossStreak++;
            currentConsistency = 0;
        } else {
            currentLossStreak = 0;
            if (pnl > 0) currentConsistency++;
        }
        if (currentConsistency > consistencyDays) consistencyDays = currentConsistency;
        if (currentLossStreak > consecutiveLossDays) consecutiveLossDays = currentLossStreak;
    }

    const totalPositivePnL = dailyValues.filter(v => v[1] > 0).reduce((sum, v) => sum + v[1], 0);
    const bestDayPnL = dailyValues.length > 0 ? Math.max(...dailyValues.map(v => v[1]), 0) : 0;
    const bestDayShare = totalPositivePnL > 0 ? (bestDayPnL / totalPositivePnL) * 100 : 0;

    const netPoints = trades.reduce((sum, t) => sum + (t.pnlPoints || 0), 0);

    return {
        tradeCount, winRate, profitFactor, expectancyR,
        drawdownPercent: phaseDrawdownMode === 'recover' 
            ? (peak > 0 ? ((peak - currentEquity) / peak) * 100 : 0)
            : maxDrawdownPercent, 
        drawdownAmount: phaseDrawdownMode === 'recover'
            ? (peak - currentEquity)
            : maxDrawdownAmount,
        drawdownAmountPoints: phaseDrawdownMode === 'recover'
            ? (peakPoints - currentEquityPoints)
            : maxDrawdownPoints,
        currentDrawdownAmount: peak - currentEquity,
        currentDrawdownPercent: peak > 0 ? ((peak - currentEquity) / peak) * 100 : 0,
        maxDailyLoss, 
        maxDailyLossPoints,
        netPnL,
        netPoints,
        positiveSessions, 
        consistencyDays, 
        consecutiveLossDays, 
        operatedDays: Object.keys(dailyNetPnL).length,
        bestDayShare
    };
}

function getMetricLabelKey(metric: string): string {
    const canonical = getCanonicalMetric(metric);
    const keys: Record<string, string> = {
        'net_pnl': 'risk.growth.requirements.profit',
        'net_points': 'risk.growth.requirements.profit',
        'trade_count': 'risk.cockpit.engine.min_trading_days',
        'win_rate': 'risk.growth.requirements.winRate',
        'positive_sessions': 'risk.growth.requirements.days',
        'consistency_days': 'risk.cockpit.engine.consistency',
        'max_drawdown': 'risk.growth.requirements.drawdown',
        'drawdown_amount_points': 'risk.growth.requirements.drawdown',
        'max_daily_loss': 'risk.growth.requirements.dailyLoss',
        'max_daily_loss_points': 'risk.growth.requirements.dailyLoss',
        'loss_streak': 'risk.cockpit.engine.loss_streak',
        'operated_days': 'risk.cockpit.engine.days',
        'best_day_share': 'risk.cockpit.engine.best_day_share'
    };
    return keys[canonical] || `risk.cockpit.engine.${canonical}`;
}

function evaluateCondition(
    condition: any, 
    metrics: GrowthMetrics,
    targetUnit: 'financial' | 'points' = 'financial',
    drawdownUnit: 'financial' | 'points' = 'financial'
): GrowthConditionStatus {
    if (!condition) return { metric: 'unknown', operator: '?', target: 0, current: 0, isMet: false, label_key: 'risk.cockpit.unknown' };

    const metricKey = condition.metric || 'unknown';
    let canonical = getCanonicalMetric(metricKey);
    const operator = condition.operator || '>=';
    const target = Number(condition.value) || 0;
    
    if (targetUnit === 'points' && canonical === 'net_pnl') {
        canonical = 'net_points';
    }
    if (drawdownUnit === 'points') {
        if (canonical === 'max_drawdown') canonical = 'drawdown_amount_points';
        if (canonical === 'max_daily_loss') canonical = 'max_daily_loss_points';
    }

    let current = 0;
    if (canonical === 'trade_count') current = metrics.tradeCount ?? 0;
    else if (canonical === 'win_rate') current = metrics.winRate ?? 0;
    else if (canonical === 'profit_factor') current = metrics.profitFactor ?? 0;
    else if (canonical === 'net_pnl') current = metrics.netPnL ?? 0;
    else if (canonical === 'net_points') current = metrics.netPoints ?? 0;
    else if (canonical === 'max_drawdown') current = metrics.drawdownAmount ?? 0;
    else if (canonical === 'drawdown_amount_points') current = metrics.drawdownAmountPoints ?? 0;
    else if (canonical === 'consistency_days') current = metrics.consistencyDays ?? 0;
    else if (canonical === 'loss_streak') current = metrics.consecutiveLossDays ?? 0;
    else if (canonical === 'positive_sessions') current = metrics.positiveSessions ?? 0;
    else if (canonical === 'max_daily_loss') current = metrics.maxDailyLoss ?? 0;
    else if (canonical === 'max_daily_loss_points') current = metrics.maxDailyLossPoints ?? 0;
    else if (canonical === 'operated_days') current = metrics.operatedDays ?? 0;
    else if (canonical === 'best_day_share') current = metrics.bestDayShare ?? 0;
    else {
        current = (metrics as any)[metricKey] ?? (metrics as any)[canonical] ?? 0;
    }

    let isMet = false;
    try {
        if (operator === '>=' || operator === '>') isMet = current >= target;
        else if (operator === '<=' || operator === '<') isMet = current <= target;
        else if (operator === '==' || operator === '=') isMet = Math.abs(current - target) < 0.01;
    } catch(e) {
        console.error("[GrowthEngine] Error evaluating condition:", e);
    }

    return {
            metric: metricKey,
        operator, 
        target, 
        current, 
        isMet,
        label_key: getMetricLabelKey(canonical),
        unit: (canonical === 'net_points' || canonical === 'drawdown_amount_points' || canonical === 'max_daily_loss_points')
            ? 'pts'
            : (canonical === 'net_pnl' || canonical === 'max_drawdown' || canonical === 'max_daily_loss')
                ? '$'
                : (canonical.toLowerCase().includes('rate') ? '%' : 
                   (canonical.toLowerCase().includes('days') || canonical === 'operated_days' || canonical === 'positive_sessions') ? 'd' : '')
    };
}

export function evaluateGrowthPhase(
    currentPhase: GrowthPhase,
    trades: TradeRiskSnapshot[],
    startingCapital: number,
    phaseIndex: number = 0,
    totalPhases: number = 1,
    dailyLossMode: 'accumulate' | 'recover' = 'accumulate',
    phaseDrawdownMode: 'accumulate' | 'recover' = 'accumulate',
    targetUnit: 'financial' | 'points' = 'financial',
    drawdownUnit: 'financial' | 'points' = 'financial'
): GrowthEvaluationResult {
    const metrics = calculateGrowthMetrics(trades, startingCapital, dailyLossMode, phaseDrawdownMode);

    const conditions = currentPhase.conditionsToAdvance || [];
    console.log(`[GrowthEngine] Evaluating phase "${currentPhase.name}" with ${conditions.length} conditions.`);
    
    const advanceConditions = conditions.map(c => {
        const res = evaluateCondition(c, metrics, targetUnit, drawdownUnit);
        console.log(`  - Condition "${c.metric}": isMet=${res.isMet}, current=${res.current}, target=${res.target}`);
        return res;
    });
    const regressionConditions = (currentPhase.conditionsToDemote || [])
        .filter(c => c && c.metric && c.metric !== 'unknown')
        .map(c => evaluateCondition(c, metrics, targetUnit, drawdownUnit));

    const isLastPhase = phaseIndex >= totalPhases - 1;
    const hasTrades = metrics.tradeCount > 0;
    const canRegress = currentPhase.allowRegression && phaseIndex > 0;
    const shouldRegress = canRegress && regressionConditions.some(c => c.isMet);

    const canPromote = currentPhase.allowPromotion && !isLastPhase && hasTrades && !shouldRegress && advanceConditions.length > 0 && advanceConditions.every(c => c.isMet);

    let phaseStatus: GrowthEvaluationResult['phaseStatus'] = 'active';
    let regressionReasonKey: string | undefined;
    let regressionReasonMetric: string | undefined;

    if (shouldRegress) {
        phaseStatus = 'protected'; 
        const violation = regressionConditions.find(c => c.isMet);
        regressionReasonKey = violation?.label_key;
        regressionReasonMetric = violation?.metric;
    } else if (isLastPhase) {
        phaseStatus = 'max_reached';
        // No modo manutenção, não há promoção, mas monitoramos se as condições de avanço (alvos) continuam batidas
    } else if (canPromote) {
        phaseStatus = 'maintenance'; 
    }

    return {
        currentPhaseId: currentPhase.id,
        phaseIndex,
        totalPhases,
        phaseStatus,
        canPromote,
        shouldRegress,
        regressionReasonKey,
        advanceConditions,
        regressionConditions,
        metrics
    };
}
