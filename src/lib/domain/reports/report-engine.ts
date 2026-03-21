import type { Trade } from "$lib/types";
import type { DailyReview } from "$lib/stores/daily-reviews.svelte";
import { getScoreBreakdown, calculateStreaks, type TradeConversionDeps } from "../stats/gamification-engine";
import { parseSafeDate, getLocalDatePart } from "$lib/utils";

export interface ReportPeriod {
    from: string;
    to: string;
    daysActive: number;
}

export interface ReportSummary {
    totalPnL: number;
    tradeCount: number;
    winRate: number;
    profitFactor: number;
    biggestWin: number;
    biggestLoss: number;
}

export interface ReportScoreAndDiscipline {
    windowScore: number;
    executionScore: number;
    riskScore: number;
    behaviorScore: number;
    psychoScore: number;
    streaks: {
        discipline: number;
        noTilt: number;
        emotionalControl: number;
        green: number;
    };
}

export interface ReportBehavior {
    topPositiveImpacts: { title: string; description: string; points: number }[];
    topNegativeImpacts: { title: string; description: string; points: number }[];
}

export interface ReportReflection {
    reviewCount: number;
    distribution: {
        good: number;
        neutral: number;
        bad: number;
    };
    relevantNotes: string[];
}

export interface ReportViewModel {
    period: ReportPeriod;
    summary: ReportSummary;
    scoreAndDiscipline: ReportScoreAndDiscipline;
    behavior: ReportBehavior;
    reflection: ReportReflection;
}

export function generateReport(
    trades: Trade[],
    reviews: DailyReview[],
    fromDate: Date,
    toDate: Date,
    deps: TradeConversionDeps
): ReportViewModel {
    // 1. Filtrar Entidades pelo Período
    const filteredTrades = trades.filter(t => {
        const d = parseSafeDate(t.exit_date || t.date);
        return d >= fromDate && d <= toDate;
    });

    const filteredReviews = reviews.filter(r => {
        const d = parseSafeDate(r.date);
        return d >= fromDate && d <= toDate;
    });

    // --- Resumo Financeiro ---
    let wins = 0;
    let totalGain = 0;
    let totalLoss = 0;
    let biggestWin = 0;
    let biggestLoss = 0;
    const activeDays = new Set<string>();

    filteredTrades.forEach(t => {
        const res = deps.getConvertedResult(t);
        activeDays.add(getLocalDatePart(t.exit_date || t.date!));
        
        if (res > 0) {
            wins++;
            totalGain += res;
            if (res > biggestWin) biggestWin = res;
        } else if (res < 0) {
            totalLoss += Math.abs(res);
            if (res < biggestLoss) biggestLoss = res;
        }
    });

    const tradeCount = filteredTrades.length;
    const winRate = tradeCount > 0 ? (wins / tradeCount) : 0;
    const profitFactor = totalLoss === 0 ? (totalGain > 0 ? 3.0 : 0) : (totalGain / totalLoss);
    const totalPnL = totalGain - totalLoss;

    // --- Gamification da Janela ---
    // Reaproveitando Engines Intactas (Score e Streaks avaliados sob o contexto da janela)
    const breakdown = getScoreBreakdown(filteredTrades, filteredReviews, deps);
    const windowStreaks = calculateStreaks(filteredTrades, filteredReviews, deps);

    // --- Comportamento ---
    const topPositiveImpacts = breakdown.impacts.filter(i => i.points > 0).slice(0, 3);
    const topNegativeImpacts = breakdown.impacts.filter(i => i.points < 0).slice(0, 3); // top penalties

    // --- Reflexão ---
    let good = 0, neutral = 0, bad = 0;
    const relevantNotes: string[] = [];

    // Priorizar extrair notas dos piores ou melhores dias
    const reviewsWithNotes = [...filteredReviews].filter(r => r.notes && r.notes.trim().length > 5);
    
    filteredReviews.forEach(r => {
        if (r.rating === 'good') good++;
        else if (r.rating === 'bad') bad++;
        else neutral++;
    });

    // Pega as 2 observações mais relevantes (ex: de dias ruins para aprendizado, ou dias em que preencheu bastante texto)
    if (reviewsWithNotes.length > 0) {
        // Sort by text length descending or prioritze 'bad' ratings
        reviewsWithNotes.sort((a, b) => {
            if (a.rating === 'bad' && b.rating !== 'bad') return -1;
            if (a.rating !== 'bad' && b.rating === 'bad') return 1;
            return b.notes!.length - a.notes!.length;
        });
        
        relevantNotes.push(reviewsWithNotes[0].notes!);
        if (reviewsWithNotes.length > 1) {
            relevantNotes.push(reviewsWithNotes[1].notes!);
        }
    }

    return {
        period: {
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
            daysActive: activeDays.size
        },
        summary: {
            totalPnL,
            tradeCount,
            winRate,
            profitFactor,
            biggestWin,
            biggestLoss
        },
        scoreAndDiscipline: {
            windowScore: breakdown.stats.score,
            executionScore: breakdown.stats.executionScore,
            riskScore: breakdown.stats.riskScore,
            behaviorScore: breakdown.stats.behaviorScore,
            psychoScore: breakdown.stats.psychoScore,
            streaks: {
                discipline: windowStreaks.disciplineStreak,
                noTilt: windowStreaks.noTiltStreak,
                emotionalControl: windowStreaks.emotionalControlStreak,
                green: windowStreaks.greenStreak
            }
        },
        behavior: {
            topPositiveImpacts,
            topNegativeImpacts
        },
        reflection: {
            reviewCount: filteredReviews.length,
            distribution: { good, neutral, bad },
            relevantNotes
        }
    };
}
