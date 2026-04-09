<script lang="ts">
  import { marketsStore } from "$lib/stores/markets.svelte";
  import { assetsStore } from "$lib/stores/assets.svelte";
  import { assetTypesStore } from "$lib/stores/asset-types.svelte";
  import { page } from "$app/stores";
  import { workspaceStore } from "$lib/stores/workspace.svelte";
  import { tradesStore } from "$lib/stores/trades.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { Card, CardContent } from "$lib/components/ui/card";
  import { Separator } from "$lib/components/ui/separator";
  import * as Tabs from "$lib/components/ui/tabs";
  import * as Sheet from "$lib/components/ui/sheet";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { Label } from "$lib/components/ui/label";
    import { Input } from "$lib/components/ui/input";
    import { Textarea } from "$lib/components/ui/textarea";
    import {
        ArrowLeft,
        TrendingUp,
        Activity,
        Clock,
        Target,
        Calendar,
        Maximize2,
        X,
        Globe,
        FileText,
        ImageIcon,
        Compass,
        Radar,
        AlertTriangle,
        Brain,
        Zap,
    } from "lucide-svelte";
    import GannStrategyAnalyst from "$lib/components/strategies/GannStrategyAnalyst.svelte";
    import StrategyAICard from "$lib/components/strategy/StrategyAICard.svelte";
    import { integrationsStore } from "$lib/stores/integrations.svelte";
    import * as Dialog from "$lib/components/ui/dialog";
    import { onMount, onDestroy } from "svelte";
    import EChart from "$lib/components/ui/echart.svelte";
    import * as echarts from "echarts";
    import { t, locale } from "svelte-i18n";
    import { mode } from "mode-watcher";
    import { invoke } from "@tauri-apps/api/core";
    import { SystemHeader, SystemCard, SystemMetric } from "$lib/components/ui/system";

    // Theme-aware colors for ECharts
    const chartTheme = $derived(
        mode.current === "dark"
            ? {
                  text: "#94a3b8",
                  border: "#334155",
                  grid: "rgba(148, 163, 184, 0.1)",
                  tooltipBg: "rgba(15, 23, 42, 0.9)",
                  tooltipBorder: "#334155",
              }
            : {
                  text: "#64748b",
                  border: "#e2e8f0",
                  grid: "rgba(100, 116, 139, 0.1)",
                  tooltipBg: "rgba(255, 255, 255, 0.9)",
                  tooltipBorder: "#e2e8f0",
              },
    );

    const strategyId = $page.params.id;
    let strategy = $derived(
        workspaceStore.strategies.find((s) => s.id === strategyId),
    );

    // --- PHASE 20 BACKEND MIGRATION ---
    let rustStats = $state<any>(null);
    let isRustLoading = $state(false);

    $effect(() => {
        // Run whenever strategyId or selectedMarketId changes
        if (strategyId) {
            isRustLoading = true;
            invoke("get_strategy_comprehensive_stats", { strategyId, marketId: selectedMarketId })
                .then(res => {
                    rustStats = res;
                    console.log("[Phase 20] UI Successfully Switched to Rust Payload.");
                })
                .catch(err => console.error("Rust Analytics Error:", err))
                .finally(() => isRustLoading = false);
        }
    });

    // Default Stats (Zeroed)
    // Filtered trades based on strategy and selected market
    const strategyTrades = $derived.by(() => {
        let trades = tradesStore.trades.filter(
            (t) => t.strategy_id === strategyId || t.strategy_id === `strategy:${strategyId}` || t.strategy_id === (strategyId || "").replace("strategy:", "")
        );

        if (selectedMarketId) {
            // Only show assets belonging to the selected market
            const marketAssets = assetsStore.assets.filter(a => {
                const assetType = assetTypesStore.assetTypes.find(at => at.id === a.asset_type_id);
                return assetType?.market_id === selectedMarketId;
            });
            const marketAssetSymbols = marketAssets.map((a: any) => a.symbol);
            trades = trades.filter((t: any) =>
                marketAssetSymbols.includes(t.asset_symbol),
            );
        }

        return trades.sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
    });

    // Derived Stats from Rust Payload (Safeguarded Fallbacks)
    const stats = $derived({
        netResult: rustStats?.net_result ?? 0,
        drawdown: rustStats?.drawdown ?? 0,
        winRate: rustStats?.win_rate ?? 0,
        profitFactor: rustStats?.profit_factor ?? 0,
        payoff: rustStats?.payoff ?? 0,
        mathExpectation: rustStats?.math_expectation ?? 0,
        maxDrawdown: rustStats?.max_drawdown ?? 0,
        recoveryFactor: rustStats?.recovery_factor ?? 0,
        planAdherence: rustStats?.plan_adherence ?? 0,
        totalTrades: rustStats?.total_trades ?? 0,
        winningTrades: rustStats?.winning_trades ?? 0,
        bestTrade: rustStats?.best_trade ?? 0,
        worstTrade: rustStats?.worst_trade ?? 0,
        avgDurationWin: rustStats?.avg_duration_win ?? 0,
        avgDurationLoss: rustStats?.avg_duration_loss ?? 0,
        avgTimeBetweenTrades: rustStats?.avg_time_between_trades ?? 0,
        equityCurve: rustStats?.equity_curve ?? { dates: [], data: [] },
        drawdownCurve: rustStats?.drawdown_curve ?? { dates: [], data: [] },
        // Phase 21: Decision Layer Data (Not yet rendered)
        diagnostic: rustStats?.diagnostic ?? {
            status: "INSUFFICIENT_DATA",
            recent_trend: "INSUFFICIENT_DATA",
            stability: "INSUFFICIENT_DATA",
            current_risk: "INSUFFICIENT_DATA",
        },
        psychology: rustStats?.psychology ?? {
            emotion_breakdown: [],
            negative_state_loss_ratio: 0,
        },
        operational: rustStats?.operational ?? {
            best_time_of_day: null,
            worst_time_of_day: null,
            best_asset: null,
            worst_asset: null,
            best_direction: null,
        },
    });

    const hasActiveAiProvider = $derived(
        integrationsStore.apiConfigs.some(
            (c) => c.enabled && (c.id === integrationsStore.psychologyApiId || c.provider === "openai" || c.provider === "google_gemini")
        )
    );

    const aiMetricsPayload = $derived({
        strategy_name: strategy?.name || "Desconhecida",
        status: stats.diagnostic.status,
        current_risk: stats.diagnostic.current_risk,
        stability: stats.diagnostic.stability,
        recent_trend: stats.diagnostic.recent_trend,
        best_asset: stats.operational.best_asset,
        worst_asset: stats.operational.worst_asset,
        best_time_of_day: stats.operational.best_time_of_day,
        worst_time_of_day: stats.operational.worst_time_of_day,
        best_direction: stats.operational.best_direction,
        negative_state_loss_ratio: stats.psychology.negative_state_loss_ratio,
        top_positive_emotion: [...stats.psychology.emotion_breakdown].sort((a: any, b: any) => b.net_result - a.net_result)[0]?.emotion_name || null,
        top_negative_emotion: [...stats.psychology.emotion_breakdown].sort((a: any, b: any) => a.net_result - b.net_result)[0]?.emotion_name || null,
        win_rate: stats.winRate,
        profit_factor: stats.profitFactor,
        max_drawdown: stats.maxDrawdown,
        recovery_factor: stats.recoveryFactor
    });

    // Reference Price for Gann Analysis
    const gannRefPrice = $derived(strategyTrades.length > 0 ? Number(strategyTrades[0].entry_price) : 0);

    // Chart Options Generators
    const equityOptions = $derived({
        backgroundColor: "transparent",
        tooltip: {
            trigger: "axis",
            backgroundColor: "var(--popover)",
            borderColor: "var(--border)",
            textStyle: { color: "var(--foreground)" },
            formatter: (params: any) => {
                const p = params[0];
                return `<div class="font-bold mb-1">${p.name}</div>
                        <div class="text-emerald-500 font-black">${formatCurrency(p.value)}</div>`;
            },
        },
        grid: {
            left: "3%",
            right: "4%",
            bottom: "8%",
            top: "10%",
            containLabel: true,
        },
        xAxis: {
            type: "category",
            boundaryGap: false,
            data: stats.equityCurve.dates,
            axisLine: { lineStyle: { color: chartTheme.border } },
            axisLabel: { color: chartTheme.text, fontSize: 10 },
        },
        yAxis: {
            type: "value",
            splitLine: { lineStyle: { color: chartTheme.grid } },
            axisLabel: {
                color: chartTheme.text,
                fontSize: 10,
                formatter: (value: number) =>
                    new Intl.NumberFormat($locale || "pt-BR", {
                        notation: "compact",
                        style: "currency",
                        currency: "BRL",
                    }).format(value),
            },
        },
        series: [
            {
                name: "Capital",
                type: "line",
                step: "end", // Professional execution view
                symbol: "circle",
                symbolSize: 4,
                lineStyle: { width: 3, color: "#10b981" },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: "rgba(16, 185, 129, 0.2)" },
                        { offset: 1, color: "rgba(16, 185, 129, 0.0)" },
                    ]),
                },
                data: stats.equityCurve.data,
            },
        ],
    });

    const drawdownOptions = $derived({
        backgroundColor: "transparent",
        tooltip: {
            trigger: "axis",
            backgroundColor: "var(--popover)",
            borderColor: "var(--border)",
            textStyle: { color: "var(--foreground)" },
            formatter: (params: any) => {
                const p = params[0];
                return `<div class="font-bold mb-1">${p.name}</div>
                        <div class="text-rose-500 font-black">${formatCurrency(p.value)}</div>`;
            },
        },
        grid: {
            left: "3%",
            right: "4%",
            bottom: "8%",
            top: "10%",
            containLabel: true,
        },
        xAxis: {
            type: "category",
            boundaryGap: false,
            data: stats.drawdownCurve.dates,
            show: false,
        },
        yAxis: {
            type: "value",
            inverse: true,
            splitLine: { lineStyle: { color: chartTheme.grid } },
            axisLabel: {
                color: chartTheme.text,
                fontSize: 10,
                formatter: (value: number) =>
                    new Intl.NumberFormat($locale || "pt-BR", {
                        notation: "compact",
                        style: "currency",
                        currency: "BRL",
                    }).format(value),
            },
        },
        series: [
            {
                name: "Drawdown",
                type: "line",
                step: "end",
                symbol: "none",
                lineStyle: { width: 2, color: "#f43f5e" }, // Rose-500
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: "rgba(244, 63, 94, 0.3)" },
                        { offset: 1, color: "rgba(244, 63, 94, 0.0)" },
                    ]),
                },
                data: stats.drawdownCurve.data,
            },
        ],
    });

    // Helper
    function formatCurrency(val: number) {
        return new Intl.NumberFormat($locale || "pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(val);
    }

    // Heatmap - Dynamic based on market trading hours
    let dayNames = $derived([
        $t("common.weekdays.short.sun"),
        $t("common.weekdays.short.mon"),
        $t("common.weekdays.short.tue"),
        $t("common.weekdays.short.wed"),
        $t("common.weekdays.short.thu"),
        $t("common.weekdays.short.fri"),
        $t("common.weekdays.short.sat"),
    ]);

    // Get available markets for this strategy
    const availableMarkets = $derived.by(() => {
        if (!strategy) return [];

        // If strategy has market_ids, use them
        if (strategy.market_ids?.length) {
            return marketsStore.markets.filter((m) =>
                strategy.market_ids.includes(m.id),
            );
        }

        // Fallback: infer from assets
        const assetSymbol = strategy.specific_assets[0];
        const asset = assetsStore.assets.find(
            (a) => a.symbol === assetSymbol,
        );
        if (!asset) return [];
        const assetType = assetTypesStore.assetTypes.find(
            (t) => t.id === asset.asset_type_id,
        );
        if (!assetType) return [];
        const market = marketsStore.markets.find(
            (m) => m.id === assetType.market_id,
        );
        return market ? [market] : [];
    });

    // Selected market for heatmap filter
    let selectedMarketId = $state<string | null>(null);

    // Initial load: logic to determine if we should auto-select a market or show "All"
    let initialized = $state(false);
    $effect(() => {
        if (!initialized && availableMarkets.length > 0) {
            // By default, if there are available markets, we can auto-select the first one
            // or keep it as null (All). Let's default to null to show "All" initially.
            // selectedMarketId = availableMarkets[0].id; // Removed auto-selection to show "All" by default
            initialized = true;
        }
    });

    const market = $derived(
        marketsStore.markets.find((m) => m.id === selectedMarketId) ?? null,
    );

    // Generate hour labels from trading sessions
    const hourLabels = $derived.by(() => {
        if (!market?.trading_sessions?.length) {
            // Default: 9h-18h
            return Array.from({ length: 10 }, (_, i) => `${9 + i}h`);
        }
        const hours: string[] = [];
        for (const session of market.trading_sessions) {
            const startH = parseInt(session.start_time.split(":")[0]);
            const endH = parseInt(session.end_time.split(":")[0]);
            for (let h = startH; h <= endH; h++) {
                const label = `${h}h`;
                if (!hours.includes(label)) hours.push(label);
            }
        }
        return hours.sort((a, b) => parseInt(a) - parseInt(b));
    });

    // Trading days for this market
    const days = $derived.by(() => {
        if (!market?.trading_days?.length) {
            return ["Seg", "Ter", "Qua", "Qui", "Sex"];
        }
        return market.trading_days.map((d) => dayNames[d]);
    });

    // Heatmap Grid from Rust Payload (Sliced for Matrix bounds)
    const blocks = $derived.by(() => {
        const defaultMatrix = Array(days.length).fill(0).map(() => Array(hourLabels.length).fill(0));
        if (!rustStats?.heatmap) return defaultMatrix;
        
        const targetDaysIndices = market?.trading_days?.length ? market.trading_days : [1, 2, 3, 4, 5];
        
        return targetDaysIndices.map(dayIndex => {
            const rustRow = rustStats.heatmap[dayIndex] || Array(24).fill(0);
            return hourLabels.map(hourStr => {
                const hourIndex = parseInt(hourStr);
                return rustRow[hourIndex] || 0;
            });
        });
    });

    function getBlockColor(val: number) {
        if (val === 0) return "bg-muted/10 hover:bg-muted/20";
        if (val > 0) {
            return val > 1000
                ? "bg-emerald-600 hover:bg-emerald-500"
                : "bg-emerald-500/60 hover:bg-emerald-400/80";
        } else {
            return val < -1000
                ? "bg-rose-700 hover:bg-rose-600"
                : "bg-rose-500/60 hover:bg-rose-400/80";
        }
    }

    // Image viewer logic
    let selectedImageIndex = $state<number | null>(null);
    let isCockpitOpen = $state(false);

</script>

{#if !strategy}
    <div class="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h2 class="text-xl font-bold">{$t("strategy.notFound")}</h2>
        <Button href="/strategies" variant="outline"
            >{$t("general.back")}</Button
        >
    </div>
{:else}
    <div class="space-y-4 p-2 md:p-0 transition-opacity duration-300 {isRustLoading ? 'opacity-50 pointer-events-none scale-[0.99]' : 'opacity-100 scale-100'}">
        <!-- Header -->
        <SystemHeader 
            title={strategy.name}
            variant="page"
            class="mb-4"
        >
            {#snippet leading()}
                <Button
                    variant="ghost"
                    size="icon"
                    href="/strategies"
                    class="h-8 w-8 mr-2"
                >
                    <ArrowLeft class="w-4 h-4" />
                </Button>
            {/snippet}
            {#snippet actions()}
                <div class="flex items-center gap-3">
                    <Badge variant="outline" class="font-mono text-xs">
                        {strategy.specific_assets[0] || $t("strategyDossier.multi")}
                    </Badge>
                    <Button variant="outline" size="sm" onclick={() => isCockpitOpen = true} class="gap-2 bg-background/50 backdrop-blur-sm border-dashed border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors">
                        <Radar class="w-4 h-4" />
                        {$t("aiCockpit.ctaBtn")}
                    </Button>
                </div>
            {/snippet}
        </SystemHeader>
            
            <Sheet.Root bind:open={isCockpitOpen}>
                <Sheet.Content side="right" class="w-full sm:max-w-md overflow-y-auto bg-background/95 backdrop-blur-xl border-l-border/50 p-6">
                    <Sheet.Header class="mb-6">
                        <Sheet.Title class="flex items-center gap-2">
                            <Radar class="w-5 h-5 text-emerald-500" />
                            {$t("aiCockpit.ctaBtn")}
                        </Sheet.Title>
                        <Sheet.Description>{$t("aiCockpit.ai.desc")}</Sheet.Description>
                    </Sheet.Header>

                    <!-- Bloco 1: Saúde da Estratégia -->
                    <div class="space-y-4 mb-8">
                        <SystemHeader 
                            title={$t("aiCockpit.health.title")}
                            icon={Activity}
                            class="mb-3"
                        />
                        {#if stats.diagnostic.status === "INSUFFICIENT_DATA"}
                            <div class="text-sm italic text-muted-foreground p-4 border border-dashed rounded-lg bg-muted/10 text-center">{$t("aiCockpit.ai.insufficientVolume")}</div>
                        {:else}
                            <div class="grid grid-cols-2 gap-2">
                                <div class="p-3 rounded-lg border bg-background/50 flex flex-col gap-1">
                                    <span class="text-[10px] text-muted-foreground font-bold uppercase">{$t("aiCockpit.health.status")}</span>
                                    <span class="text-xs font-black {stats.diagnostic.status === 'HOT' ? 'text-emerald-500' : stats.diagnostic.status === 'COLD' ? 'text-rose-500' : 'text-amber-500'}">
                                        {$t(`aiCockpit.values.${stats.diagnostic.status}`) || stats.diagnostic.status}
                                    </span>
                                </div>
                                <div class="p-3 rounded-lg border bg-background/50 flex flex-col gap-1">
                                    <span class="text-[10px] text-muted-foreground font-bold uppercase">{$t("aiCockpit.health.currentRisk")}</span>
                                    <span class="text-xs font-black {stats.diagnostic.current_risk === 'LOW' ? 'text-emerald-500' : stats.diagnostic.current_risk === 'CRITICAL' ? 'text-rose-500' : 'text-amber-500'}">
                                        {$t(`aiCockpit.values.${stats.diagnostic.current_risk}`) || stats.diagnostic.current_risk}
                                    </span>
                                </div>
                                <div class="p-3 rounded-lg border bg-background/50 flex flex-col gap-1 col-span-2">
                                    <span class="text-[10px] text-muted-foreground font-bold uppercase">{$t("aiCockpit.health.stability")}</span>
                                    <span class="text-xs font-black {stats.diagnostic.stability === 'STABLE' ? 'text-blue-500' : 'text-amber-500'}">
                                        {$t(`aiCockpit.values.${stats.diagnostic.stability}`) || stats.diagnostic.stability}
                                    </span>
                                </div>
                            </div>
                        {/if}
                    </div>

                    <!-- Bloco 2: Estratégia x Psicologia -->
                    <div class="space-y-4 mb-8">
                        <SystemHeader 
                            title={$t("aiCockpit.psychology.title")}
                            icon={Brain}
                            class="mb-3"
                        />
                        {#if stats.psychology.emotion_breakdown.length === 0}
                             <div class="text-sm italic text-muted-foreground p-4 border border-dashed rounded-lg bg-muted/10 text-center">{$t("aiCockpit.ai.insufficientVolume")}</div>
                        {:else}
                            <div class="p-3 rounded-lg border bg-rose-500/10 border-rose-500/20 mb-3 flex items-center justify-between">
                                <span class="text-xs font-semibold text-rose-400">Taxa de Perda por Indisciplina:</span>
                                <span class="text-sm font-black text-rose-500">{stats.psychology.negative_state_loss_ratio.toFixed(1)}%</span>
                            </div>
                            <div class="space-y-2">
                                {#each [...stats.psychology.emotion_breakdown].sort((a: any, b: any) => b.trade_count - a.trade_count).slice(0, 3) as emo}
                                    <div class="flex items-center justify-between p-2 rounded-md bg-muted/20 text-xs">
                                        <span class="font-semibold uppercase tracking-wider">{emo.emotion_name || "N/A"}</span>
                                        <div class="flex gap-3 text-muted-foreground">
                                            <span title="Win Rate" class="{emo.win_rate > 50 ? 'text-emerald-500' : 'text-rose-500'} font-bold">{(emo.win_rate).toFixed(0)}% {$t("aiCockpit.values.winRateShort")}</span>
                                            <span title="Net Result" class="{emo.net_result >= 0 ? 'text-emerald-500' : 'text-rose-500'}">{formatCurrency(emo.net_result)}</span>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>

                    <!-- Bloco 3: Raio-X Operacional -->
                    <div class="space-y-4 mb-8">
                        <SystemHeader 
                            title={$t("aiCockpit.xray.title")}
                            icon={Target}
                            class="mb-3"
                        />
                        {#if !stats.operational.best_asset && !stats.operational.best_time_of_day}
                            <div class="text-sm italic text-muted-foreground p-4 border border-dashed rounded-lg bg-muted/10 text-center">{$t("aiCockpit.ai.insufficientVolume")}</div>
                        {:else}
                            <div class="grid grid-cols-2 gap-2 text-xs">
                                <div class="p-2 border rounded-md">
                                    <div class="text-[9px] text-muted-foreground mb-1">{$t("aiCockpit.xray.bestAsset").toUpperCase()}</div>
                                    <div class="font-bold text-emerald-500">{stats.operational.best_asset || "N/A"}</div>
                                </div>
                                <div class="p-2 border rounded-md">
                                    <div class="text-[9px] text-muted-foreground mb-1">{$t("aiCockpit.xray.worstAsset").toUpperCase()}</div>
                                    <div class="font-bold text-rose-500">{stats.operational.worst_asset || "N/A"}</div>
                                </div>
                                <div class="p-2 border rounded-md">
                                    <div class="text-[9px] text-muted-foreground mb-1">{$t("aiCockpit.xray.bestTime").toUpperCase()}</div>
                                    <div class="font-bold text-emerald-500">{stats.operational.best_time_of_day ? `${stats.operational.best_time_of_day}h` : "N/A"}</div>
                                </div>
                                <div class="p-2 border rounded-md">
                                    <div class="text-[9px] text-muted-foreground mb-1">{$t("aiCockpit.xray.worstTime").toUpperCase()}</div>
                                    <div class="font-bold text-rose-500">{stats.operational.worst_time_of_day ? `${stats.operational.worst_time_of_day}h` : "N/A"}</div>
                                </div>
                                <div class="p-2 border rounded-md col-span-2 text-center bg-muted/10">
                                    <div class="text-[9px] text-muted-foreground mb-1">{$t("aiCockpit.xray.bestSide").toUpperCase()}</div>
                                    <div class="font-bold uppercase tracking-widest text-blue-500">
                                        {$t(`aiCockpit.values.${stats.operational.best_direction}`) || stats.operational.best_direction || "N/A"}
                                    </div>
                                </div>
                            </div>
                        {/if}
                    </div>

                    <!-- Bloco 4: Leitura Resumida -->
                    <div class="p-4 rounded-xl border-l-4 {stats.diagnostic.current_risk === 'CRITICAL' ? 'border-rose-500 bg-rose-500/5' : stats.diagnostic.status === 'HOT' ? 'border-emerald-500 bg-emerald-500/5' : 'border-blue-500 bg-blue-500/5'}">
                        <div class="font-bold text-sm mb-2 flex items-center gap-2">
                            <Zap class="w-4 h-4" /> {$t("aiCockpit.ai.title")}
                        </div>
                        <p class="text-xs text-muted-foreground leading-relaxed">
                            {#if stats.diagnostic.status === "INSUFFICIENT_DATA"}
                                {$t("strategies.aiCockpit.ai.actions.continue")}
                            {:else if stats.diagnostic.current_risk === "CRITICAL"}
                                {$t("strategies.aiCockpit.ai.messages.critical")} 
                                <span class="font-bold text-rose-500 block mt-2">{$t("strategies.aiCockpit.ai.actions.reduce")}</span>
                            {:else if stats.diagnostic.status === "HOT" && stats.diagnostic.current_risk === "LOW"}
                                {$t("strategies.aiCockpit.ai.messages.hot")}
                                <span class="font-bold text-emerald-500 block mt-2">{$t("strategies.aiCockpit.ai.actions.maintain")}</span>
                            {:else}
                                {$t("strategies.aiCockpit.ai.messages.maturing")}
                                <span class="font-bold text-blue-500 block mt-2">
                                    {$t("strategies.aiCockpit.ai.actions.bias", { values: { direction: $t(`strategies.aiCockpit.values.${stats.operational.best_direction}`) || stats.operational.best_direction || "N/A" } })}
                                </span>
                            {/if}
                        </p>
                    </div>

                    <!-- Bloco AI Executive Removido do Drawer para evitar duplicidade, mantendo apenas raw stats aqui -->
                </Sheet.Content>
            </Sheet.Root>

        <Tabs.Root value="dashboard" class="w-full">
            <Tabs.List class="grid w-full grid-cols-3 mb-4">
                <Tabs.Trigger value="dashboard"
                    >{$t("strategyDashboard.tabs.dashboard")}</Tabs.Trigger
                >
                <Tabs.Trigger value="dossier"
                    >{$t("strategyDashboard.tabs.dossier")}</Tabs.Trigger
                >
                <Tabs.Trigger value="gann" class="gap-2">
                    <Compass class="w-3.5 h-3.5" />
                    {$t("strategyDashboard.tabs.gann")}
                </Tabs.Trigger>
            </Tabs.List>

            <!-- TAB 1: DASHBOARD -->
            <Tabs.Content value="dashboard" class="space-y-4">
                <!-- Market Chips (Filtering) -->
                <div class="flex flex-wrap gap-2 mb-2 p-1">
                    <Button
                        variant={selectedMarketId === null
                            ? "default"
                            : "outline"}
                        size="sm"
                        class="h-7 px-3 text-[10px] font-bold tracking-wider uppercase transition-all"
                        onclick={() => (selectedMarketId = null)}
                    >
                        {$t("common.all")}
                    </Button>
                    {#each availableMarkets as m}
                        <Button
                            variant={selectedMarketId === m.id
                                ? "default"
                                : "outline"}
                            size="sm"
                            class="h-7 px-3 text-[10px] font-bold tracking-wider uppercase transition-all"
                            onclick={() => (selectedMarketId = m.id)}
                        >
                            {m.code}
                        </Button>
                    {/each}
                    {#if availableMarkets.length === 0}
                        <div class="text-[10px] text-muted-foreground italic">
                            {$t("strategyDashboard.heatmap.noMarket")}
                        </div>
                    {/if}
                </div>

                <!-- Top Section: Charts & Main KPIs (6:1 Grid) -->
                <div class="flex flex-col xl:grid xl:grid-cols-7 gap-4">
                    <!-- LEFT SIDE: Charts & Heatmap (6 cols) -->
                    <div class="col-span-6 flex flex-col gap-4">
                        <div
                            class="grid grid-cols-1 md:grid-cols-2 gap-4 h-[380px]"
                        >
                            <!-- Equity Chart -->
                            <Card
                                class="flex flex-col border shadow-md bg-card/60 backdrop-blur-xl border-l-4 border-l-emerald-500"
                            >
                                <CardContent class="p-4 flex-1 flex flex-col">
                                    <div
                                        class="flex justify-between items-center mb-4"
                                    >
                                        <SystemHeader 
                                            title={$t("strategyDashboard.charts.equityStrategy")}
                                            variant="section"
                                            class="mb-0"
                                        />
                                        <span
                                            class="text-xl font-mono font-black {stats.netResult >= 0 ? 'text-emerald-500' : 'text-rose-500'} tabular-nums tracking-tight"
                                        >
                                            {formatCurrency(stats.netResult)}
                                        </span>
                                    </div>
                                    <div class="flex-1 w-full relative min-h-0">
                                        {#if strategyTrades.length > 0}
                                            {#key stats}
                                                <EChart
                                                    options={equityOptions}
                                                    class="absolute inset-0"
                                                />
                                            {/key}
                                        {:else}
                                            <div
                                                class="absolute inset-0 flex items-center justify-center text-muted-foreground italic text-xs"
                                            >
                                                {$t(
                                                    "strategy.dashboard.messages.noTrades",
                                                )}
                                            </div>
                                        {/if}
                                    </div>
                                </CardContent>
                            </Card>

                            <!-- Drawdown Chart -->
                            <Card
                                class="flex flex-col border shadow-md bg-card/60 backdrop-blur-xl border-l-4 border-l-rose-500"
                            >
                                <CardContent class="p-4 flex-1 flex flex-col">
                                    <div
                                        class="flex justify-between items-center mb-4"
                                    >
                                        <SystemHeader 
                                            title={$t("strategyDashboard.charts.drawdown")}
                                            variant="section"
                                            class="mb-0"
                                        />
                                        <span
                                            class="text-xl font-mono font-black text-rose-500 tabular-nums tracking-tight"
                                        >
                                            {formatCurrency(stats.drawdown)}
                                        </span>
                                    </div>
                                    <div class="flex-1 w-full relative min-h-0">
                                        {#if strategyTrades.length > 0}
                                            {#key stats}
                                                <EChart
                                                    options={drawdownOptions}
                                                    class="absolute inset-0"
                                                />
                                            {/key}
                                        {:else}
                                            <div
                                                class="absolute inset-0 flex items-center justify-center text-muted-foreground italic text-xs"
                                            >
                                                {$t(
                                                    "strategy.dashboard.messages.noTrades",
                                                )}
                                            </div>
                                        {/if}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <!-- Heatmap Area (integrated into left column) -->
                        <Card
                            class="border shadow-md bg-card/60 backdrop-blur-xl flex flex-col h-[280px]"
                        >
                            <CardContent class="p-4 flex-1 flex flex-col">
                                <div
                                    class="flex justify-between items-center mb-4 px-2"
                                >
                                    <SystemHeader 
                                        title={$t("strategyDashboard.heatmap.title")}
                                        variant="section"
                                        class="mb-0"
                                    />
                                    <div
                                        class="flex gap-4 text-[10px] font-medium"
                                    >
                                        <span class="flex items-center gap-1.5"
                                            ><div
                                                class="w-2.5 h-2.5 rounded-full bg-rose-700"
                                            ></div>
                                            {$t(
                                                "strategyDashboard.heatmap.legend.strongLoss",
                                            )}</span
                                        >
                                        <span class="flex items-center gap-1.5"
                                            ><div
                                                class="w-2.5 h-2.5 rounded-full bg-emerald-700"
                                            ></div>
                                            {$t(
                                                "strategyDashboard.heatmap.legend.strongProfit",
                                            )}</span
                                        >
                                    </div>
                                </div>
                                <div class="flex-1 w-full min-h-[180px]">
                                    <div
                                        class="grid gap-1.5 h-full"
                                        style="grid-template-columns: max-content repeat({hourLabels.length}, minmax(0, 1fr)); grid-template-rows: repeat({days.length}, 1fr);"
                                    >
                                        {#each days as day, i}
                                            <div
                                                class="flex items-center text-[10px] text-muted-foreground font-bold pr-3"
                                            >
                                                {day}
                                            </div>
                                            {#each blocks[i] as val, j}
                                                <Tooltip.Root>
                                                    <Tooltip.Trigger
                                                        class={`rounded-sm transition-all hover:scale-110 hover:z-10 w-full h-full shadow-sm ${getBlockColor(val)}`}
                                                    />
                                                    <Tooltip.Content>
                                                        <div
                                                            class="text-xs font-bold"
                                                        >
                                                            {day} - {hourLabels[
                                                                j
                                                            ]}
                                                        </div>
                                                        <div
                                                            class="text-[10px] text-muted-foreground"
                                                        >
                                                            {formatCurrency(
                                                                val,
                                                            )}
                                                        </div>
                                                    </Tooltip.Content>
                                                </Tooltip.Root>
                                            {/each}
                                        {/each}

                                        <!-- Hour Labels (Bottom Row) -->
                                        <div class="p-1"></div>
                                        <!-- Empty spacer for days column -->
                                        {#each hourLabels as hour}
                                            <div
                                                class="text-[8px] text-muted-foreground font-bold text-center pt-1 border-t border-muted/20"
                                            >
                                                {hour}
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <!-- RIGHT SIDE: Integrated Sidebar (1 col) -->
                    <div class="col-span-1 flex flex-col gap-2 h-[676px]">
                        <!-- 1. Net Result -->
                        <SystemCard 
                            status={stats.netResult >= 0 ? "success" : "danger"}
                            class="flex-1 h-[78px] p-2 flex flex-col justify-center items-center text-center overflow-hidden"
                        >
                            <SystemMetric 
                                label={$t("strategyDashboard.stats.netResult")}
                                value={formatCurrency(stats.netResult)}
                                status={stats.netResult >= 0 ? "success" : "danger"}
                                class="w-full items-center"
                                valueClass="text-base"
                            />
                        </SystemCard>

                        <!-- 2. Win Rate -->
                        <SystemCard 
                            status="info"
                            class="flex-1 h-[78px] p-2 flex flex-col justify-center items-center text-center overflow-hidden"
                        >
                            <SystemMetric 
                                label={$t("strategyDashboard.stats.winRate")}
                                value={`${stats.winRate.toFixed(1)}%`}
                                status="info"
                                class="w-full items-center"
                                valueClass="text-base"
                            />
                        </SystemCard>

                        <!-- 3. Profit Factor -->
                        <SystemCard 
                            status="warning"
                            class="flex-1 h-[78px] p-2 flex flex-col justify-center items-center text-center overflow-hidden"
                        >
                            <SystemMetric 
                                label={$t("strategyDashboard.stats.profitFactor")}
                                value={stats.profitFactor.toFixed(2)}
                                status="warning"
                                class="w-full items-center"
                                valueClass="text-base"
                            />
                        </SystemCard>

                        <!-- 4. Payoff -->
                        <SystemCard 
                            status="info"
                            class="flex-1 h-[78px] p-2 flex flex-col justify-center items-center text-center overflow-hidden"
                        >
                            <SystemMetric 
                                label={$t("strategyDashboard.stats.payoff")}
                                value={stats.payoff.toFixed(2)}
                                status="info"
                                class="w-full items-center"
                                valueClass="text-base text-cyan-400"
                            />
                        </SystemCard>

                        <!-- 5. Math Expectation -->
                        <SystemCard 
                            status="none"
                            class="flex-1 h-[78px] p-2 flex flex-col justify-center items-center text-center overflow-hidden"
                        >
                            <SystemMetric 
                                label={$t("strategyDashboard.stats.mathExpectation")}
                                value={formatCurrency(stats.mathExpectation)}
                                status="none"
                                class="w-full items-center"
                                valueClass="text-sm opacity-80"
                            />
                        </SystemCard>

                        <!-- 6. Max Drawdown -->
                        <SystemCard 
                            status="danger"
                            class="flex-1 h-[78px] p-2 flex flex-col justify-center items-center text-center overflow-hidden"
                        >
                            <SystemMetric 
                                label={$t("strategyDashboard.stats.maxDrawdown")}
                                value={formatCurrency(stats.maxDrawdown)}
                                status="danger"
                                class="w-full items-center"
                                valueClass="text-base"
                            />
                        </SystemCard>

                        <!-- 7. Recovery Factor -->
                        <SystemCard 
                            status="info"
                            class="flex-1 h-[78px] p-2 flex flex-col justify-center items-center text-center overflow-hidden"
                        >
                            <SystemMetric 
                                label={$t("strategyDashboard.stats.recoveryFactor")}
                                value={stats.recoveryFactor.toFixed(2)}
                                status="info"
                                class="w-full items-center"
                                valueClass="text-base"
                            />
                        </SystemCard>

                        <!-- 8. Plan Adherence -->
                        <SystemCard 
                            status="warning"
                            class="flex-1 h-[78px] p-2 flex flex-col justify-center items-center text-center overflow-hidden"
                        >
                            <SystemMetric 
                                label={$t("strategyDashboard.stats.planAdherence")}
                                value={`${stats.planAdherence.toFixed(1)}%`}
                                status="warning"
                                class="w-full items-center"
                                valueClass="text-base opacity-90"
                            />
                        </SystemCard>
                    </div>
                </div>

                <!-- Bottom Metrics Row -->
                <div
                    class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4"
                >
                    <SystemCard 
                        status="none" 
                        class="h-[80px] p-0 flex flex-col justify-center items-center overflow-hidden"
                    >
                        <SystemMetric 
                            label={$t("strategyDashboard.stats.totalTrades")}
                            value={stats.totalTrades}
                            status="none"
                            class="w-full items-center"
                        />
                    </SystemCard>

                    <SystemCard 
                        status="success" 
                        class="h-[80px] p-0 flex flex-col justify-center items-center overflow-hidden"
                    >
                        <SystemMetric 
                            label={$t("strategyDashboard.stats.winningTrades")}
                            value={stats.winningTrades}
                            status="success"
                            class="w-full items-center"
                        />
                    </SystemCard>

                    <SystemCard 
                        status="success" 
                        class="h-[80px] p-0 flex flex-col justify-center items-center overflow-hidden"
                    >
                        <SystemMetric 
                            label={$t("strategyDashboard.stats.bestTrade")}
                            value={formatCurrency(stats.bestTrade)}
                            status="success"
                            class="w-full items-center"
                        />
                    </SystemCard>

                    <SystemCard 
                        status="danger" 
                        class="h-[80px] p-0 flex flex-col justify-center items-center overflow-hidden"
                    >
                        <SystemMetric 
                            label={$t("strategyDashboard.stats.worstTrade")}
                            value={formatCurrency(stats.worstTrade)}
                            status="danger"
                            class="w-full items-center"
                        />
                    </SystemCard>

                    <SystemCard 
                        status="success" 
                        class="h-[80px] p-0 flex flex-col justify-center items-center overflow-hidden"
                    >
                        <SystemMetric 
                            label={$t("strategyDashboard.stats.avgDurationWin")}
                            value={`${stats.avgDurationWin}m`}
                            status="success"
                            class="w-full items-center"
                        />
                    </SystemCard>

                    <SystemCard 
                        status="danger" 
                        class="h-[80px] p-0 flex flex-col justify-center items-center overflow-hidden"
                    >
                        <SystemMetric 
                            label={$t("strategyDashboard.stats.avgDurationLoss")}
                            value={`${stats.avgDurationLoss}m`}
                            status="danger"
                            class="w-full items-center"
                        />
                    </SystemCard>

                    <SystemCard 
                        status="info" 
                        class="h-[80px] p-0 flex flex-col justify-center items-center overflow-hidden"
                    >
                        <SystemMetric 
                            label={$t("strategyDashboard.stats.avgTimeBetweenTrades")}
                            value={`${stats.avgTimeBetweenTrades}d`}
                            status="info"
                            class="w-full items-center"
                        />
                    </SystemCard>
                </div>

                <!-- AI Executive Summary (12/12 pattern) -->
                <div class="mt-2">
                    <StrategyAICard 
                        strategyId={strategyId || ""}
                        periodStr={$t("common.period.allTime")}
                        metricsPayload={aiMetricsPayload}
                        {hasActiveAiProvider}
                    />
                </div>
            </Tabs.Content>

            <!-- TAB 2: DOSSIÊ (Read-only Strategy Details) -->
            <Tabs.Content value="dossier" class="space-y-4">
                <!-- Operational Context -->
                <Card class="border-primary/20 bg-primary/5">
                    <CardContent class="p-4 space-y-3">
                        <div class="flex items-center gap-2 mb-2">
                            <Target class="w-4 h-4 text-primary" />
                            <h3
                                class="text-sm font-semibold tracking-tight uppercase"
                            >
                                {$t("strategyDossier.context")}
                            </h3>
                        </div>

                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <!-- Timeframes -->
                            <div class="space-y-1">
                                <Label
                                    class="text-[10px] text-muted-foreground uppercase font-bold"
                                    >{$t("strategyDossier.timeframes")}</Label
                                >
                                <div class="flex flex-wrap gap-1.5">
                                    {#each strategy.timeframes as tf}
                                        <Badge
                                            variant="secondary"
                                            class="font-mono text-[10px] h-5"
                                            >{tf}</Badge
                                        >
                                    {:else}
                                        <span
                                            class="text-xs text-muted-foreground"
                                            >-</span
                                        >
                                    {/each}
                                </div>
                            </div>
                            <!-- Indicators -->
                            <div class="space-y-1">
                                <Label
                                    class="text-[10px] text-muted-foreground uppercase font-bold"
                                    >{$t("strategyDossier.indicators")}</Label
                                >
                                <div class="flex flex-wrap gap-1.5">
                                    {#each strategy.indicators as ind}
                                        <Badge
                                            variant="outline"
                                            class="bg-background text-[10px] h-5"
                                            >{ind}</Badge
                                        >
                                    {:else}
                                        <span
                                            class="text-xs text-muted-foreground"
                                            >-</span
                                        >
                                    {/each}
                                </div>
                            </div>
                            <!-- Asset Types -->
                            <div class="space-y-1">
                                <Label
                                    class="text-[10px] text-muted-foreground uppercase font-bold"
                                    >{$t("strategyDossier.assetTypes")}</Label
                                >
                                <div class="flex flex-wrap gap-1.5">
                                    {#each strategy.asset_types as at}
                                        <Badge
                                            variant="secondary"
                                            class="text-[10px] h-5">{at}</Badge
                                        >
                                    {:else}
                                        <span
                                            class="text-xs text-muted-foreground"
                                            >-</span
                                        >
                                    {/each}
                                </div>
                            </div>
                            <!-- Specific Assets -->
                            <div class="space-y-1">
                                <Label
                                    class="text-[10px] text-muted-foreground uppercase font-bold"
                                    >{$t(
                                        "strategyDossier.specificAssets",
                                    )}</Label
                                >
                                <div class="flex flex-wrap gap-1.5">
                                    {#each strategy.specific_assets as sa}
                                        <Badge
                                            class="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-[10px] h-5"
                                            >{sa}</Badge
                                        >
                                    {:else}
                                        <span
                                            class="text-xs text-muted-foreground"
                                            >{$t("strategyDossier.all")}</span
                                        >
                                    {/each}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <!-- Linked Markets -->
                <Card>
                    <CardContent class="p-4">
                        <div class="flex items-center gap-2 mb-2">
                            <Globe class="w-4 h-4 text-muted-foreground" />
                            <h3
                                class="text-sm font-semibold text-muted-foreground uppercase tracking-wider"
                            >
                                {$t("strategyDossier.linkedMarkets")}
                            </h3>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            {#each availableMarkets as m}
                                <div
                                    class="flex items-center gap-2 px-2 py-1 rounded-md bg-muted text-xs border"
                                >
                                    <span class="font-bold">{m.code}</span>
                                    {#if m.trading_sessions?.length}
                                        <span
                                            class="text-[10px] text-muted-foreground"
                                            >({m.trading_sessions[0].start_time}
                                            - {m.trading_sessions[0]
                                                .end_time})</span
                                        >
                                    {/if}
                                </div>
                            {:else}
                                <span class="text-xs text-muted-foreground"
                                    >{$t(
                                        "strategyDossier.noLinkedMarket",
                                    )}</span
                                >
                            {/each}
                        </div>
                    </CardContent>
                </Card>

                <!-- Triggers & Logic -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <!-- Entry -->
                    <Card class="border-emerald-500/20 bg-emerald-500/5">
                        <CardContent class="p-4 space-y-2">
                            <h4
                                class="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-2"
                            >
                                <TrendingUp class="w-3 h-3" />
                                {$t("strategyDossier.entryTriggers")}
                            </h4>
                            <div
                                class="bg-background/50 p-3 rounded-md border min-h-[100px] text-xs whitespace-pre-line"
                            >
                                {strategy.entry_criteria ||
                                    $t("strategyDossier.noCriteria")}
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Exit -->
                    <Card class="border-rose-500/20 bg-rose-500/5">
                        <CardContent class="p-4 space-y-2">
                            <h4
                                class="text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center gap-2"
                            >
                                <Activity class="w-3 h-3" />
                                {$t("strategyDossier.exit")}
                            </h4>
                            <div
                                class="bg-background/50 p-3 rounded-md border min-h-[100px] text-xs whitespace-pre-line"
                            >
                                {strategy.exit_criteria ||
                                    $t("strategyDossier.noCriteria")}
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Management -->
                    <Card class="border-blue-500/20 bg-blue-500/5">
                        <CardContent class="p-4 space-y-2">
                            <h4
                                class="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-2"
                            >
                                <Clock class="w-3 h-3" />
                                {$t("strategyDossier.management")}
                            </h4>
                            <div
                                class="bg-background/50 p-3 rounded-md border min-h-[100px] text-xs whitespace-pre-line"
                            >
                                {strategy.management_criteria ||
                                    $t("strategyDossier.noCriteria")}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Partials -->
                {#if strategy.has_partial}
                    <div
                        class="p-4 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5"
                    >
                        <h4
                            class="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2 flex items-center gap-2"
                        >
                            <Target class="w-3 h-3" />
                            {$t("strategyDossier.partials")}
                        </h4>
                        <p class="text-xs whitespace-pre-line text-foreground">
                            {strategy.partial_description || "—"}
                        </p>
                    </div>
                {/if}

                <!-- Visual Examples -->
                <div class="space-y-3">
                    <h3 class="text-sm font-semibold tracking-tight">
                        {$t("strategyDossier.visualExamples")}
                    </h3>
                    <Separator />
                    {#if strategy.images.length > 0}
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {#each strategy.images as img, i}
                                <button
                                    class="relative group aspect-video rounded-lg overflow-hidden border bg-muted"
                                    onclick={() => (selectedImageIndex = i)}
                                >
                                    <img
                                        src={img.path}
                                        alt="Exemplo"
                                        class="w-full h-full object-cover transition-transform group-hover:scale-105"
                                    />
                                    <div
                                        class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    >
                                        <Maximize2 class="w-6 h-6 text-white" />
                                    </div>
                                </button>
                            {/each}
                        </div>
                    {:else}
                        <div
                            class="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg text-muted-foreground"
                        >
                            <ImageIcon class="w-6 h-6 mb-2 opacity-50" />
                            <span class="text-xs"
                                >{$t("strategyDossier.noImages")}</span
                            >
                        </div>
                    {/if}
                </div>
            </Tabs.Content>

            <!-- TAB 3: GANN ANALYSIS -->
            <Tabs.Content value="gann" class="space-y-4">
                <GannStrategyAnalyst trades={strategyTrades} referencePrice={gannRefPrice} />
            </Tabs.Content>
        </Tabs.Root>

        <!-- Gallery Overlay -->
        {#if selectedImageIndex !== null && strategy.images.length > 0}
            <div
                role="button"
                tabindex="0"
                class="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-200 border-0 cursor-default focus:outline-none"
                onclick={() => (selectedImageIndex = null)}
                onkeydown={(e) => {
                    if (e.key === "Escape") selectedImageIndex = null;
                }}
            >
                <button
                    class="absolute top-4 right-4 text-white/50 hover:text-white"
                    onclick={() => (selectedImageIndex = null)}
                >
                    <X class="w-8 h-8" />
                </button>
                <img
                    src={strategy.images[selectedImageIndex].path}
                    alt="Full view"
                    class="max-w-full max-h-[90vh] object-contain rounded-lg border border-white/10 shadow-2xl"
                />
                {#if strategy.images[selectedImageIndex].description}
                    <p
                        class="mt-4 text-white/80 text-center max-w-2xl bg-black/50 p-2 rounded"
                    >
                        {strategy.images[selectedImageIndex].description}
                    </p>
                {/if}
            </div>

        {/if}
    </div>
{/if}

<svelte:window
    onkeydown={(e) => {
        if (e.key === "Escape") selectedImageIndex = null;
    }}
/>
