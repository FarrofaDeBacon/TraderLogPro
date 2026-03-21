import type { GamificationStreaks, TraderScoreStats, TradeConversionDeps } from "$lib/domain/stats/gamification-engine";
import type { Trade } from "$lib/types";
import { getLocalDatePart } from "$lib/utils";

export interface MilestoneDef {
    id: string;
    title: string;
    description: string;
    icon: string;       // lucide icon prop
    colorClass: string; // tailwind color classes
}

export const MILESTONES: MilestoneDef[] = [
    {
        id: "first_blood",
        title: "First Blood",
        description: "Deu o primeiro tiro. Registrou seu primeiro trade no diário.",
        icon: "Target",
        colorClass: "text-slate-400 border-slate-500/50 bg-slate-500/10"
    },
    {
        id: "sniper",
        title: "Sniper",
        description: "Precisão absoluta. Fechou um dia de ganho fazendo apenas 1 operação.",
        icon: "Crosshair",
        colorClass: "text-emerald-500 border-emerald-500/50 bg-emerald-500/10"
    },
    {
        id: "iron_discipline",
        title: "Iron Discipline",
        description: "Máquina fria. Atingiu 5 dias seguidos respeitando rigorosamente o limite de perda e plano.",
        icon: "ShieldCheck",
        colorClass: "text-indigo-500 border-indigo-500/50 bg-indigo-500/10"
    },
    {
        id: "consistency_master",
        title: "Master of Consistency",
        description: "Sobrevivente nato. Alcançou 10 dias consecutivos de lucro (Green Streak).",
        icon: "Trophy",
        colorClass: "text-amber-500 border-amber-500/50 bg-amber-500/10"
    },
    {
        id: "zen_trader",
        title: "Zen Trader",
        description: "Mente blindada. Comportamento ilibado garantindo a No-Tilt streak por 5 ou mais dias.",
        icon: "Brain",
        colorClass: "text-cyan-500 border-cyan-500/50 bg-cyan-500/10"
    },
    {
        id: "risk_manager",
        title: "Risk Elite",
        description: "Estatística a favor. Win Rate > 40% e Profit Factor > 2.0 nos últimos 30 trades.",
        icon: "TrendingUp",
        colorClass: "text-fuchsia-500 border-fuchsia-500/50 bg-fuchsia-500/10"
    }
];

export function checkUnlockedMilestones(
    trades: Trade[],
    streaks: GamificationStreaks,
    scoreStats: TraderScoreStats,
    deps: TradeConversionDeps
): string[] {
    const unlocked: string[] = [];
    if (trades.length === 0) return unlocked;

    // 1. First Blood
    unlocked.push("first_blood");

    // 2. Sniper
    // Checar se existe algum dia com exatamente 1 trade e PnL > 0
    const dayMap = new Map<string, { count: number, pnl: number }>();
    for (const t of trades) {
        const dStr = getLocalDatePart(t.exit_date || t.date);
        const current = dayMap.get(dStr) || { count: 0, pnl: 0 };
        current.count++;
        current.pnl += deps.getConvertedResult(t);
        dayMap.set(dStr, current);
    }

    let hasSniper = false;
    for (const [_, data] of dayMap.entries()) {
        if (data.count === 1 && data.pnl > 0) {
            hasSniper = true;
            break;
        }
    }
    if (hasSniper) unlocked.push("sniper");

    // 3. Iron Discipline
    if (streaks.disciplineStreak >= 5) unlocked.push("iron_discipline");

    // 4. Consistency Master
    if (streaks.greenStreak >= 10) unlocked.push("consistency_master");

    // 5. Zen Trader
    if (streaks.noTiltStreak >= 5) unlocked.push("zen_trader");

    // 6. Risk Elite
    if (scoreStats.winRate >= 40 && scoreStats.profitFactor >= 2.0) unlocked.push("risk_manager");

    return unlocked;
}
