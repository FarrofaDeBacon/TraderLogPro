<script lang="ts">
  import { accountsStore } from "$lib/stores/accounts.svelte";
    import { t, locale } from "svelte-i18n";
    import { appStore } from "$lib/stores/app.svelte";
    import { financialConfigStore } from "$lib/stores/financial-config.svelte";
    import { workspaceStore } from "$lib/stores/workspace.svelte";
    import { tradesStore } from "$lib/stores/trades.svelte";
    import * as Card from "$lib/components/ui/card";
    import { Badge } from "$lib/components/ui/badge";
    import { Separator } from "$lib/components/ui/separator";
    import HierarchicalList from "$lib/components/shared/HierarchicalList.svelte";
    import * as Select from "$lib/components/ui/select";
    import EChart from "$lib/components/ui/echart.svelte";
    import * as echarts from "echarts";
    import {
        Brain,
        TrendingUp,
        TrendingDown,
        CheckCircle2,
        AlertTriangle,
        Calendar,
        Eye,
        ChevronDown,
        Trash2,
        Info,
        MinusCircle,
        Sparkles,
        ArrowRight,
        Loader2,
        RefreshCw,
        Layers
    } from "lucide-svelte";
    import { llmService } from "$lib/services/llmService";
    import { integrationsStore } from "$lib/stores/integrations.svelte";

    import { Button } from "$lib/components/ui/button";
    import DailyCheckinDialog from "$lib/components/psychology/DailyCheckinDialog.svelte";
    import PsychologyAICard from "$lib/components/psychology/PsychologyAICard.svelte";
    import PsychologyHeader from "$lib/components/psychology/PsychologyHeader.svelte";
    import PsychologyStatsGrid from "$lib/components/psychology/PsychologyStatsGrid.svelte";
    import { SystemCard, SystemHeader } from "$lib/components/ui/system";
    import DateFilter from "$lib/components/filters/DateFilter.svelte";
    import { toast } from "svelte-sonner";
    import * as Dialog from "$lib/components/ui/dialog";
    import DeleteConfirmationModal from "$lib/components/settings/DeleteConfirmationModal.svelte";
    import { invoke } from "@tauri-apps/api/core";
    import { untrack } from "svelte";
    import { getLocalDatePart } from "$lib/utils";
    import type { Trade } from "$lib/types";
    import { analyzePsychology } from "$lib/domain/stats/psychology-engine";

    let showCheckinDialog = $state(false);
    let showDeleteConfirm = $state(false);
    let entryToDelete = $state<string | null>(null);
    let showDayModal = $state(false);
    let selectedDayData = $state<any>(null);
    let selectedCurrency = $state<string | null>(null);
    let showInsightModal = $state(false);
    let insightData = $state<{
        label: string;
        avgWeight: number;
        equivalentState: any;
        items: any[];
    } | null>(null);

    function openDayDetails(day: any, currency: string | null = null) {
        selectedDayData = day;
        selectedCurrency = currency;
        showDayModal = true;
    }

    let isDeleteWithClosureOpen = $state(false);
    let associatedClosureIds: string[] = [];

    function requestDeleteJournal(id: string) {
        entryToDelete = id;
        const entry = workspaceStore.journalEntries.find((j) => j.id === id);
        if (entry) {
            // Check if there are daily closures associated with this date
            const dateStr = entry.date.split("T")[0];
            const closures = financialConfigStore.cashTransactions.filter(
                (t) =>
                    t.id.includes("daily_closure_") &&
                    getLocalDatePart(t.date) === dateStr,
            );

            if (closures.length > 0) {
                associatedClosureIds = closures.map((c) => c.id);
                isDeleteWithClosureOpen = true;
                return;
            }
        }
        showDeleteConfirm = true;
    }

    async function confirmDeleteJournalWithClosure(deleteClosures: boolean) {
        if (entryToDelete) {
            const result =
                await workspaceStore.deleteJournalEntry(entryToDelete);
            if (result && result.success === false) {
                toast.error("Erro ao excluir o registro: " + result.error);
            } else {
                if (deleteClosures && associatedClosureIds.length > 0) {
                    let hasError = false;
                    for (const cid of associatedClosureIds) {
                        const cres =
                            await financialConfigStore.removeCashTransaction(cid);
                        if (!cres.success) hasError = true;
                    }
                    if (hasError) {
                        toast.error(
                            "Registro psicológico removido, mas houve erro ao remover o(s) fechamento(s) financeiro(s).",
                        );
                    } else {
                        toast.success(
                            $t("common.deleteSuccess") ||
                                "Removido com sucesso",
                        );
                    }
                } else {
                    toast.success(
                        $t("common.deleteSuccess") ||
                            "Registro removido com sucesso",
                    );
                }
            }
            entryToDelete = null;
            associatedClosureIds = [];
            isDeleteWithClosureOpen = false;
        }
    }

    async function confirmDeleteJournal() {
        if (entryToDelete) {
            const result =
                await workspaceStore.deleteJournalEntry(entryToDelete);
            if (result && result.success === false) {
                toast.error("Erro ao excluir: " + result.error);
            } else {
                toast.success(
                    $t("common.deleteSuccess") ||
                        "Registro removido com sucesso",
                );
            }
            entryToDelete = null;
        }
    }

    function openInsight(data: any) {
        // Collect all trades and journals from levels (Month/Week/Day)
        const items: any[] = [];
        const processLevel = (lvl: any) => {
            if (lvl.trades) items.push(...lvl.trades);
            if (lvl.journalEntries) items.push(...lvl.journalEntries);
            if (lvl.weeks) {
                const weeksList =
                    lvl.weeks instanceof Map
                        ? Array.from(lvl.weeks.values())
                        : Object.values(lvl.weeks || {});
                for (const w of weeksList) processLevel(w);
            }
            if (lvl.days) {
                for (const d of lvl.days) processLevel(d);
            }
        };
        processLevel(data);

        insightData = {
            label: data.label || "Detalhes do Cálculo",
            avgWeight: data.avgWeight,
            equivalentState: data.equivalentState,
            items,
        };
        showInsightModal = true;
    }

    // Filters
    let timeFilter = $state("all");
    let startDate = $state("");
    let endDate = $state("");
    let itemsLimit = $state("10"); // "10", "20", "50", "all"
    let groupBy = $state("day"); // "day", "week", "month"

    // --- Derived Data ---

    // Optimized filter limits
    const filterLimits = $derived.by(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const todayStr = now.toISOString().split("T")[0];
        const yesterdayStr = new Date(now.getTime() - 86400000)
            .toISOString()
            .split("T")[0];
        const thisMonthStr = now.toISOString().slice(0, 7); // YYYY-MM

        return {
            today: todayStr,
            yesterday: yesterdayStr,
            thisMonth: thisMonthStr,
            customStart: startDate ? new Date(startDate) : null,
            customEnd: endDate ? new Date(endDate) : null,
        };
    });

    function isDateInRange(dateStr: string) {
        if (timeFilter === "all") return true;
        const onlyDate = dateStr.split("T")[0];

        if (timeFilter === "today") return onlyDate === filterLimits.today;
        if (timeFilter === "yesterday")
            return onlyDate === filterLimits.yesterday;
        if (timeFilter === "this_month")
            return onlyDate.startsWith(filterLimits.thisMonth);
        if (
            timeFilter === "custom" &&
            filterLimits.customStart &&
            filterLimits.customEnd
        ) {
            const d = new Date(onlyDate + "T12:00:00");
            return d >= filterLimits.customStart && d <= filterLimits.customEnd;
        }
        return true;
    }

    const filteredTrades = $derived(
        tradesStore.trades.filter((t) => isDateInRange(t.date)),
    );
    const filteredJournal = $derived(
        workspaceStore.journalEntries.filter((j) => isDateInRange(j.date)),
    );
    const emotionalStates = $derived(workspaceStore.emotionalStates);

    function getAdjustedWeight(
        stateId: string,
        intensity: number,
        statesMap: Map<string, any>,
    ) {
        const state = statesMap.get(stateId);
        if (!state) return 5;
        // Impact-based weight normalization
        if (state.impact === "Positive") return 5 + intensity / 2; // 5 to 10
        if (state.impact === "Negative") return 5 - intensity / 2; // 0 to 5
        return 5;
    }

    function calculateAverageEmotion(
        tradesList: any[],
        journalList: any[],
        statesMap: Map<string, any>,
    ) {
        let globalScoreSum = 0;
        let itemCount = 0;

        for (const trade of tradesList) {
            const entryState = trade.entry_emotional_state_id
                ? statesMap.get(trade.entry_emotional_state_id)
                : null;
            const exitState = trade.exit_emotional_state_id
                ? statesMap.get(trade.exit_emotional_state_id)
                : null;

            let tradeScore = 0;
            let count = 0;

            if (entryState) {
                tradeScore += entryState.weight ?? 5;
                count++;
            }
            if (exitState) {
                tradeScore += exitState.weight ?? 5;
                count++;
            }

            if (count > 0) {
                const finalTradeScore = tradeScore / count;
                globalScoreSum += finalTradeScore;
                itemCount++;
            }
        }

        for (const j of journalList) {
            if (j.emotional_state_id) {
                const state = statesMap.get(j.emotional_state_id);
                if (state) {
                    const weight = state.weight ?? 5;
                    globalScoreSum += weight;
                    itemCount++;
                }
            }
        }

        const avgWeight = itemCount > 0 ? globalScoreSum / itemCount : 5;

        // Encontrar o estado equivalente mais próximo
        let bestState = null;
        let minDiff = Infinity;
        const statesList =
            statesMap instanceof Map
                ? Array.from(statesMap.values())
                : Object.values(statesMap || {});
        for (const state of statesList) {
            const diff = Math.abs((state.weight || 0) - avgWeight);
            if (diff < minDiff) {
                minDiff = diff;
                bestState = state;
            }
        }

        return { avgWeight, equivalentState: bestState };
    }

    function getWeekKey(date: Date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        return monday.toISOString().split("T")[0];
    }

    const hierarchicalPsychologyData = $derived.by(() => {
        if (appStore.isLoadingData) return [];
        const t0 = performance.now();
        const monthsMap = new Map<string, any>();

        const statesMap = new Map<string, any>();
        for (const s of emotionalStates) statesMap.set(s.id, s);

        // Group trades and journals by date first
        const dayMap = new Map<
            string,
            { trades: any[]; journalEntries: any[] }
        >();

        for (const trade of filteredTrades) {
            const dateStr = trade.date.split("T")[0];
            if (!dayMap.has(dateStr))
                dayMap.set(dateStr, { trades: [], journalEntries: [] });
            dayMap.get(dateStr)!.trades.push(trade);
        }

        for (const journal of filteredJournal) {
            const dateStr = journal.date.split("T")[0];
            if (!dayMap.has(dateStr))
                dayMap.set(dateStr, { trades: [], journalEntries: [] });
            dayMap.get(dateStr)!.journalEntries.push(journal);
        }

        // Build the hierarchy: Month -> Week -> Day
        for (const [dateStr, data] of dayMap.entries()) {
            const date = new Date(dateStr + "T12:00:00");
            const monthKey = dateStr.slice(0, 7); // YYYY-MM
            const weekKey = getWeekKey(date);

            if (!monthsMap.has(monthKey)) {
                monthsMap.set(monthKey, {
                    key: monthKey,
                    label: date.toLocaleDateString($locale || "pt-BR", {
                        month: "long",
                        year: "numeric",
                    }),
                    weeks: new Map<string, any>(),
                    totalPnlByCurrency: {} as Record<string, number>,
                    trades: [],
                    journalEntries: [],
                });
            }

            const month = monthsMap.get(monthKey);
            if (!month.weeks.has(weekKey)) {
                month.weeks.set(weekKey, {
                    key: weekKey,
                    label: `Semana de ${new Date(weekKey).toLocaleDateString($locale || "pt-BR", { day: "numeric", month: "short" })}`,
                    days: [],
                    totalPnlByCurrency: {} as Record<string, number>,
                    trades: [],
                    journalEntries: [],
                });
            }

            const week = month.weeks.get(weekKey);
            const dayEmotion = calculateAverageEmotion(
                data.trades,
                data.journalEntries,
                statesMap,
            );
            const dayPnl: Record<string, number> = {};
            for (const trade of data.trades) {
                const acc = accountsStore.accounts.find(
                    (a) => a.id === trade.account_id,
                );
                const curr = acc?.currency || "BRL";
                dayPnl[curr] = (dayPnl[curr] || 0) + trade.result;

                // Propagate to week and month
                week.totalPnlByCurrency[curr] =
                    (week.totalPnlByCurrency[curr] || 0) + trade.result;
                month.totalPnlByCurrency[curr] =
                    (month.totalPnlByCurrency[curr] || 0) + trade.result;
            }

            const dayObj = {
                key: dateStr,
                date: dateStr,
                label: date.toLocaleDateString($locale || "pt-BR", {
                    weekday: "long",
                    day: "numeric",
                }),
                trades: data.trades,
                journalEntries: data.journalEntries,
                totalPnlByCurrency: dayPnl,
                ...dayEmotion,
            };

            week.days.push(dayObj);
            week.trades.push(...data.trades);
            week.journalEntries.push(...data.journalEntries);

            month.trades.push(...data.trades);
            month.journalEntries.push(...data.journalEntries);
        }

        // Convert Maps to sorted arrays and calculate emotions for higher levels
        try {
            const result = Array.from(monthsMap?.values() || [])
                .sort((a: any, b: any) =>
                    (b.key || "").localeCompare(a.key || ""),
                )
                .map((month: any) => {
                    const monthEmotion = calculateAverageEmotion(
                        month.trades || [],
                        month.journalEntries || [],
                        statesMap,
                    );
                    const weeks = Array.from(
                        (month.weeks as Map<string, any>)?.values() || [],
                    )
                        .sort((a: any, b: any) =>
                            (b.key || "").localeCompare(a.key || ""),
                        )
                        .map((week: any) => {
                            const weekEmotion = calculateAverageEmotion(
                                week.trades || [],
                                week.journalEntries || [],
                                statesMap,
                            );
                            const days = (week.days || []).sort(
                                (a: any, b: any) =>
                                    (b.date || "").localeCompare(a.date || ""),
                            );
                            return { ...week, ...weekEmotion, days };
                        });
                    return { ...month, ...monthEmotion, weeks };
                });

            console.log(
                `[PsychologyHub] hierarchicalPsychologyData calculated in ${performance.now() - t0}ms`,
            );
            return result;
        } catch (err) {
            console.error("[PsychologyHub] Error processing results:", err);
            return [];
        }
    });

    async function syncWeights() {
        try {
            await invoke("seed_emotional_states");
            await appStore.loadData();
            toast.success("Pesos sincronizados com sucesso!");
        } catch (e) {
            toast.error("Erro ao sincronizar pesos.");
        }
    }

    const psychoDiagnosis = $derived.by(() => {
        if (appStore.isLoadingData) return null;
        return analyzePsychology(
            filteredTrades,
            filteredJournal,
            emotionalStates,
            (t) => Number(t.result) || 0
        );
    });

    function formatCurrency(val: number, currency: string = "BRL") {
        try {
            return new Intl.NumberFormat($locale || "pt-BR", {
                style: "currency",
                currency: currency,
            }).format(val);
        } catch (e) {
            return `${currency} ${val.toLocaleString($locale || "pt-BR", { minimumFractionDigits: 2 })}`;
        }
    }

    // --- AI Assist Layer ---
    const hasActiveAiProvider = $derived.by(() => {
        const id = integrationsStore.psychologyApiId;
        const config = integrationsStore.apiConfigs.find((c) => c.id === id && c.enabled);
        if (config && config.api_key) return true;
        const fallback = integrationsStore.apiConfigs.find((c) => (c.provider === 'openai' || c.provider === 'google_gemini') && c.enabled);
        return !!fallback?.api_key;
    });

    const currentPeriodStr = $derived(`${startDate || 'Início'} Até ${endDate || 'Hoje'}`);
    
    const metricsPayloadObj = $derived.by(() => {
        if (!psychoDiagnosis) return {};
        return {
            global_psycho_score: psychoDiagnosis.psychoScore,
            top_vulnerability: psychoDiagnosis.killerEmotion ? {
                emotion: psychoDiagnosis.killerEmotion.emotionName,
                financial_drain: psychoDiagnosis.killerEmotion.totalPnL,
                occurrences: psychoDiagnosis.killerEmotion.tradeCount,
                percent_of_all_negative_losses: psychoDiagnosis.killerEmotionLossPercent ? (psychoDiagnosis.killerEmotionLossPercent * 100).toFixed(1) + "%" : "0%"
            } : null,
            top_edge: psychoDiagnosis.saviorEmotion ? {
                emotion: psychoDiagnosis.saviorEmotion.emotionName,
                financial_gain: psychoDiagnosis.saviorEmotion.totalPnL,
                occurrences: psychoDiagnosis.saviorEmotion.tradeCount
            } : null,
            system_mathematical_conclusions: psychoDiagnosis.conclusions
        };
    });

    function getDayPnl(day: any) {
        if (!day || !day.totalPnlByCurrency) return 0;
        return Object.values(day.totalPnlByCurrency).reduce((a:any, b:any) => a + b, 0) as number;
    }

    const chartDays = $derived.by(() => {
        const days: any[] = [];
        let maxAbsPnl = 0;

        for (const month of hierarchicalPsychologyData) {
            for (const week of month.weeks) {
                for (const d of week.days) {
                    const dailyPnl = getDayPnl(d);
                    const absPnl = Math.abs(dailyPnl);
                    if (absPnl > maxAbsPnl) maxAbsPnl = absPnl;

                    days.push({
                        ...d,
                        dailyPnl,
                        absPnl,
                        tradesCount: d.trades?.length || 0,
                        dateLabel: new Date(d.date + "T12:00:00").toLocaleDateString($locale || "pt-BR", { weekday: 'short', day: '2-digit', month: '2-digit' }),
                        shortDate: d.date.slice(8, 10) + '/' + d.date.slice(5, 7),
                        impact: d.equivalentState?.impact || 'Neutral',
                        emotionName: d.equivalentState?.name || 'Neutro',
                        isToday: d.date === filterLimits.today
                    });
                }
            }
        }

        const safeMax = maxAbsPnl === 0 ? 1 : maxAbsPnl;
        for (const d of days) {
            let pct = (d.absPnl / safeMax) * 100;
            if (d.tradesCount > 0 && pct < 4) pct = 4;
            d.heightPercent = pct;
            
            d.emotionBgClass = d.impact === 'Positive' ? 'bg-emerald-500' : d.impact === 'Negative' ? 'bg-rose-500' : 'bg-slate-500';
            d.emotionTextClass = d.impact === 'Positive' ? 'text-emerald-500' : d.impact === 'Negative' ? 'text-rose-500' : 'text-slate-500';
        }

        return days.sort((a,b) => a.date.localeCompare(b.date)); // Chronological order
    });

    const emotionRanking = $derived.by(() => {
        if (!psychoDiagnosis || psychoDiagnosis.matrix.length === 0) return [];
        return [...psychoDiagnosis.matrix].sort((a,b) => a.totalPnL - b.totalPnL); // Ascending: Pior pro Melhor
    });

    const donutChartOptions = $derived.by(() => {
        if (!psychoDiagnosis || psychoDiagnosis.matrix.length === 0) return null;
        let sorted = [...psychoDiagnosis.matrix].filter(r => r.tradeCount > 0).sort((a,b) => b.tradeCount - a.tradeCount);
        let top5 = sorted.slice(0, 5);
        
        let data: any[] = top5.map(r => ({ name: r.emotionName, value: r.tradeCount, itemStyle: { color: r.impact === 'Positive' ? '#10b981' : r.impact === 'Negative' ? '#f43f5e' : '#94a3b8' } }));
        
        return {
            backgroundColor: 'transparent',
            tooltip: { trigger: 'item', backgroundColor: 'rgba(10, 10, 10, 0.95)', borderColor: '#27272a', textStyle: { color: '#fff' } },
            legend: { show: false },
            series: [{ type: 'pie', radius: ['45%', '72%'], avoidLabelOverlap: true, itemStyle: { borderColor: '#09090b', borderWidth: 2 }, label: { show: true, formatter: '{b}\n{c} trds', color: '#a1a1aa', fontSize: 10, fontWeight: 'bold' }, labelLine: { smooth: 0.2, length: 15, length2: 15 }, data }]
        };
    });

    const radarChartOptions = $derived.by(() => {
        if (!psychoDiagnosis || !psychoDiagnosis.matrix || psychoDiagnosis.matrix.length === 0) return null;
        let topEmotions = [...psychoDiagnosis.matrix]
            .filter(r => r.tradeCount > 0)
            .sort((a,b) => b.tradeCount - a.tradeCount)
            .slice(0, 8);
            
        // Agora ordenamos para agrupar fisicamente no Radar as de mesma polaridade juntas
        topEmotions.sort((a,b) => {
            const order: Record<string, number> = { 'Positive': 1, 'Negative': 2, 'Neutral': 3 };
            return (order[a.impact] || 4) - (order[b.impact] || 4);
        });
        
        if (topEmotions.length === 0) return null;

        let maxFreq = Math.max(...topEmotions.map(e => e.tradeCount));
        let radarIndicators = topEmotions.map(e => ({ name: e.emotionName, max: maxFreq * 1.1, min: 0 }));
        
        let radarDataSeries = [];
        if (topEmotions.some(e => e.impact === 'Positive')) {
            radarDataSeries.push({
                value: topEmotions.map(e => e.impact === 'Positive' ? e.tradeCount : 0),
                name: 'Positivas',
                symbol: 'circle',
                symbolSize: 4,
                itemStyle: { color: '#10b981' },
                areaStyle: { color: 'rgba(16, 185, 129, 0.4)' },
                lineStyle: { width: 2, color: '#10b981' }
            });
        }
        if (topEmotions.some(e => e.impact === 'Negative')) {
            radarDataSeries.push({
                value: topEmotions.map(e => e.impact === 'Negative' ? e.tradeCount : 0),
                name: 'Negativas',
                symbol: 'circle',
                symbolSize: 4,
                itemStyle: { color: '#f43f5e' },
                areaStyle: { color: 'rgba(244, 63, 94, 0.4)' },
                lineStyle: { width: 2, color: '#f43f5e' }
            });
        }
        if (topEmotions.some(e => e.impact === 'Neutral')) {
            radarDataSeries.push({
                value: topEmotions.map(e => e.impact === 'Neutral' ? e.tradeCount : 0),
                name: 'Neutras',
                symbol: 'circle',
                symbolSize: 4,
                itemStyle: { color: '#94a3b8' },
                areaStyle: { color: 'rgba(148, 163, 184, 0.4)' },
                lineStyle: { width: 2, color: '#94a3b8' }
            });
        }

        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(10, 10, 10, 0.95)',
                borderColor: '#27272a',
                textStyle: { color: '#fff' },
                formatter: (params: any) => {
                    let html = `<div class="font-bold mb-3 uppercase tracking-widest text-[10px] text-muted-foreground">Volume Comportamental</div>`;
                    topEmotions.forEach(e => {
                        let color = e.impact === 'Positive' ? '#10b981' : e.impact === 'Negative' ? '#f43f5e' : '#94a3b8';
                        html += `<div class="flex justify-between gap-4 mb-1"><span class="text-xs font-bold" style="color: ${color}">${e.emotionName}</span><span class="font-bold text-foreground text-xs">${e.tradeCount} <span class="text-[9px] text-muted-foreground/60">trades</span></span></div>`;
                    });
                    return html;
                }
            },
            legend: { show: false },
            radar: {
                indicator: radarIndicators,
                shape: 'polygon',
                splitNumber: 4,
                center: ['50%', '50%'],
                radius: '65%',
                axisName: { color: '#a1a1aa', fontSize: 10, fontWeight: 'bold', textShadowColor: '#000', textShadowBlur: 2 },
                splitLine: { lineStyle: { color: ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)'] } },
                splitArea: { show: false },
                axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } }
            },
            series: [{
                name: 'Exposição de Risco Psicológico',
                type: 'radar',
                data: radarDataSeries
            }]
        };
    });



    const lineChartOptions = $derived.by(() => {
        if (!chartDays || chartDays.length === 0) return null;
        let cumulative = 0;
        let dates: string[] = [];
        let data: number[] = [];

        chartDays.forEach(day => {
            cumulative += day.dailyPnl;
            dates.push(day.shortDate);
            data.push(parseFloat(cumulative.toFixed(2)));
        });

        const sortedDesc = [...chartDays].sort((a,b) => b.dailyPnl - a.dailyPnl);
        const topGains = sortedDesc.slice(0, 2).filter(d => d.dailyPnl > 0);
        const topLosses = sortedDesc.slice(sortedDesc.length > 2 ? sortedDesc.length - 2 : 0).reverse().filter(d => d.dailyPnl < 0);
        
        let customMarkPoints = [...topGains, ...topLosses].map(d => {
             let cIndex = chartDays.findIndex(x => x.shortDate === d.shortDate);
             let val = data[cIndex];
             return {
                 name: d.emotionName,
                 value: d.emotionName,
                 xAxis: d.shortDate,
                 yAxis: val,
                 symbol: 'pin',
                 symbolSize: 40,
                 itemStyle: { color: d.impact === 'Positive' ? '#10b981' : d.impact === 'Negative' ? '#f43f5e' : '#64748b' },
                 label: { formatter: '{b}', color: '#fff', fontSize: 7, fontWeight: 'bold' }
             };
        });
        return {
            backgroundColor: 'transparent',
            tooltip: { trigger: 'axis', backgroundColor: 'rgba(10, 10, 10, 0.9)', borderColor: '#27272a', textStyle: { color: '#fff' } },
            grid: { left: '2%', right: '2%', bottom: '5%', top: '10%', containLabel: true },
            xAxis: { type: 'category', boundaryGap: false, data: dates, axisLine: { lineStyle: { color: '#27272a' } }, axisLabel: { color: '#71717a', fontSize: 10 } },
            yAxis: { type: 'value', splitLine: { lineStyle: { color: '#27272a', type: 'dashed' } }, axisLabel: { color: '#71717a', fontSize: 10, formatter: (val:number) => val >= 1000 || val <= -1000 ? (val/1000).toFixed(1)+'k' : val } },
            series: [{
                type: 'line',
                data: data,
                smooth: true,
                showSymbol: false,
                lineStyle: { width: 3, color: '#3b82f6' },
                areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(59, 130, 246, 0.2)' }, { offset: 1, color: 'rgba(59, 130, 246, 0.0)' }]) },
                markPoint: { data: customMarkPoints }
            }]
        };
    });

    const isLoading = $derived(
        tradesStore.isLoading || appStore.isLoadingData,
    );

    let expandedMonths = $state(new Set<string>());
    let expandedWeeks = $state(new Set<string>());

    $effect(() => {
        if (hierarchicalPsychologyData.length > 0) {
            untrack(() => {
                const today = new Date();
                const currentMonthKey = today.toISOString().slice(0, 7);
                const currentWeekKey = getWeekKey(today);

                // Auto-expand current month and week if not already set
                if (expandedMonths.size === 0) {
                    // Try to find current month
                    if (hierarchicalPsychologyData.some(m => m.key === currentMonthKey)) {
                        expandedMonths.add(currentMonthKey);
                    } else {
                        // Fallback to latest month
                        expandedMonths.add(hierarchicalPsychologyData[0].key);
                    }
                    
                    // Try to find current week in the expanded month
                    const month = hierarchicalPsychologyData.find(m => expandedMonths.has(m.key));
                    if (month && month.weeks.length > 0) {
                        const currentWeek = month.weeks.find((w: any) => w.key === currentWeekKey);
                        if (currentWeek) {
                            expandedWeeks.add(currentWeek.key);
                        } else {
                            expandedWeeks.add(month.weeks[0].key);
                        }
                    }
                    
                    expandedMonths = new Set(expandedMonths);
                    expandedWeeks = new Set(expandedWeeks);
                }
            });
        }
    });
