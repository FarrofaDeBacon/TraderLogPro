import type { 
    GrowthPhase, 
    TradeRiskSnapshot, 
    GrowthEvaluationResult,
    GrowthMetrics,
    RiskCondition,
    GrowthConditionStatus
} from './types';

/**
 * Normaliza uma data para string YYYY-MM-DD local sem desvio de fuso horário.
 */
function toLocalDateStr(date: Date | string): string {
    if (typeof date === 'string') {
        const isoMatch = date.match(/^(\d{4}-\d{2}-\d{2})/);
        if (isoMatch) return isoMatch[1];
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return '0000-00-00';
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Mapeamento centralizado de Aliases para Normalização de Métricas.
 */
const METRIC_MAP: Record<string, string> = {
    'profit_target': 'net_pnl',
    'target_financial': 'net_pnl',
    'meta_de_lucro': 'net_pnl',
    'objetivo_de_lucro': 'net_pnl',
    
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
    'consistencia_dias': 'consistency_days',
    'dias_ok': 'consistency_days',
    
    'max_drawdown': 'max_drawdown',
    'drawdown_limit': 'max_drawdown',
    'drawdown_maximo': 'max_drawdown',
    'daily_drawdown_limit': 'max_drawdown',
    
    'max_daily_loss': 'max_daily_loss',
    'daily_loss_limit': 'max_daily_loss',
    'perda_diaria': 'max_daily_loss',
    'max_loss_limit': 'max_daily_loss',
    
    'loss_streak': 'loss_streak',
    'max_consecutive_loss_days': 'loss_streak',
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
    startingCapital: number
): GrowthMetrics {
    const tradeCount = trades.length;
    if (tradeCount === 0) {
        return {
            tradeCount: 0, winRate: 0, profitFactor: 0, expectancyR: 0,
            drawdownPercent: 0, drawdownAmount: 0, 
            currentDrawdownAmount: 0, currentDrawdownPercent: 0,
            maxDailyLoss: 0, netPnL: 0,
            positiveSessions: 0, consistencyDays: 0, consecutiveLossDays: 0
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

    const dailyPnL: Record<string, number> = {};
    
    for (const trade of trades) {
        currentEquity += trade.pnl;
        if (currentEquity > peak) peak = currentEquity;
        const currentDD = peak - currentEquity;
        if (currentDD > maxDrawdownAmount) maxDrawdownAmount = currentDD;
        const currentDDPercent = peak > 0 ? (currentDD / peak) * 100 : 0;
        if (currentDDPercent > maxDrawdownPercent) maxDrawdownPercent = currentDDPercent;

        const dateStr = toLocalDateStr(trade.date);
        dailyPnL[dateStr] = (dailyPnL[dateStr] || 0) + trade.pnl;
    }

    const dailyValues = Object.entries(dailyPnL).sort((a, b) => a[0].localeCompare(b[0]));
    const positiveSessions = dailyValues.filter(v => v[1] > 0).length;
    const minPnL = Math.min(...Object.values(dailyPnL));
    const maxDailyLoss = minPnL < 0 ? Math.abs(minPnL) : 0;

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

    return {
        tradeCount, winRate, profitFactor, expectancyR,
        drawdownPercent: maxDrawdownPercent, 
        drawdownAmount: maxDrawdownAmount,
        currentDrawdownAmount: peak - currentEquity,
        currentDrawdownPercent: peak > 0 ? ((peak - currentEquity) / peak) * 100 : 0,
        maxDailyLoss, netPnL, positiveSessions, consistencyDays, consecutiveLossDays
    };
}

function getMetricLabelKey(metric: string): string {
    const canonical = getCanonicalMetric(metric);
    const keys: Record<string, string> = {
        'net_pnl': 'risk.cockpit.criteria.profit_target',
        'trade_count': 'risk.cockpit.engine.min_trading_days',
        'win_rate': 'risk.cockpit.criteria.win_rate',
        'positive_sessions': 'risk.cockpit.criteria.positive_sessions',
        'consistency_days': 'risk.cockpit.criteria.consistency_days',
        'max_drawdown': 'risk.cockpit.criteria.max_drawdown',
        'max_daily_loss': 'risk.cockpit.criteria.daily_loss',
        'loss_streak': 'risk.cockpit.criteria.loss_streak'
    };
    return keys[canonical] || `risk.cockpit.engine.${canonical}`;
}

function evaluateCondition(condition: any, metrics: GrowthMetrics): GrowthConditionStatus {
    if (!condition) return { metric: 'unknown', operator: '?', target: 0, current: 0, isMet: false, label_key: 'risk.cockpit.unknown' };

    const metricKey = condition.metric || 'unknown';
    const canonical = getCanonicalMetric(metricKey);
    const operator = condition.operator || '>=';
    const target = Number(condition.value) || 0;
    
    // Mapeamento Invencível de métricas (cruzando canonical snake_case -> metrics camelCase)
    let current = 0;
    if (canonical === 'trade_count') current = metrics.tradeCount ?? 0;
    else if (canonical === 'win_rate') current = metrics.winRate ?? 0;
    else if (canonical === 'profit_factor') current = metrics.profitFactor ?? 0;
    else if (canonical === 'net_pnl') current = metrics.netPnL ?? 0;
    else if (canonical === 'max_drawdown') current = metrics.drawdownAmount ?? 0;
    else if (canonical === 'consistency_days') current = metrics.consistencyDays ?? 0;
    else if (canonical === 'loss_streak') current = metrics.consecutiveLossDays ?? 0;
    else if (canonical === 'positive_sessions') current = metrics.positiveSessions ?? 0;
    else if (canonical === 'max_daily_loss') current = metrics.maxDailyLoss ?? 0;
    else {
        // Fallback: Tenta acessar diretamente pela chave
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
        label_key: getMetricLabelKey(canonical)
    };
}

export function evaluateGrowthPhase(
    currentPhase: GrowthPhase,
    trades: TradeRiskSnapshot[],
    startingCapital: number,
    phaseIndex: number = 0,
    totalPhases: number = 1
): GrowthEvaluationResult {
    const metrics = calculateGrowthMetrics(trades, startingCapital);

    const conditions = currentPhase.conditionsToAdvance || [];
    console.log(`[GrowthEngine] Evaluating phase "${currentPhase.name}" with ${conditions.length} conditions.`);
    
    const advanceConditions = conditions.map(c => {
        const res = evaluateCondition(c, metrics);
        console.log(`  - Condition "${c.metric}": isMet=${res.isMet}, current=${res.current}, target=${res.target}`);
        return res;
    });
    const regressionConditions = (currentPhase.conditionsToDemote || []).map(c => evaluateCondition(c, metrics));

    const isLastPhase = phaseIndex >= totalPhases - 1;
    const canPromote = currentPhase.allowPromotion && !isLastPhase && advanceConditions.length > 0 && advanceConditions.every(c => c.isMet);
    const shouldRegress = currentPhase.allowRegression && regressionConditions.some(c => c.isMet);

    let phaseStatus: GrowthEvaluationResult['phaseStatus'] = 'active';
    let regressionReasonKey: string | undefined;

    if (shouldRegress) {
        phaseStatus = 'protected'; 
        const failedCondition = regressionConditions.find(c => c.isMet);
        regressionReasonKey = failedCondition?.label_key;
    } else if (isLastPhase) {
        phaseStatus = 'max_reached';
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
