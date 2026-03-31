<script lang="ts">
    import * as Sheet from "$lib/components/ui/sheet";
    import { Button } from "$lib/components/ui/button";
    import { Textarea } from "$lib/components/ui/textarea";
    import { tradesStore } from "$lib/stores/trades.svelte";
    import { dailyReviewsStore, type DailyRating } from "$lib/stores/daily-reviews.svelte";
    import { generateTraderInsights } from "$lib/domain/insights/insights-engine";
    import { parseISO, isSameDay } from "date-fns";
    import { Briefcase, TrendingUp, TrendingDown, Trophy, AlertTriangle, CheckCircle2 } from "lucide-svelte";
    import { t } from "svelte-i18n";
    import { toast } from "svelte-sonner";
    import { formatCurrency } from "$lib/utils";
    import { accountsStore } from "$lib/stores/accounts.svelte";
    import { currenciesStore } from "$lib/stores/currencies.svelte";
    import { gamificationStore } from "$lib/stores/gamification.svelte";

    let { open = $bindable(false), date } = $props<{
        open: boolean;
        date: string;
    }>();

    let rating = $state<DailyRating | null>(null);
    let notes = $state("");

    // Load existing review when opened
    $effect(() => {
        if (open && date) {
            const existing = dailyReviewsStore.getReviewForDate(date);
            if (existing) {
                rating = existing.rating;
                notes = existing.notes;
            } else {
                rating = null;
                notes = "";
            }
        }
    });

    let dayTrades = $derived(tradesStore.trades.filter(t => {
        try {
            return isSameDay(parseISO(t.exit_date || t.date), parseISO(date));
        } catch { return false; }
    }));

    let dayResults = $derived(dayTrades.map(t => {
        const result = tradesStore.getConvertedTradeResult(t, accountsStore.accounts, currenciesStore.currencies);
        return { trade: t, result };
    }));

    let totalPnL = $derived(dayResults.reduce((sum, item) => sum + item.result, 0));
    let winCount = $derived(dayResults.filter(r => r.result > 0).length);
    let lossCount = $derived(dayResults.filter(r => r.result < 0).length);
    let bestTrade = $derived(dayResults.length > 0 ? Math.max(...dayResults.map(r => r.result)) : 0);
    let worstTrade = $derived(dayResults.length > 0 ? Math.min(...dayResults.map(r => r.result)) : 0);

    let insights = $derived.by(() => {
        if (dayTrades.length === 0) return [];
        const baseDate = parseISO(date);
        const convertFn = (t: any) => tradesStore.getConvertedTradeResult(t, accountsStore.accounts, currenciesStore.currencies);
        // Mocking week stats as 0 since we only want internal daily behaviors (Tilt, Pareto, Giveback)
        const rawInsights = generateTraderInsights(tradesStore.trades, baseDate, convertFn, totalPnL, 0, 0);
        return rawInsights.slice(0, 2); // Max 2 insights as requested
    });

    function saveReview() {
        if (!rating) {
            toast.error($t("reports.daily.toasts.rateFirst"));
            return;
        }

        const streakBefore = gamificationStore.streaks.disciplineStreak;
        
        dailyReviewsStore.saveReview(date, rating, notes);

        const streakAfter = gamificationStore.streaks.disciplineStreak;

        if (streakAfter > streakBefore && streakAfter >= 2) {
            toast.success($t("reports.daily.toasts.shieldWall", { values: { days: streakAfter } }));
        } else if (streakAfter === 0 && streakBefore > 0) {
            toast.error($t("reports.daily.toasts.streakBroken"));
        } else {
            toast.success($t("reports.daily.toasts.saveSuccess"));
        }
        
        open = false;
    }
</script>

