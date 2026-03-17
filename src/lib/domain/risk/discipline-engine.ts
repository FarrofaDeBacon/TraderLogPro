import type { RiskProfileConfig, TradeRiskSnapshot, DisciplineEvaluationResult } from './types';

// Array de estados emocionais que indicam risco ou perda de controle
const NEGATIVE_EMOTIONS = ['tilt', 'revenge', 'greed', 'fear', 'fomo', 'angry', 'frustrated'];

function getTodayTrades(trades: TradeRiskSnapshot[]): TradeRiskSnapshot[] {
    const todayStr = new Date().toISOString().substring(0, 10);
    return trades.filter(t => {
        const tDate = typeof t.date === 'string' ? t.date : t.date.toISOString();
        return tDate.substring(0, 10) === todayStr;
    });
}

function analyzeEmotionalRisk(trades: TradeRiskSnapshot[], lookback: number): boolean {
    if (trades.length < 2) return false;
    
    // Analisar as últimas X trades
    const recentTrades = trades.slice(-lookback);
    
    let consecutiveLossesWithNegativeEmotion = 0;

    for (const t of recentTrades) {
        // Checagem segura de null/undefined para o emotionalState
        const state = t.emotionalState ? t.emotionalState.toLowerCase() : '';
        const hasNegativeEmotion = NEGATIVE_EMOTIONS.some(e => state.includes(e));

        if (t.isLoss && hasNegativeEmotion) {
            consecutiveLossesWithNegativeEmotion++;
            if (consecutiveLossesWithNegativeEmotion >= 2) {
                return true; 
            }
        } else {
            // Conta quebra de sequência em caso de Gain ou estado neutro/positivo
            consecutiveLossesWithNegativeEmotion = 0;
        }
    }

    return false;
}

export function evaluateDiscipline(
    profile: RiskProfileConfig,
    trades: TradeRiskSnapshot[]
): DisciplineEvaluationResult {
    let score = 100;
    const warnings: string[] = [];
    const violations: string[] = [];
    let overtradingDetected = false;
    let emotionalRiskDetected = false;

    // Isolar os trades do dia atual
    const todayTrades = getTodayTrades(trades);
    const todayTradeCount = todayTrades.length;

    // 1. Checagem de Overtrading Geral
    if (profile.maxTradesPerDay !== undefined && profile.maxTradesPerDay > 0) {
        if (todayTradeCount > profile.maxTradesPerDay) {
            overtradingDetected = true;
            score -= 20;
            violations.push(`Overtrading detectado: Operações do dia (${todayTradeCount}) excederam o limite global (${profile.maxTradesPerDay}).`);
        }
    }

    // 2. Checagem de Sniper Mode
    if (profile.sniperModeEnabled && profile.sniperMaxTradesPerDay !== undefined && profile.sniperMaxTradesPerDay > 0) {
        if (todayTradeCount > profile.sniperMaxTradesPerDay) {
            // Sniper mode é apenas warning tático, não infração sistêmica, a menos que vire violency (avaliado por outras métricas)
            warnings.push(`Aviso Sniper Mode: Operações do dia (${todayTradeCount}) excederam seu limite hiper-focado (${profile.sniperMaxTradesPerDay}).`);
            score -= 5;
        }
    }

    // 3. Checagem de Viabilidade / Violar o Plano de Trade
    const violatedTrades = trades.filter(t => t.violatedPlan).length;
    if (violatedTrades > 0) {
        score -= (10 * violatedTrades);
        violations.push(`Foram registradas ${violatedTrades} operação(ões) que violaram o plano de trade original.`);
    }

    // 4. Checagem de Acoplamento Emocional (Tilt / Revenge)
    if (profile.emotionalCouplingEnabled) {
        const lookback = profile.emotionalLookbackTrades ?? 5; // Fallback default
        emotionalRiskDetected = analyzeEmotionalRisk(trades, lookback);

        if (emotionalRiskDetected) {
            const penalty = profile.emotionalPenaltyThreshold ?? 30;
            score -= penalty;
            warnings.push("Risco emocional alto: Detectamos perdas consecutivas associadas a estados mentais nocivos (Tilt/Revenge).");
        }
    }

    // Limitar o score final para não ficar negativo
    score = Math.max(0, score);

    return {
        score,
        warnings,
        violations,
        overtradingDetected,
        emotionalRiskDetected
    };
}
