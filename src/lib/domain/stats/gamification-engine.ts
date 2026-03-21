import { parseISO, isSameDay, differenceInDays } from "date-fns";
import type { Trade } from "$lib/types";
import { getTradeViewModel } from "$lib/domain/trades/trade-engine";
import type { DailyReview } from "$lib/stores/daily-reviews.svelte";
import { generateTraderInsights } from "$lib/domain/insights/insights-engine";
import { getLocalDatePart, parseSafeDate } from "$lib/utils";
import type { EmotionalState } from "$lib/types";

export interface GamificationStreaks {
    greenStreak: number;
    disciplineStreak: number;
    noTiltStreak: number;
    emotionalControlStreak: number;
}

export interface TraderScoreStats {
    score: number;       // Master Score (0-100)
    executionScore: number; // 30% Weight
    riskScore: number;      // 30% Weight
    behaviorScore: number;  // 25% Weight
    psychoScore: number;    // 15% Weight
    winRate: number;        // Raw
    profitFactor: number;   // Raw
}

export interface TradeConversionDeps {
    getConvertedResult: (t: Trade) => number;
    getEmotionalState: (id: string) => EmotionalState | undefined;
}

/**
 * Filtra e agrupa trades por dias únicos ordenados do mais recente para o mais antigo
 */