</script>

<DailyCheckinDialog bind:open={showCheckinDialog} />

<DeleteConfirmationModal
    bind:open={showDeleteConfirm}
    onConfirm={confirmDeleteJournal}
    title={$t("common.confirmDelete") || "Confirmar Exclusão"}
    description="Você tem certeza que deseja excluir este registro diário psicológico? Esta ação não pode ser desfeita."
/>

<Dialog.Root bind:open={isDeleteWithClosureOpen}>
    <Dialog.Content
        class="max-w-[425px] w-full bg-popover/90 border-border backdrop-blur-xl shadow-2xl"
    >
        <Dialog.Header>
            <Dialog.Title class="text-foreground">
                {$t("common.confirmDelete") || "Excluir Registro Psicológico"}
            </Dialog.Title>
            <Dialog.Description class="text-muted-foreground">
                Este registro psicológico possui um <strong
                    class="text-foreground">Fechamento Diário Financeiro</strong
                > associado. Você deseja excluir apenas o registro psicológico ou
                ambos?
            </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer class="flex flex-col sm:flex-row gap-2 mt-4">
            <Button
                variant="outline"
                onclick={() => (isDeleteWithClosureOpen = false)}
                >{$t("common.cancel")}</Button
            >
            <Button
                variant="secondary"
                onclick={() => confirmDeleteJournalWithClosure(false)}
            >
                Só Psicológico
            </Button>
            <Button
                variant="destructive"
                onclick={() => confirmDeleteJournalWithClosure(true)}
            >
                Excluir Ambos
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<div class="space-y-6 animate-in fade-in duration-500">
    <div class="flex-1 flex flex-col space-y-8 p-4 md:p-8">
        <PsychologyHeader 
            onSyncWeights={syncWeights}
            onNewCheckin={() => (showCheckinDialog = true)}
        />

        <Separator class="bg-border/20" />

        <!-- DECISION LAYER: Score & Recomendações -->
        {#if isLoading || !psychoDiagnosis}
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                {#each Array(4) as _}
                    <div class="h-32 rounded-xl bg-muted/50 animate-pulse"></div>
                {/each}
            </div>
        {:else}
        <!-- Camada Tática: 4 KPIs (Hydra V4 Stats Grid) -->
        <PsychologyStatsGrid {psychoDiagnosis} />



            <!-- Camada de Decisão: O Mapa, O Overview e Os Protocolos -->
            <!-- Camada de Decisão: O Mapa, O Overview e Os Protocolos -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 pt-4 mb-4 lg:items-start">
                <!-- Radar Chart (Comportamento) - 4/12 -->
                <SystemCard class="lg:col-span-4 p-4 h-[320px] shadow-sm flex flex-col">
                    <SystemHeader 
                        title={$t('psychology.charts.theMap')}
                        class="mb-4"
                    />
                    <div class="flex-1 w-full relative">
                        {#if radarChartOptions}
                            <EChart options={radarChartOptions} />
                        {:else}
                            <div class="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground border-2 border-dashed border-border/40 rounded-lg">Sem dados</div>
                        {/if}
                    </div>
                </SystemCard>

                <!-- Pie Chart (Donut) - 4/12 -->
                <SystemCard class="lg:col-span-4 p-4 shadow-sm flex flex-col h-[320px]">
                    <SystemHeader 
                        title={$t('psychology.charts.top5')}
                        class="mb-4"
                    />
                    <div class="flex-1 w-full relative">
                        {#if donutChartOptions && donutChartOptions.series[0].data.length > 0}
                            <EChart options={donutChartOptions} />
                        {:else}
                            <div class="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground border-2 border-dashed border-border/40 rounded-lg">Sem dados</div>
                        {/if}
                    </div>
                </SystemCard>

                <!-- Ranking de Emoções - 4/12 (Preenchendo o grid) -->
                <SystemCard class="lg:col-span-4 p-4 shadow-sm flex flex-col h-[320px]">
                    <SystemHeader 
                        title={$t('psychology.charts.impactRanking')}
                        class="mb-4"
                    />
                    <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <table class="w-full text-left">
                           <thead class="sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b border-border/10">
                              <tr class="h-6">
                                 <th class="text-[8px] font-black text-muted-foreground uppercase">{$t('psychology.charts.emotion')}</th>
                                 <th class="text-[8px] font-black text-muted-foreground uppercase text-right">{$t('psychology.charts.trades')}</th>
                                 <th class="text-[8px] font-black text-muted-foreground uppercase text-right">PnL</th>
                              </tr>
                           </thead>
                           <tbody class="divide-y divide-border/5">
                              {#each (emotionRanking || []).reverse() as r}
                                 <tr class="h-8 group hover:bg-white/5 transition-colors">
                                    <td class="text-[10px] font-bold uppercase {r.impact === 'Positive' ? 'text-emerald-500' : r.impact === 'Negative' ? 'text-rose-500' : 'text-slate-400'}">
                                       {r.emotionName}
                                    </td>
                                    <td class="text-[10px] font-bold text-muted-foreground/60 text-right">{r.tradeCount}</td>
                                    <td class="text-[10px] font-black text-right {r.totalPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}">
                                       {r.totalPnL.toFixed(2)}
                                    </td>
                                 </tr>
                              {/each}
                           </tbody>
                         </table>
                    </div>
                </SystemCard>
                
                <!-- Camada Interpretativa de IA (Agora em Largura Total ocupando 12/12) -->
                <SystemCard class="lg:col-span-12 mt-2">
                    <PsychologyAICard 
                        periodStr={currentPeriodStr}
                        metricsPayload={metricsPayloadObj}
                        hasActiveAiProvider={hasActiveAiProvider}
                    />
                </SystemCard>
            </div>

            <!-- Camada Retrospectiva: Curva de Capital -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-4">
                <!-- Curva de Capital (Largura Total - 12/12) -->
                <SystemCard class="lg:col-span-12 p-4 shadow-sm flex flex-col h-[340px]">
                    <div class="mb-4 border-b border-border/40 pb-3">
                         <SystemHeader 
                             title={$t('psychology.charts.equityCurve')}
                             icon={TrendingUp}
                         >
                            {#snippet actions()}
                                <div class="scale-90 origin-right">
                                    <DateFilter bind:value={timeFilter} bind:startDate bind:endDate />
                                </div>
                            {/snippet}
                         </SystemHeader>
                    </div>
                    <div class="flex-1 w-full relative">
                        <!-- Make sure the div is hidden/displayed correctly based on data -->
                        <div class="w-full text-transparent absolute top-0 z-[-1]"></div>
                        {#if lineChartOptions && lineChartOptions.series[0].data.length > 0}
                            <EChart options={lineChartOptions} />
                        {:else}
                            <div class="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground border-2 border-dashed border-border/40 rounded-lg">{$t('psychology.charts.filterPeriod')}</div>
                        {/if}
                    </div>
                </SystemCard>
            </div>
        {/if}

        <!-- Main Split Content (Detalhes e Sessões) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
            <!-- Left: Hierarchical Analysis -->
            <div class="lg:col-span-8 space-y-4">
                <SystemHeader 
                    title={$t("psychology.hierarchical.sessionsStructure")}
                    icon={Layers}
                    class="mb-2"
                />
                
                {#if hierarchicalPsychologyData.length === 0}
                    <div
                        class="h-40 flex items-center justify-center text-muted-foreground bg-card/20 border-2 border-dashed rounded-xl border-border/30 backdrop-blur-sm uppercase text-[9px] font-black tracking-widest"
                    >
                        {$t("common.noData")}
                    </div>
                {:else}
                    <SystemCard class="p-1 shadow-sm overflow-hidden">
                        <HierarchicalList 
                            data={hierarchicalPsychologyData}
                            bind:expandedMonths
                            bind:expandedWeeks
                            mutualExclusion={true}
                        >
                        {#snippet monthRight(month)}
                            <div class="flex items-center gap-2">
                                {#if month.equivalentState}
                                    <div class="flex flex-col items-end mr-2">
                                        <div
                                            class="flex items-baseline gap-1.5"
                                        >
                                            <span
                                                class="text-xs font-black text-foreground"
                                                >{month.avgWeight.toFixed(
                                                    1,
                                                )}</span
                                            >
                                            <span
                                                class="text-[7px] font-bold text-muted-foreground uppercase tracking-tighter"
                                                >{$t('psychology.kpis.score')}</span
                                            >
                                        </div>
                                        <Badge
                                            class="text-[7px] h-3.5 px-1 font-black uppercase {month
                                                .equivalentState.impact ===
                                            'Positive'
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                : 'bg-rose-500/10 text-red-400 border-rose-500/20'}"
                                            variant="outline"
                                        >
                                            {month.equivalentState.name}
                                        </Badge>
                                    </div>
                                {/if}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    class="h-7 w-7 hover:bg-accent/10"
                                    onclick={(e) => {
                                        e.stopPropagation();
                                        openInsight(month);
                                    }}
                                >
                                    <Eye
                                        class="w-3.5 h-3.5 text-muted-foreground hover:text-foreground"
                                    />
                                </Button>
                            </div>
                        {/snippet}
                        {#snippet monthBadges(month)}
                            <Badge
                                variant="outline"
                                class="text-[9px] px-1.5 h-4 bg-muted border-border font-bold uppercase"
                            >
                                {month.weeks.length}
                                {$t("common.weeks_upper")}
                            </Badge>
                            <div class="flex gap-1.5 opacity-60">
                                {#each Object.entries(month.totalPnlByCurrency ?? {}) as [curr, total]}
                                    <span
                                        class="text-[9px] font-bold {(total as number) >=
                                        0
                                            ? 'text-emerald-500'
                                            : 'text-rose-500'}"
                                    >
                                        {formatCurrency(total as number, curr)}
                                    </span>
                                {/each}
                            </div>
                        {/snippet}
                        {#snippet weekRight(week)}
                            <div
                                class="flex items-center gap-1.5 border-l border-border/30 pl-2 mr-1"
                            >
                                <span
                                    class="text-[10px] font-black text-foreground"
                                    >{week.avgWeight?.toFixed(1) ?? "-"}</span
                                >
                                <span
                                    class="text-[7px] font-bold text-muted-foreground uppercase tracking-tighter"
                                    >{$t('psychology.kpis.score')}</span
                                >
                            </div>
                        {/snippet}
                        {#snippet weekBadges(week)}
                            <div class="flex gap-2">
                                {#each Object.entries(week.totalPnlByCurrency ?? {}) as [curr, total]}
                                    <div class="flex items-baseline gap-0.5">
                                        <span
                                            class="text-[7px] text-muted-foreground uppercase"
                                            >{curr}</span
                                        >
                                        <span
                                            class="text-[9px] font-mono font-bold {(total as number) >=
                                            0
                                                ? 'text-emerald-500'
                                                : 'text-rose-500'}"
                                        >
                                            {(total as number).toFixed(2)}
                                        </span>
                                    </div>
                                {/each}
                            </div>
                        {/snippet}
                        {#snippet dayRight(day)}
                            {#if day.equivalentState}
                                <div class="flex items-center gap-2 mr-2">
                                    <div class="flex flex-col items-end">
                                        <div
                                            class="flex items-baseline gap-1.5"
                                        >
                                            <span
                                                class="text-xs font-black text-foreground"
                                                >{day.avgWeight.toFixed(
                                                    1,
                                                )}</span
                                            >
                                            <span
                                                class="text-[7px] font-bold text-muted-foreground uppercase tracking-tighter"
                                                >{$t('psychology.kpis.score')}</span
                                            >
                                        </div>
                                        <Badge
                                            class="text-[7px] h-3.5 px-1 font-black uppercase {day
                                                .equivalentState.impact ===
                                            'Positive'
                                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}"
                                            variant="outline"
                                        >
                                            {day.equivalentState.name}
                                        </Badge>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        class="h-7 w-7 hover:bg-white/10"
                                        onclick={(e) => {
                                            e.stopPropagation();
                                            openInsight(day);
                                        }}
                                    >
                                        <Eye
                                            class="w-3.5 h-3.5 text-muted-foreground"
                                        />
                                    </Button>
                                </div>
                            {/if}
                        {/snippet}
                        {#snippet dayBadges(day)}
                            <div class="flex gap-1.5 opacity-60">
                                {#each Object.entries(day.totalPnlByCurrency ?? {}) as [curr, total]}
                                    <span
                                        class="text-[9px] font-bold {(total as number) >=
                                        0
                                            ? 'text-emerald-500'
                                            : 'text-rose-500'}"
                                    >
                                        {formatCurrency(total as number, curr)}
                                    </span>
                                {/each}
                            </div>
                        {/snippet}
                        {#snippet dayContent(day)}
                            <div class="px-4 pb-4">
                                <div
                                    class="rounded-lg border border-border/40 overflow-hidden bg-background/40 mt-1"
                                >
                                    <table class="w-full text-left">
                                        <thead
                                            class="bg-muted/50 h-7 border-b border-border/20"
                                        >
                                            <tr>
                                                <th
                                                    class="px-3 text-[8px] font-black text-muted-foreground uppercase"
                                                    >{$t("common.asset")}</th
                                                >
                                                <th
                                                    class="px-3 text-[8px] font-black text-muted-foreground uppercase"
                                                    >{$t(
                                                        "psychology.analysis.emotionalCalc",
                                                    )}</th
                                                >
                                                <th
                                                    class="px-3 text-[8px] font-black text-muted-foreground uppercase text-right"
                                                    >{$t(
                                                        "psychology.analysis.totalWeight",
                                                    )}</th
                                                >
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {#each day.trades as trade}
                                                <tr
                                                    class="h-8 border-b border-border/10 last:border-0 hover:bg-primary/10 transition-colors"
                                                >
                                                    <td
                                                        class="px-3 text-[10px] font-bold text-foreground uppercase"
                                                        >{trade.asset_symbol}</td
                                                    >
                                                    <td class="px-3 py-1.5">
                                                        {#if trade.entry_emotional_state_id}
                                                            {@const st =
                                                                emotionalStates.find(
                                                                    (s) =>
                                                                        s.id ===
                                                                        trade.entry_emotional_state_id,
                                                                )}
                                                            <div
                                                                class="flex items-center gap-2"
                                                            >
                                                                <span
                                                                    class="text-[9px] font-bold text-muted-foreground uppercase"
                                                                    >{st?.name}</span
                                                                >
                                                                <span
                                                                    class="text-[8px] text-muted-foreground/60 font-medium lowercase italic"
                                                                >
                                                                    ({st?.weight}
                                                                    {$t(
                                                                        "common.weight",
                                                                    )} x {(
                                                                        trade.intensity ||
                                                                        5
                                                                    ).toFixed(
                                                                        1,
                                                                    )}
                                                                    {$t(
                                                                        "common.intensity_short",
                                                                    )})
                                                                </span>
                                                            </div>
                                                        {/if}
                                                    </td>
                                                    <td
                                                        class="px-3 text-[10px] font-black text-right text-foreground"
                                                    >
                                                        {#if trade.entry_emotional_state_id}
                                                            {@const st =
                                                                emotionalStates.find(
                                                                    (s) =>
                                                                        s.id ===
                                                                        trade.entry_emotional_state_id,
                                                                )}
                                                            {(
                                                                (st?.weight ||
                                                                    5) *
                                                                (trade.intensity ||
                                                                    5)
                                                            ).toFixed(1)}
                                                        {/if}
                                                    </td>
                                                </tr>
                                            {/each}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        {/snippet}
                    </HierarchicalList>
                </SystemCard>
            {/if}
        </div>

            <!-- Right: Journal List -->
            <div class="lg:col-span-4 space-y-4">
                <SystemHeader 
                    title={$t("psychology.journal.title")}
                    class="mb-2"
                />
                <SystemCard class="overflow-hidden">
                    <div class="max-h-[70vh] overflow-y-auto">
                        <table class="w-full text-left">
                            <thead
                                class="bg-muted/80 border-b border-border/40 sticky top-0 backdrop-blur-md"
                            >
                                <tr class="h-8">
                                    <th
                                        class="px-3 text-[9px] font-black text-muted-foreground uppercase"
                                        >{$t("common.date")}</th
                                    >
                                    <th
                                        class="px-3 text-[9px] font-black text-muted-foreground uppercase w-32"
                                        >{$t(
                                            "psychology.journal.entryStateShort",
                                        )}</th
                                    >
                                    <th
                                        class="px-3 text-[9px] font-black text-muted-foreground uppercase w-32"
                                        >{$t(
                                            "psychology.journal.exitStateShort",
                                        )}</th
                                    >
                                    <th
                                        class="px-3 text-[9px] font-black text-muted-foreground uppercase text-right"
                                        >{$t(
                                            "psychology.journal.intensityShort",
                                        )}</th
                                    >
                                    <th
                                        class="px-3 text-[9px] font-black text-muted-foreground uppercase text-right"
                                        >{$t("psychology.journal.score")}</th
                                    >
                                    <th
                                        class="px-3 text-[9px] font-black text-muted-foreground uppercase text-right"
                                        >{$t("common.actions")}</th
                                    >
                                </tr>
                            </thead>
                            <tbody>
                                {#each filteredJournal
                                    .slice()
                                    .sort( (a, b) => b.date.localeCompare(a.date), ) as entry}
                                    {@const em = emotionalStates.find(
                                        (s) =>
                                            s.id === entry.emotional_state_id,
                                    )}
                                    {@const itemScore = em?.weight ?? 5}
                                    {@const itemIntensity =
                                        entry.intensity || 5}
                                    <tr
                                        class="h-10 border-b border-border/10 hover:bg-primary/10 transition-colors group"
                                    >
                                        <td class="px-3">
                                            <div class="flex flex-col">
                                                <span
                                                    class="text-[10px] font-black text-foreground uppercase"
                                                >
                                                    {new Date(
                                                        entry.date +
                                                            "T12:00:00",
                                                    ).toLocaleDateString(
                                                        $locale || "pt-BR",
                                                        {
                                                            day: "2-digit",
                                                            month: "2-digit",
                                                        },
                                                    )}
                                                </span>
                                                <span
                                                    class="text-[8px] text-muted-foreground/50 font-medium"
                                                >
                                                    {new Date(
                                                        entry.date +
                                                            "T12:00:00",
                                                    ).toLocaleDateString(
                                                        $locale || "pt-BR",
                                                        { weekday: "short" },
                                                    )}
                                                </span>
                                            </div>
                                        </td>
                                        <td class="px-3">
                                            {#if em}
                                                <div
                                                    class="flex items-center gap-1.5"
                                                >
                                                    <span
                                                        class="text-[9px] font-black uppercase {em.impact ===
                                                        'Positive'
                                                            ? 'text-emerald-400'
                                                            : 'text-red-400'}"
                                                        >{em.name}</span
                                                    >
                                                    <span
                                                        class="text-[8px] text-muted-foreground font-medium"
                                                        >({em.weight ||
                                                            5})</span
                                                    >
                                                </div>
                                            {:else}
                                                <span
                                                    class="text-[8px] text-muted-foreground/30 italic font-bold"
                                                    >- -</span
                                                >
                                            {/if}
                                        </td>
                                        <td class="px-3">
                                            <span
                                                class="text-[8px] text-muted-foreground/20 font-bold"
                                                >N/A</span
                                            >
                                        </td>
                                        <td
                                            class="px-3 text-[10px] font-medium text-right text-muted-foreground/60"
                                        >
                                            {itemIntensity.toFixed(1)}
                                        </td>
                                        <td
                                            class="px-3 text-[10px] font-black text-right text-foreground"
                                        >
                                            {itemScore.toFixed(1)}
                                        </td>
                                        <td class="px-3 text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                class="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onclick={() =>
                                                    requestDeleteJournal(
                                                        entry.id,
                                                    )}
                                            >
                                                <Trash2
                                                    class="w-3 h-3 text-red-400"
                                                />
                                            </Button>
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                </SystemCard>
            </div>
        </div>
    </div>
</div>

<Dialog.Root bind:open={showInsightModal}>
    <Dialog.Content
        class="max-w-2xl bg-popover/90 border-border text-foreground p-0 overflow-hidden backdrop-blur-md"
    >
        {#if insightData}
            <div class="p-6 border-b border-border/40 bg-muted/30">
                <div class="flex items-center justify-between">
                    <div>
                        <h2
                            class="text-xl font-black uppercase tracking-tighter"
                        >
                            {$t("psychology.insight.title")}
                        </h2>
                        <p
                            class="text-xs font-bold text-muted-foreground/60 uppercase mt-1"
                        >
                            {insightData.label}
                        </p>
                    </div>
                    <div class="text-right">
                        <div class="flex items-baseline justify-end gap-1.5">
                            <span class="text-2xl font-black text-foreground"
                                >{insightData.avgWeight.toFixed(1)}</span
                            >
                            <span
                                class="text-[10px] font-bold text-muted-foreground uppercase"
                                >{$t('psychology.kpis.score')}</span
                            >
                        </div>
                        <Badge
                            class="text-[9px] font-black uppercase {insightData
                                .equivalentState.impact === 'Positive'
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}"
                            variant="outline"
                        >
                            {insightData.equivalentState.name}
                        </Badge>
                    </div>
                </div>
            </div>

            <div class="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <table class="w-full text-left">
                    <thead class="bg-card/80 sticky top-0 backdrop-blur-md">
                        <tr class="h-8 border-b border-border/40">
                            <th
                                class="px-3 text-[9px] font-black text-muted-foreground uppercase"
                                >{$t("common.origin")}</th
                            >
                            <th
                                class="px-3 text-[9px] font-black text-muted-foreground uppercase w-32"
                                >{$t("psychology.journal.entryStateShort")}</th
                            >
                            <th
                                class="px-3 text-[9px] font-black text-muted-foreground uppercase w-32"
                                >{$t("psychology.journal.exitStateShort")}</th
                            >
                            <th
                                class="px-3 text-[9px] font-black text-muted-foreground uppercase text-right"
                                >{$t("psychology.journal.intensityShort")}</th
                            >
                            <th
                                class="px-3 text-[9px] font-black text-muted-foreground uppercase text-right"
                                >{$t("psychology.insight.opScore")}</th
                            >
                        </tr>
                    </thead>
                    <tbody>
                        {#each insightData.items as item}
                            {@const isTrade = !!item.asset_symbol}
                            {@const entrySt = emotionalStates.find(
                                (s) =>
                                    s.id ===
                                    (isTrade
                                        ? item.entry_emotional_state_id
                                        : item.emotional_state_id),
                            )}
                            {@const exitSt = isTrade
                                ? emotionalStates.find(
                                      (s) =>
                                          s.id === item.exit_emotional_state_id,
                                  )
                                : null}
                            {@const itemIntensity = item.intensity || 5}

                            {#if entrySt || exitSt}
                                {@const entryWeight = entrySt?.weight ?? null}
                                {@const exitWeight = exitSt?.weight ?? null}
                                {@const weights = [
                                    entryWeight,
                                    exitWeight,
                                ].filter((w) => w !== null)}
                                {@const itemScore =
                                    weights.length > 0
                                        ? weights.reduce((a, b) => a + b, 0) /
                                          weights.length
                                        : 5}

                                <tr
                                    class="h-10 border-b border-border/10 hover:bg-primary/10 transition-colors"
                                >
                                    <td class="px-3">
                                        <div class="flex flex-col">
                                            <span
                                                class="text-[10px] font-bold text-foreground uppercase"
                                            >
                                                {item.asset_symbol ||
                                                    $t(
                                                        "common.day",
                                                    ).toUpperCase()}
                                            </span>
                                            <span
                                                class="text-[8px] text-muted-foreground/60 font-medium"
                                            >
                                                {new Date(
                                                    item.date,
                                                ).toLocaleDateString(
                                                    $locale || "pt-BR",
                                                    {
                                                        day: "2-digit",
                                                        month: "2-digit",
                                                    },
                                                )}
                                            </span>
                                        </div>
                                    </td>
                                    <td class="px-3">
                                        {#if entrySt}
                                            <div
                                                class="flex items-center gap-1.5"
                                            >
                                                <span
                                                    class="text-[9px] font-black uppercase {entrySt.impact ===
                                                    'Positive'
                                                        ? 'text-emerald-400'
                                                        : 'text-red-400'}"
                                                    >{entrySt.name}</span
                                                >
                                                <span
                                                    class="text-[8px] text-muted-foreground font-medium"
                                                    >({entrySt.weight ||
                                                        5})</span
                                                >
                                            </div>
                                        {:else}
                                            <span
                                                class="text-[8px] text-muted-foreground/30 italic font-bold"
                                                >- -</span
                                            >
                                        {/if}
                                    </td>
                                    <td class="px-3">
                                        {#if exitSt}
                                            <div
                                                class="flex items-center gap-1.5"
                                            >
                                                <span
                                                    class="text-[9px] font-black uppercase {exitSt.impact ===
                                                    'Positive'
                                                        ? 'text-emerald-400'
                                                        : 'text-red-400'}"
                                                    >{exitSt.name}</span
                                                >
                                                <span
                                                    class="text-[8px] text-muted-foreground font-medium"
                                                    >({exitSt.weight ||
                                                        5})</span
                                                >
                                            </div>
                                        {:else if isTrade}
                                            <span
                                                class="text-[8px] text-muted-foreground/30 italic font-bold"
                                                >- -</span
                                            >
                                        {:else}
                                            <span
                                                class="text-[8px] text-muted-foreground/20 font-bold"
                                                >N/A</span
                                            >
                                        {/if}
                                    </td>
                                    <td
                                        class="px-3 text-[10px] font-medium text-right text-muted-foreground/60"
                                    >
                                        {itemIntensity.toFixed(1)}
                                    </td>
                                    <td
                                        class="px-3 text-[10px] font-black text-right text-foreground"
                                    >
                                        {itemScore.toFixed(1)}
                                    </td>
                                </tr>
                            {/if}
                        {/each}
                    </tbody>
                </table>
            </div>

            <div class="p-6 bg-card/40 border-t border-border/40">
                <div class="grid grid-cols-2 gap-8">
                    <div>
                        <h4
                            class="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mb-2"
                        >
                            {$t("psychology.insight.formulaTitle")}
                        </h4>
                        <div class="flex flex-col gap-1.5">
                            <div class="flex flex-col">
                                <span
                                    class="text-[8px] font-black text-muted-foreground/40 uppercase mb-0.5"
                                    >Nota da Operação</span
                                >
                                <code
                                    class="text-[9px] text-muted-foreground/70 font-bold"
                                >
                                    (Peso Entrada + Peso Saída) / 2
                                </code>
                            </div>
                            <div class="flex flex-col">
                                <span
                                    class="text-[8px] font-black text-muted-foreground/40 uppercase mb-0.5"
                                    >Score Final</span
                                >
                                <code
                                    class="text-[9px] text-muted-foreground/40 font-bold"
                                >
                                    Σ (Notas das Operações) / Total de Itens
                                </code>
                            </div>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <div
                            class="flex justify-between items-center text-[10px]"
                        >
                            <span
                                class="text-muted-foreground/50 font-bold uppercase"
                                >Soma dos Scores</span
                            >
                            <span class="text-foreground font-black">
                                {insightData.items
                                    .reduce((acc, item) => {
                                        const isTr = !!item.asset_symbol;
                                        const eSt = emotionalStates.find(
                                            (s) =>
                                                s.id ===
                                                (isTr
                                                    ? item.entry_emotional_state_id
                                                    : item.emotional_state_id),
                                        );
                                        const xSt = isTr
                                            ? emotionalStates.find(
                                                  (s) =>
                                                      s.id ===
                                                      item.exit_emotional_state_id,
                                              )
                                            : null;

                                        const eW = eSt?.weight ?? null;
                                        const xW = xSt?.weight ?? null;
                                        const weights = [eW, xW].filter(
                                            (w) => w !== null,
                                        );
                                        const iScore =
                                            weights.length > 0
                                                ? weights.reduce(
                                                      (a, b) => a + b,
                                                      0,
                                                  ) / weights.length
                                                : 5;

                                        return acc + iScore;
                                    }, 0)
                                    .toFixed(1)}
                            </span>
                        </div>
                        <div
                            class="flex justify-between items-center text-[10px]"
                        >
                            <span
                                class="text-muted-foreground/50 font-bold uppercase"
                                >Quantidade de Itens</span
                            >
                            <span class="text-foreground font-black">
                                {insightData.items.length}
                            </span>
                        </div>
                        <Separator class="bg-border/40" />
                        <div class="flex justify-between items-center">
                            <span
                                class="text-[11px] font-black text-primary uppercase"
                                >Média Final</span
                            >
                            <span class="text-lg font-black text-foreground"
                                >{insightData.avgWeight.toFixed(1)}</span
                            >
                        </div>
                    </div>
                </div>
            </div>
        {/if}
    </Dialog.Content>
</Dialog.Root>

<DailyCheckinDialog bind:open={showCheckinDialog} />

<Dialog.Root bind:open={showDayModal}>
    <Dialog.Content
        class="max-w-2xl bg-popover/90 border-border text-foreground p-0 overflow-hidden backdrop-blur-md"
    >
        {#if selectedDayData}
            <div class="p-6 border-b border-border/40 bg-muted/30">
                <div class="flex items-center justify-between">
                    <div>
                        <h2
                            class="text-xl font-black uppercase tracking-tighter"
                        >
                            Detalhes Psicológicos
                        </h2>
                        <p
                            class="text-xs font-bold text-muted-foreground/60 uppercase mt-1"
                        >
                            {new Date(
                                selectedDayData.date + "T12:00:00",
                            ).toLocaleDateString($locale || "pt-BR", {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                            })}
                        </p>
                    </div>
                    <div class="flex-1 overflow-y-auto min-h-0">
                        <div class="p-6 space-y-8">
                            <!-- Day Breakdown -->
                            <div class="space-y-4">
                                <h4
                                    class="text-xs font-black text-muted-foreground/60 uppercase tracking-widest flex items-center gap-2"
                                >
                                    <TrendingUp class="w-3 h-3" />
                                    Operações do Dia
                                    {#if selectedCurrency}
                                        <Badge
                                            variant="outline"
                                            class="text-[9px] font-black uppercase text-primary border-primary/20 bg-primary/5"
                                        >
                                            Filtro: {selectedCurrency}
                                        </Badge>
                                    {/if}
                                </h4>

                                {#each selectedDayData.trades.filter((t: any) => !selectedCurrency || accountsStore.accounts.find((a) => a.id === t.account_id)?.currency === selectedCurrency) as trade}
                                    <div
                                        class="p-4 rounded-xl border border-border/40 bg-muted/20 hover:bg-accent/10 transition-colors"
                                    >
                                        <div
                                            class="flex items-center justify-between mb-3"
                                        >
                                            <div
                                                class="flex items-center gap-3"
                                            >
                                                <Badge
                                                    class="h-5 font-black uppercase bg-primary/10 text-primary border-primary/20"
                                                    >{trade.asset_symbol}</Badge
                                                >
                                                <span
                                                    class="text-[10px] font-bold text-muted-foreground/50"
                                                >
                                                    {new Date(
                                                        trade.date,
                                                    ).toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </span>
                                            </div>
                                            <span
                                                class="text-sm font-black {trade.result >=
                                                0
                                                    ? 'text-emerald-400'
                                                    : 'text-red-400'}"
                                            >
                                                {formatCurrency(
                                                    trade.result,
                                                    accountsStore.accounts.find(
                                                        (a) =>
                                                            a.id ===
                                                            trade.account_id,
                                                    )?.currency || "BRL",
                                                )}
                                            </span>
                                        </div>

                                        <div
                                            class="flex items-center justify-between"
                                        >
                                            <div class="flex flex-col gap-1">
                                                <span
                                                    class="text-[9px] font-black text-muted-foreground/60 uppercase tracking-tighter"
                                                    >Entrada</span
                                                >
                                                {#if trade.entry_emotional_state_id}
                                                    {@const st =
                                                        emotionalStates.find(
                                                            (s) =>
                                                                s.id ===
                                                                trade.entry_emotional_state_id,
                                                        )}
                                                    <span
                                                        class="text-[10px] font-black uppercase {st?.impact ===
                                                        'Positive'
                                                            ? 'text-emerald-400'
                                                            : 'text-red-400'}"
                                                    >
                                                        {st?.name}
                                                    </span>
                                                {/if}
                                            </div>
                                            {#if trade.intensity}
                                                <div
                                                    class="flex flex-col gap-1"
                                                >
                                                    <span
                                                        class="text-[9px] font-black text-muted-foreground/60 uppercase tracking-tighter"
                                                        >Intensidade</span
                                                    >
                                                    <div
                                                        class="flex items-center gap-1 w-20"
                                                    >
                                                        <div
                                                            class="flex-1 h-1 bg-muted rounded-full overflow-hidden"
                                                        >
                                                            <div
                                                                class="h-full bg-primary"
                                                                style="width: {trade.intensity *
                                                                    10}%"
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            {/if}
                                        </div>
                                        {#if trade.notes}
                                            <div
                                                class="mt-3 p-2 rounded bg-muted/40 border border-border/20"
                                            >
                                                <p
                                                    class="text-[10px] text-muted-foreground/60 italic font-medium leading-relaxed"
                                                >
                                                    "{trade.notes}"
                                                </p>
                                            </div>
                                        {/if}
                                    </div>
                                {/each}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div
                class="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar"
            >
                <!-- Aggregate Stats -->
                <div class="grid grid-cols-2 gap-4">
                    <div
                        class="p-4 rounded-xl border border-border/40 bg-muted/20"
                    >
                        <p
                            class="text-[10px] font-black text-muted-foreground/60 uppercase mb-2"
                        >
                            Estado Dominante
                        </p>
                        {#if selectedDayData.equivalentState}
                            <div class="flex items-center gap-3">
                                <Badge
                                    class="text-xs px-3 h-6 font-black uppercase {selectedDayData
                                        .equivalentState.impact === 'Positive'
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        : 'bg-rose-500/10 text-red-400 border-rose-500/20'}"
                                >
                                    {selectedDayData.equivalentState.name}
                                </Badge>
                                <span
                                    class="text-[10px] font-bold text-muted-foreground/50"
                                    >Peso: {selectedDayData.avgWeight.toFixed(
                                        1,
                                    )}</span
                                >
                            </div>
                        {/if}
                    </div>
                    <div
                        class="p-4 rounded-xl border border-border/40 bg-muted/20"
                    >
                        <p
                            class="text-[10px] font-black text-muted-foreground/60 uppercase mb-2"
                        >
                            Total de Operações
                        </p>
                        <p class="text-xl font-black text-foreground">
                            {selectedDayData.trades.length}
                        </p>
                    </div>
                </div>

                <!-- Trades List with Detailed States -->
                <div class="space-y-3">
                    <h3
                        class="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60"
                    >
                        Breakdown de Operações
                    </h3>
                    <div class="space-y-2">
                        {#each selectedDayData.trades as trade}
                            <div
                                class="p-4 rounded-xl border border-border/40 bg-muted/20 hover:bg-accent/10 transition-colors"
                            >
                                <div
                                    class="flex items-center justify-between mb-3"
                                >
                                    <div class="flex items-center gap-3">
                                        <Badge
                                            class="h-5 font-black uppercase bg-primary/10 text-primary border-primary/20"
                                            >{trade.asset_symbol}</Badge
                                        >
                                        <span
                                            class="text-[10px] font-bold text-muted-foreground/50"
                                        >
                                            {new Date(
                                                trade.date,
                                            ).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </span>
                                    </div>
                                    <span
                                        class="text-sm font-black {trade.result >=
                                        0
                                            ? 'text-emerald-400'
                                            : 'text-red-400'}"
                                    >
                                        {formatCurrency(
                                            trade.result,
                                            accountsStore.accounts.find(
                                                (a) =>
                                                    a.id === trade.account_id,
                                            )?.currency || "BRL",
                                        )}
                                    </span>
                                </div>

                                <div class="flex items-center justify-between">
                                    <div class="flex flex-col gap-1">
                                        <span
                                            class="text-[9px] font-black text-muted-foreground/60 uppercase tracking-tighter"
                                            >Entrada</span
                                        >
                                        {#if trade.entry_emotional_state_id}
                                            {@const st = emotionalStates.find(
                                                (s) =>
                                                    s.id ===
                                                    trade.entry_emotional_state_id,
                                            )}
                                            <span
                                                class="text-[10px] font-black uppercase {st?.impact ===
                                                'Positive'
                                                    ? 'text-emerald-400'
                                                    : 'text-red-400'}"
                                            >
                                                {st?.name}
                                            </span>
                                        {/if}
                                    </div>
                                    {#if trade.intensity}
                                        <div class="flex flex-col gap-1">
                                            <span
                                                class="text-[9px] font-black text-muted-foreground/60 uppercase tracking-tighter"
                                                >Intensidade</span
                                            >
                                            <div
                                                class="flex items-center gap-1 w-20"
                                            >
                                                <div
                                                    class="flex-1 h-1 bg-muted rounded-full overflow-hidden"
                                                >
                                                    <div
                                                        class="h-full bg-primary"
                                                        style="width: {trade.intensity *
                                                            10}%"
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    {/if}
                                </div>
                                {#if trade.notes}
                                    <div
                                        class="mt-3 p-2 rounded bg-muted/40 border border-border/20"
                                    >
                                        <p
                                            class="text-[10px] text-muted-foreground/60 italic font-medium leading-relaxed"
                                        >
                                            "{trade.notes}"
                                        </p>
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    </div>
                </div>
            </div>

            <div
                class="p-4 border-t border-border/40 bg-muted/30 flex justify-end"
            >
                <Button
                    variant="outline"
                    class="h-9 border-border/40 bg-muted/40 hover:bg-accent/10 font-bold uppercase text-[10px]"
                    onclick={() => (showDayModal = false)}
                >
                    Fechar Detalhes
                </Button>
            </div>
        {/if}
    </Dialog.Content>
</Dialog.Root>
