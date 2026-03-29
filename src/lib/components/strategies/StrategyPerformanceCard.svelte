<script lang="ts">
  import SystemCard from "$lib/components/ui/system/SystemCard.svelte";
  import SystemMetric from "$lib/components/ui/system/SystemMetric.svelte";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { TrendingUp, Activity, Target, ArrowRight, Timer } from "lucide-svelte";
  import type { Strategy } from "$lib/types";
  import { goto } from "$app/navigation";
  import { t } from "svelte-i18n";
  import { formatCurrency } from "$lib/utils";
  import { formatDuration } from "$lib/utils/gann";

  // Stats Interface
  export interface StrategyStats {
    total_trades: number;
    win_rate: number;
    profit_factor: number;
    total_profit: number;
    average_profit: number;
    payoff: number;
    avg_interval?: number;
    currency?: string;
  }

  // Props
  let {
    strategy,
    stats = {
      total_trades: 0,
      win_rate: 0,
      profit_factor: 0,
      total_profit: 0,
      average_profit: 0,
      payoff: 0,
      avg_interval: 0,
    },
  }: { strategy: Strategy; stats?: StrategyStats } = $props();

  // Derived status
  let status: "success" | "danger" = $derived(stats.total_profit >= 0 ? "success" : "danger");
</script>

<SystemCard {status} class="group h-full flex flex-col p-4">
  <!-- Header -->
  <div class="flex justify-between items-start gap-3 mb-4">
    <div class="space-y-1 limit-w-[60%]">
      <h3 class="text-xs font-black uppercase tracking-tight group-hover:text-primary transition-colors truncate">
        {strategy.name}
      </h3>
      <div class="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" class="text-[9px] font-black uppercase tracking-widest bg-background/50 border-white/5 h-4 px-1">
          {stats.total_trades} TRADES
        </Badge>
        {#if strategy.specific_assets.length > 0}
          <Badge variant="secondary" class="text-[8px] h-4 px-1 uppercase tracking-widest opacity-70">
            {strategy.specific_assets[0]}
          </Badge>
        {/if}
      </div>
    </div>
    <div class="text-right shrink-0">
      <SystemMetric 
        label={$t("strategyCard.totalResult")}
        value={formatCurrency(stats.total_profit, stats.currency || "BRL")}
        {status}
        valueClass="text-base"
        class="items-end"
      />
    </div>
  </div>

  <!-- Stats Grid -->
  <div class="grid grid-cols-2 gap-3 flex-1 mb-4">
    <SystemMetric 
      label={$t("strategyDashboard.stats.winRate")}
      value={stats.win_rate.toFixed(1) + "%"}
      status={stats.win_rate >= 50 ? 'success' : 'danger'}
    />
    <SystemMetric 
      label={$t("strategyDashboard.stats.payoff")}
      value={stats.payoff.toFixed(2)}
    />
    <SystemMetric 
      label={$t("strategyDashboard.stats.profitFactor")}
      value={stats.profit_factor.toFixed(2)}
      status={stats.profit_factor >= 1.2 ? 'success' : stats.profit_factor >= 1 ? 'warning' : 'danger'}
    />
    <SystemMetric 
      label={$t("strategyDashboard.stats.avgInterval")}
      value={formatDuration(stats.avg_interval || 0)}
      status="info"
    />
  </div>

  <!-- Action -->
  <div class="mt-auto">
    <Button
      variant="ghost"
      size="sm"
      class="w-full h-8 text-[9px] font-black uppercase tracking-widest group-hover:bg-primary/10 group-hover:text-primary transition-colors justify-between px-2 border border-white/5 hover:border-primary/20"
      onclick={() => goto(`/strategies/${strategy.id}`)}
    >
      {$t("strategyCard.viewAnalysis")}
      <ArrowRight class="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
    </Button>
  </div>
</SystemCard>