function groupTradesByDay(trades: Trade[], deps: TradeConversionDeps): { date: string, trades: Trade[], pnl: number }[] {
    const dayMap = new Map<string, { trades: Trade[], pnl: number }>();

    for (const t of trades) {
        const dStr = getLocalDatePart(t.exit_date || t.date);
        if (!dayMap.has(dStr)) {
            dayMap.set(dStr, { trades: [], pnl: 0 });
        }
        const bucket = dayMap.get(dStr)!;
        bucket.trades.push(t);
        bucket.pnl += deps.getConvertedResult(t);
    }

    return Array.from(dayMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // DESC
}

/**
 * Calcula as Streaks Atuais baseado nos dias operados
 */
export function calculateStreaks(
    recentTrades: Trade[],
    reviews: DailyReview[],
    deps: TradeConversionDeps
): GamificationStreaks {
    if (recentTrades.length === 0) return { greenStreak: 0, disciplineStreak: 0, noTiltStreak: 0, emotionalControlStreak: 0 };

    const days = groupTradesByDay(recentTrades, deps);
    
    let greenStreak = 0;
    let disciplineStreak = 0;
    let noTiltStreak = 0;
    let emotionalControlStreak = 0;

    let greenActive = true;
    let disciplineActive = true;
    let noTiltActive = true;
    let emotionalActive = true;

    for (const day of days) {
        // --- 1. Green Streak --- (Secundária - apenas PnL)
        if (greenActive) {
            if (day.pnl > 0) greenStreak++;
            else if (day.pnl < 0) greenActive = false;
        }

        const baseDate = parseISO(day.date);
        const rawInsights = generateTraderInsights(recentTrades, baseDate, deps.getConvertedResult, day.pnl, 0, 0);
        const hasDanger = rawInsights.some(i => i.type === 'danger');
        const review = reviews.find(r => r.date === day.date);

        // --- 2. No-Tilt Streak --- (Foco em vingança/perda grave)
        if (noTiltActive) {
            const hasRevenge = rawInsights.some(i => i.id === 'revenge_trading');
            const hasDrawdown = rawInsights.some(i => i.id === 'week_drawdown');
            // Só quebra se tiver Danger explícito de Tilt ou Sequência Colossal
            if (!hasRevenge && !hasDrawdown && !hasDanger) noTiltStreak++;
            else noTiltActive = false;
        }

        // --- 3. Discipline Streak --- (Foco em Regras de Risco Gerais)
        if (disciplineActive) {
            // "sem violação crítica, sem insight danger. review apenas como reforço leve"
            if (!hasDanger) disciplineStreak++;
            else disciplineActive = false;
        }

        // --- 4. Emotional Control Streak (Novo) ---
        if (emotionalActive) {
            let hasCriticalEmotion = false;
            for (const t of day.trades) {
                if (t.entry_emotional_state_id) {
                    const es = deps.getEmotionalState(t.entry_emotional_state_id);
                    // Consideramos crítico se for Negative e ter Peso >= 50
                    if (es && es.impact === 'Negative' && es.weight >= 50) {
                        hasCriticalEmotion = true;
                    }
                }
            }

            // Streak de emoção saudável ou neutra. Quebra por sentimento negativo forte.
            if (!hasCriticalEmotion) emotionalControlStreak++;
            else emotionalActive = false;
        }

        if (!greenActive && !disciplineActive && !noTiltActive && !emotionalActive) break;
    }

    return { greenStreak, disciplineStreak, noTiltStreak, emotionalControlStreak };
}

/**
 * ROLLING SCORE (Últimos 30 Trades)
 * Evita que o Histórico de 5 meses atrás condene o trader na Dashboard hoje.
 */
export function calculateRollingScore(
    trades: Trade[], 
    reviews: DailyReview[], 
    deps: TradeConversionDeps
): TraderScoreStats {
    // 1. Isolar os últimos 30 trades (chronologically descending)
    const sorted = [...trades].sort((a, b) => {
        const da = parseSafeDate(a.exit_date || a.date).getTime();
        const db = parseSafeDate(b.exit_date || b.date).getTime();
        return db - da;
    });

    const window = sorted.slice(0, 30);
    
    if (window.length === 0) {
        return { score: 100, executionScore: 100, riskScore: 100, behaviorScore: 100, psychoScore: 100, winRate: 0, profitFactor: 0 };
    }

    let wins = 0;
    let totalGain = 0;
    let totalLoss = 0;
    let resultSequence: number[] = [];

    window.forEach(t => {
        const res = deps.getConvertedResult(t);
        resultSequence.push(res);
        if (res > 0) { wins++; totalGain += res; } 
        else if (res < 0) { totalLoss += Math.abs(res); }
    });

    // --- Pilar 1: Execução Financeira (30% do Master Score) --- (Max 100)
    const winRate = (wins / window.length);
    const profitFactor = totalLoss === 0 ? (totalGain > 0 ? 3.0 : 0) : (totalGain / totalLoss);
    // PF 2.0+ is Master. Mapeando WR e PF numa escala de 0-100
    const pfScoreRaw = Math.min((profitFactor / 2.0) * 100, 100);
    const wrScoreRaw = winRate * 100;
    // WR e PF compoem a nota de Execução igualmente
    const executionScore = (wrScoreRaw * 0.4) + (pfScoreRaw * 0.6);

    // Agrupando trades por dias únicos dentro da janela de 30 operações para gerar insights
    const days = groupTradesByDay(window, deps);
    
    // Inicia os Pilares Qualitativos em 100 pontos
    let riskScore = 100;
    let behaviorScore = 100;
    let psychoScore = 100;

    for (const day of days) {
        const baseDate = parseISO(day.date);
        const dayInsights = generateTraderInsights(window, baseDate, deps.getConvertedResult, day.pnl, 0, 0);
        const review = reviews.find(r => r.date === day.date);

        // --- Pilar 2: Constância e Gestão de Risco (30%) ---
        // Violations pesadas (ex: Revenge Trading, Grande Devolutiva, etc) descontam muito
        // Penalidade por Loss acima da média ganha
        if (wins > 0 && totalLoss > 0) {
            const avgWin = totalGain / wins;
            const biggestLossForDay = Math.min(...day.trades.map(t => deps.getConvertedResult(t)));
            if (biggestLossForDay < 0 && Math.abs(biggestLossForDay) > avgWin * 3) {
                riskScore -= 15; // Calda Longa Detectada
            }
        }
        
        // --- Pilar 3: Comportamental Algoritimico (25%) ---
        // Avalia padrões identificados pela Insights Engine
        for (const i of dayInsights) {
            if (i.type === 'danger') {
                riskScore -= 20; // Dangers corroem risco rapidamente
                behaviorScore -= 15;
            } else if (i.type === 'warning') {
                behaviorScore -= 8;
            } else if (i.type === 'positive') {
                behaviorScore += 5;
            }
        }

        // --- Pilar 4: Psicológico e Consciência (15%) ---
        // A) Análise dos Estados Emocionais marcados na entrada de cada trade
        for (const t of day.trades) {
            if (t.entry_emotional_state_id) {
                const es = deps.getEmotionalState(t.entry_emotional_state_id);
                if (es) {
                    if (es.impact === 'Positive') psychoScore += 2;
                    else if (es.impact === 'Negative') {
                        psychoScore -= (es.weight >= 50 ? 8 : 3); // Penalidade moderada ou leve
                    }
                }
            }
        }

        // B) Avaliação do Daily Review (Fator Pós-Mercado)
        if (review) {
            if (review.rating === 'good') psychoScore += 5; // reforço leve
            if (review.rating === 'bad') psychoScore -= 5;  // penalidade leve
        }
    }

    // Normalizing clamp between 0 and 100
    const finalExecution = Math.max(0, Math.min(100, executionScore));
    const finalRisk = Math.max(0, Math.min(100, riskScore));
    const finalBehavior = Math.max(0, Math.min(100, behaviorScore));
    const finalPsycho = Math.max(0, Math.min(100, psychoScore));

    // Master Score
    const masterScore = (finalExecution * 0.30) + (finalRisk * 0.30) + (finalBehavior * 0.25) + (finalPsycho * 0.15);

    return {
        score: Math.max(0, Math.min(100, masterScore)),
        executionScore: finalExecution,
        riskScore: finalRisk,
        behaviorScore: finalBehavior,
        psychoScore: finalPsycho,
        winRate,
        profitFactor
    };
}
