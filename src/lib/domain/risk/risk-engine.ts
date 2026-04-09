import type { 
    RiskProfileConfig, 
    TradeRiskSnapshot, 
    DailyRiskStatus,
    GrowthPhase
} from './types';
import { toLocalDateStr } from './risk-utils';

/**
 * Calcula o status diário de risco com base nas trades do dia atual e no perfil configurado.
 * 
 * @param profile - A configuração do perfil de risco do usuário
 * @param trades - O histórico de trades (será filtrado para o dia atual)
 * @param growthPhase - (Opcional) Fase de crescimento atual para sobreposição de limites
 * @returns O status diário sumarizado (Target/Loss/Lock/Running)
 */
export function calculateDailyRiskStatus(
    profile: RiskProfileConfig, 
    trades: TradeRiskSnapshot[],
    growthPhase?: GrowthPhase
): DailyRiskStatus {
    const todayStr = toLocalDateStr(new Date());
    
    const todayTrades = trades.filter((t) => {
        const tradeDate = toLocalDateStr(t.date);
        const match = tradeDate === todayStr;
        return match;
    });

    console.log(`[RiskEngine] Daily Audit: ${todayStr} | Trades Total: ${trades.length} | Trades Today: ${todayTrades.length}`);
    if (todayTrades.length > 0) {
        console.log(`[RiskEngine] Today's Trades PnL:`, todayTrades.map(t => t.pnl));
    }

    let dailyPnL = 0;
    let dailyPnLPoints = 0;
    let dailyGrossLoss = 0;
    
    // Para cálculo de Max Intraday Drawdown
    let dailyPeak = 0;
    let maxDailyDrawdown = 0;
    let currentEquity = 0;

    for (const trade of todayTrades) {
        dailyPnL += trade.pnl;
        dailyPnLPoints += trade.pnlPoints;
        
        if (trade.pnl < 0) {
            dailyGrossLoss += Math.abs(trade.pnl);
        }
        
        currentEquity += trade.pnl;
        if (currentEquity > dailyPeak) {
            dailyPeak = currentEquity;
        }
        const currentDD = dailyPeak - currentEquity;
        if (currentDD > maxDailyDrawdown) {
            maxDailyDrawdown = currentDD;
        }
    }

    const isCurrencyLoss = profile.maxDailyLossType === 'currency';
    const isCurrencyTarget = profile.dailyTargetType === 'currency';

    // Resolver limites efetivos (Fase de Crescimento > Modo Avançado > Modo Simples)
    let effectiveMaxDailyLoss = profile.maxDailyLossValue;
    let effectiveDailyTarget = profile.dailyTargetValue;

    // Prioridade 1: Fase de Crescimento (Extração de Condições Dinâmicas)
    if (growthPhase) {
        // Tenta encontrar uma regra de perda diária/limite nas condições de regressão da fase
        const lossCondition = growthPhase.conditionsToDemote.find(c => {
            const canonical = c.metric.toLowerCase().trim();
            return canonical.includes('perda_diaria') || 
                   canonical.includes('max_daily_loss') || 
                   canonical.includes('daily_loss') ||
                   canonical.includes('max_loss_limit') ||
                   canonical.includes('drawdown_limit') ||
                   canonical.includes('drawdown');
        });

        if (lossCondition && lossCondition.value > 0) {
            effectiveMaxDailyLoss = lossCondition.value;
        } else if (growthPhase.maxDailyLoss !== undefined && growthPhase.maxDailyLoss > 0) {
            effectiveMaxDailyLoss = growthPhase.maxDailyLoss;
        }
    } 
    // Prioridade 2: Regras Avançadas do Perfil
    else if (profile.useAdvancedRules && profile.riskRules) {
        const lossRule = profile.riskRules.find(r => r.targetType === 'max_daily_loss' && r.enabled);
        if (lossRule) effectiveMaxDailyLoss = Number(lossRule.value);

        const targetRule = profile.riskRules.find(r => r.targetType === 'profit_target' && r.enabled);
        if (targetRule) effectiveDailyTarget = Number(targetRule.value);
    }

    const currentLossMetric = isCurrencyLoss ? dailyPnL : dailyPnLPoints;
    const currentTargetMetric = isCurrencyTarget ? dailyPnL : dailyPnLPoints;

    // O critério de bloqueio agora considera o PREJUÍZO BRUTO se o usuário optar por proteção estrita,
    // mas por padrão no TraderLog usamos o PnL Líquido do dia.
    // Para resolver o pedido do usuário ("drawdown diário some"), vamos manter o hit se any metric for violada.
    const dailyLossHit = currentLossMetric <= -effectiveMaxDailyLoss || dailyGrossLoss >= effectiveMaxDailyLoss;
    const dailyTargetHit = currentTargetMetric >= effectiveDailyTarget;

    const remainingLossAllowance = isCurrencyLoss 
        ? Math.max(0, effectiveMaxDailyLoss - dailyGrossLoss) // Usamos o Bruto para o "Restante" para ser conservador
        : Math.max(0, effectiveMaxDailyLoss + dailyPnLPoints);

    const remainingTargetToHit = isCurrencyTarget
        ? Math.max(0, effectiveDailyTarget - dailyPnL)
        : Math.max(0, effectiveDailyTarget - dailyPnLPoints);

    const isLocked = Boolean(profile.lockOnLoss && dailyLossHit);

    let statusLabel: DailyRiskStatus['statusLabel'] = 'NO_TRADES';
    
    if (todayTrades.length > 0) {
        if (isLocked) {
            statusLabel = 'LOCKED';
        } else if (dailyLossHit) {
            statusLabel = 'LOSS_LIMIT_HIT';
        } else if (dailyTargetHit) {
            statusLabel = 'TARGET_HIT';
        } else {
            statusLabel = 'RUNNING';
        }
    }

    return {
        date: todayStr,
        dailyPnL,
        dailyPnLPoints,
        dailyTargetHit,
        dailyLossHit,
        effectiveMaxDailyLoss,
        effectiveDailyTarget,
        remainingLossAllowance,
        remainingTargetToHit,
        dailyGrossLoss,
        maxDailyDrawdown,
        currentDailyDrawdown: dailyPeak - currentEquity,
        isLocked,
        statusLabel
    };
}

/**
 * Calcula o capital atual disponível baseado no tipo de fonte configurada.
 */
export function calculateCurrentCapital(
    profile: RiskProfileConfig, 
    fallbackCapital?: number
): number {
    if (profile.capitalSourceType === 'fixed') {
        return profile.fixedCapital ?? 0;
    }
    
    if (profile.capitalSourceType === 'subaccount') {
        return fallbackCapital ?? 0;
    }
    
    return 0;
}

/**
 * Calcula o risco máximo financeiro permitido por trade.
 */
export function calculateAllowedRiskPerTrade(
    currentCapital: number, 
    maxRiskPerTradePercent?: number
): number {
    if (!maxRiskPerTradePercent || currentCapital <= 0) {
        return 0;
    }
    
    return (currentCapital * maxRiskPerTradePercent) / 100;
}
