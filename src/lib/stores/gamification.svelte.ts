import { tradesStore } from "$lib/stores/trades.svelte";
import { accountsStore } from "$lib/stores/accounts.svelte";
import { currenciesStore } from "$lib/stores/currencies.svelte";
import { dailyReviewsStore } from "$lib/stores/daily-reviews.svelte";
import { workspaceStore } from "$lib/stores/workspace.svelte";
import { calculateStreaks, getScoreBreakdown, type GamificationStreaks, type TraderScoreStats, type ScoreBreakdown } from "$lib/domain/stats/gamification-engine";
import { getProactiveSignals, type ProactiveSignal } from "$lib/domain/insights/behavioral-assistant-engine";
import { checkUnlockedMilestones } from "$lib/domain/stats/milestones";

class GamificationStore {
    // Derivamos reativamente os dados sempre que trades ou reviews mudarem
    get streaks(): GamificationStreaks {
        if (!tradesStore.trades || tradesStore.trades.length === 0) {
            return { greenStreak: 0, disciplineStreak: 0, noTiltStreak: 0, emotionalControlStreak: 0 };
        }

        return calculateStreaks(
            tradesStore.trades, 
            dailyReviewsStore.reviews, 
            { 
                getConvertedResult: (t: any) => tradesStore.getConvertedTradeResult(t, accountsStore.accounts, currenciesStore.currencies),
                getEmotionalState: (id: string) => workspaceStore.emotionalStates.find(e => e.id === id)
            }
        );
    }

    get scoreBreakdown(): ScoreBreakdown {
        if (!tradesStore.trades || tradesStore.trades.length === 0) {
            return {
                stats: { score: 100, executionScore: 100, riskScore: 100, behaviorScore: 100, psychoScore: 100, winRate: 0, profitFactor: 0 },
                impacts: [],
                recommendations: ["Sem dados suficientes. Faça sua primeira operação para gerar o Breakdown."]
            };
        }

        return getScoreBreakdown(
            tradesStore.trades, 
            dailyReviewsStore.reviews,
            { 
                getConvertedResult: (t: any) => tradesStore.getConvertedTradeResult(t, accountsStore.accounts, currenciesStore.currencies),
                getEmotionalState: (id: string) => workspaceStore.emotionalStates.find(e => e.id === id)
            }
        );
    }

    get scoreStats(): TraderScoreStats {
        return this.scoreBreakdown.stats;
    }

    get unlockedMilestones(): string[] {
        if (!tradesStore.trades || tradesStore.trades.length === 0) return [];
        
        return checkUnlockedMilestones(
            tradesStore.trades,
            this.streaks,
            this.scoreStats,
            { 
                getConvertedResult: (t: any) => tradesStore.getConvertedTradeResult(t, accountsStore.accounts, currenciesStore.currencies),
                getEmotionalState: (id: string) => workspaceStore.emotionalStates.find(e => e.id === id)
            }
        );
    }

    get proactiveSignals(): ProactiveSignal[] {
        if (!tradesStore.trades || tradesStore.trades.length === 0) return [];
        return getProactiveSignals({
            trades: tradesStore.trades,
            breakdown: this.scoreBreakdown,
            streaks: this.streaks
        });
    }
}

export const gamificationStore = new GamificationStore();