<Sheet.Root bind:open>
    <Sheet.Content class="glass border-white/10 text-white w-full sm:max-w-md overflow-y-auto z-[100]">
        <Sheet.Header class="mb-6 mt-4">
            <Sheet.Title class="text-xl font-black tracking-widest text-white uppercase flex items-center gap-2">
                <Briefcase class="w-5 h-5 text-primary" />
                {$t("reports.daily.title")}
            </Sheet.Title>
            <Sheet.Description class="text-xs text-muted-foreground/80 font-medium tracking-wide">
                {$t("reports.daily.subtitle")}
            </Sheet.Description>
        </Sheet.Header>

        {#if dayTrades.length === 0}
            <div class="h-40 flex items-center justify-center text-muted-foreground text-sm font-medium border border-dashed border-white/10 rounded-xl">
                {$t("reports.daily.empty")}
            </div>
        {:else}
            <div class="space-y-6">
                <!-- Resumo Financeiro -->
                <div class="grid grid-cols-2 gap-3">
                    <div class="p-4 rounded-xl bg-zinc-900/60 border border-white/5 space-y-1">
                        <span class="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{$t("reports.daily.sections.summary")}</span>
                        <div class="text-2xl font-black {totalPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'} tabular-nums">
                            {formatCurrency(totalPnL, accountsStore.accounts[0]?.currency || "BRL")}
                        </div>
                    </div>
                    <div class="p-4 rounded-xl bg-zinc-900/60 border border-white/5 space-y-1">
                        <span class="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{$t("reports.daily.sections.stats")}</span>
                        <div class="text-2xl font-black text-white tabular-nums flex items-baseline gap-2">
                            {dayTrades.length} 
                            <span class="text-[10px] text-muted-foreground font-bold tracking-widest">({winCount}W {lossCount}L)</span>
                        </div>
                    </div>
                    <div class="p-3 rounded-lg bg-zinc-900/40 border-l-[3px] border-l-emerald-500/50 space-y-0.5">
                        <span class="text-[8px] font-black text-muted-foreground/80 uppercase tracking-widest flex items-center gap-1"><TrendingUp class="w-2.5 h-2.5"/> {$t("reports.daily.sections.best")}</span>
                        <div class="text-xs font-bold text-emerald-500">{formatCurrency(bestTrade, accountsStore.accounts[0]?.currency || "BRL")}</div>
                    </div>
                    <div class="p-3 rounded-lg bg-zinc-900/40 border-l-[3px] border-l-rose-500/50 space-y-0.5">
                        <span class="text-[8px] font-black text-muted-foreground/80 uppercase tracking-widest flex items-center gap-1"><TrendingDown class="w-2.5 h-2.5"/> {$t("reports.daily.sections.worst")}</span>
                        <div class="text-xs font-bold text-rose-500">{formatCurrency(worstTrade, accountsStore.accounts[0]?.currency || "BRL")}</div>
                    </div>
                </div>

                <!-- Insights Comportamentais -->
                {#if insights.length > 0}
                    <div class="space-y-2.5">
                        <h4 class="text-[9px] font-black tracking-widest text-muted-foreground uppercase ml-1">{$t("reports.daily.sections.behavioral")}</h4>
                        <div class="space-y-2">
                            {#each insights as insight}
                                <div class="p-3 rounded-lg border shadow-sm flex gap-3 {insight.type === 'danger' ? 'bg-rose-500/5 border-rose-500/20' : insight.type === 'warning' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}">
                                    <div class="mt-0.5 shrink-0">
                                        {#if insight.type === 'positive'} <Trophy class="w-4 h-4 text-emerald-500" />
                                        {:else if insight.type === 'warning'} <AlertTriangle class="w-4 h-4 text-amber-500" />
                                        {:else} <AlertTriangle class="w-4 h-4 text-rose-500" /> {/if}
                                    </div>
                                    <div>
                                        <h5 class="text-[11px] font-black tracking-wide {insight.type === 'danger' ? 'text-rose-500' : insight.type === 'warning' ? 'text-amber-500' : 'text-emerald-500'}">{insight.title}</h5>
                                        <p class="text-[10px] text-muted-foreground opacity-90 mt-0.5 leading-relaxed font-medium">{insight.description}</p>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}

                <!-- Avaliação Subjetiva (Sentimento) -->
                <div class="space-y-3 pt-4 border-t border-white/5">
                    <h4 class="text-[9px] font-black tracking-widest text-muted-foreground uppercase ml-1">{$t("reports.daily.sections.selfEvaluation")}</h4>
                    <div class="flex gap-2">
                        <button type="button" onclick={() => rating = "good"} class="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border transition-all {rating === 'good' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 scale-[1.02] shadow-sm' : 'bg-zinc-900/50 border-white/5 text-muted-foreground hover:bg-zinc-800'}">
                            <span class="text-2xl drop-shadow-md">👍</span>
                            <span class="text-[9px] font-black uppercase tracking-widest">{$t("reports.daily.ratings.good")}</span>
                        </button>
                        <button type="button" onclick={() => rating = "neutral"} class="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border transition-all {rating === 'neutral' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400 scale-[1.02] shadow-sm' : 'bg-zinc-900/50 border-white/5 text-muted-foreground hover:bg-zinc-800'}">
                            <span class="text-2xl drop-shadow-md">😐</span>
                            <span class="text-[9px] font-black uppercase tracking-widest">{$t("reports.daily.ratings.neutral")}</span>
                        </button>
                        <button type="button" onclick={() => rating = "bad"} class="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border transition-all {rating === 'bad' ? 'bg-rose-500/10 border-rose-500/50 text-rose-400 scale-[1.02] shadow-sm' : 'bg-zinc-900/50 border-white/5 text-muted-foreground hover:bg-zinc-800'}">
                            <span class="text-2xl drop-shadow-md">👎</span>
                            <span class="text-[9px] font-black uppercase tracking-widest">{$t("reports.daily.ratings.bad")}</span>
                        </button>
                    </div>

                    <Textarea bind:value={notes} placeholder={$t("reports.daily.ratings.placeholder")} class="bg-zinc-900/50 border-white/10 resize-none h-20 text-xs mt-2 rounded-xl focus:border-primary/50" />
                </div>

                <Button class="w-full gap-2 font-black tracking-widest uppercase text-[10px] h-11 mt-4" onclick={saveReview}>
                    <CheckCircle2 class="w-4 h-4" />
                    {$t("reports.daily.actions.save")}
                </Button>
            </div>
        {/if}
    </Sheet.Content>
</Sheet.Root>
