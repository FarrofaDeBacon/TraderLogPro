import { parseISO, isSameDay, differenceInDays } from "date-fns";
import type { Trade } from "$lib/types";
import { getTradeViewModel } from "$lib/domain/trades/trade-engine";
import type { DailyReview } from "$lib/stores/daily-reviews.svelte";
import { generateTraderInsights } from "$lib/domain/insights/insights-engine";
import { getLocalDatePart, parseSafeDate } from "$lib/utils";

export interface GamificationStreaks {
    greenStreak: number;
    disciplineStreak: number;
    noTiltStreak: number;
}

export interface TraderScoreStats {
    score: number;       // 0-100
    winRate: number;     // 0-100%
    profitFactor: number; // Ratio
    consistency: number;  // 0-100%
}

export interface TradeConversionDeps {
    getConvertedResult: (t: Trade) => number;
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
    if (recentTrades.length === 0) return { greenStreak: 0, disciplineStreak: 0, noTiltStreak: 0 };

    const days = groupTradesByDay(recentTrades, deps);
    
    let greenStreak = 0;
    let disciplineStreak = 0;
    let noTiltStreak = 0;

    let greenActive = true;
    let disciplineActive = true;
    let noTiltActive = true;

    for (const day of days) {
        // --- 1. Green Streak ---
        if (greenActive) {
            if (day.pnl > 0) greenStreak++;
            else if (day.pnl < 0) greenActive = false; // Zero pnl (breakeven) doesn't break nor increase
        }

        // --- 2. No-Tilt Streak ---
        if (noTiltActive) {
            // Reconstruct insights for that day to see if there was DANGER (like Revenge Trading)
            const baseDate = parseISO(day.date);
            const rawInsights = generateTraderInsights(recentTrades, baseDate, deps.getConvertedResult, day.pnl, 0, 0);
            const hasDanger = rawInsights.some(i => i.type === 'danger');
            
            if (!hasDanger) noTiltStreak++;
            else noTiltActive = false;
        }

        // --- 3. Discipline Streak ---
        if (disciplineActive) {
            // Disciplina exige que:
            // - Não estourou um loss colossal impensado (Poderíamos usar PnL max_loss, mas vamos usar Daily Review + Sem Danger)
            const review = reviews.find(r => r.date === day.date);
            const rawInsights = generateTraderInsights(recentTrades, parseISO(day.date), deps.getConvertedResult, day.pnl, 0, 0);
            const hasDanger = rawInsights.some(i => i.type === 'danger');

            // Se o cara mentiu na Review dizendo "Bom" mas a engine pegou Danger, ele quebrou a disciplina.
            if (hasDanger) {
                disciplineActive = false;
            } else if (review && review.rating === 'bad') {
                disciplineActive = false;
            } else {
                disciplineStreak++;
            }
        }

        // Se todos foram quebrados, não precisa retroceder mais na história
        if (!greenActive && !disciplineActive && !noTiltActive) break;
    }

    return { greenStreak, disciplineStreak, noTiltStreak };
}

/**
 * ROLLING SCORE (Últimos 30 Trades)
 * Evita que o Histórico de 5 meses atrás condene o trader na Dashboard hoje.
 */
export function calculateRollingScore(trades: Trade[], deps: TradeConversionDeps): TraderScoreStats {
    // 1. Isolar os últimos 30 trades (chronologically descending)
    const sorted = [...trades].sort((a, b) => {
        const da = parseSafeDate(a.exit_date || a.date).getTime();
        const db = parseSafeDate(b.exit_date || b.date).getTime();
        return db - da;
    });

    const window = sorted.slice(0, 30);
    
    if (window.length === 0) {
        return { score: 100, winRate: 0, profitFactor: 0, consistency: 100 };
    }

    let wins = 0;
    let totalGain = 0;
    let totalLoss = 0;
    let resultSequence: number[] = [];

    window.forEach(t => {
        const res = deps.getConvertedResult(t);
        resultSequence.push(res);
        if (res > 0) {
            wins++;
            totalGain += res;
        } else if (res < 0) {
            totalLoss += Math.abs(res);
        }
    });

    // --- A. Win Rate (30%) ---
    const winRate = (wins / window.length) * 100;

    // --- B. Profit Factor (40%) ---
    const profitFactor = totalLoss === 0 ? (totalGain > 0 ? 3.0 : 0) : (totalGain / totalLoss);
    // Normalizing PF up to 3.0. PF 2.0+ is Master.
    // Score PF = Min((PF / 2.0), 1) * 100
    const pfScore = Math.min((profitFactor / 2.0) * 100, 100);

    // --- C. Consistency (30%) ---
    // Uma consistência pura é não ter um "Outlier Loss" que destrói a média.
    let consistency = 100;
    if (wins > 0 && totalLoss > 0) {
        const avgWin = totalGain / wins;
        const biggestLoss = Math.min(...resultSequence); // lowest negative number
        if (biggestLoss < 0 && Math.abs(biggestLoss) > avgWin * 3) {
            // Penalty se teve UM trade que perdeu 3x mais que a média de ganho (Falha de controle de cauda)
            consistency -= 40;
        }
        if (Math.abs(biggestLoss) > avgWin * 5) {
            consistency -= 30; // Destruição de conta
        }
    }

    consistency = Math.max(0, consistency);

    // Formando o Master Score (0.3 WR) + (0.4 PF) + (0.3 Constância)
    const score = (winRate * 0.3) + (pfScore * 0.4) + (consistency * 0.3);

    return {
        score: Math.min(Math.max(score, 0), 100),
        winRate,
        profitFactor,
        consistency
    };
}
