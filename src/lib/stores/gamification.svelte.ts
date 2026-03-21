import { tradesStore } from "$lib/stores/trades.svelte";
import { accountsStore } from "$lib/stores/accounts.svelte";
import { currenciesStore } from "$lib/stores/currencies.svelte";
import { dailyReviewsStore } from "$lib/stores/daily-reviews.svelte";
import { workspaceStore } from "$lib/stores/workspace.svelte";
import { calculateStreaks, calculateRollingScore, type GamificationStreaks, type TraderScoreStats } from "$lib/domain/stats/gamification-engine";
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

    get scoreStats(): TraderScoreStats {
        if (!tradesStore.trades || tradesStore.trades.length === 0) {
            return { score: 100, executionScore: 100, riskScore: 100, behaviorScore: 100, psychoScore: 100, winRate: 0, profitFactor: 0 };
        }

        return calculateRollingScore(
            tradesStore.trades, 
            dailyReviewsStore.reviews,
            { 
                getConvertedResult: (t: any) => tradesStore.getConvertedTradeResult(t, accountsStore.accounts, currenciesStore.currencies),
                getEmotionalState: (id: string) => workspaceStore.emotionalStates.find(e => e.id === id)
            }
        );
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
}

export const gamificationStore = new GamificationStore();
