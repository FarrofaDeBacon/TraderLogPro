<script lang="ts">
  import { currenciesStore } from "$lib/stores/currencies.svelte";
  import { riskSettingsStore } from "$lib/stores/risk-settings.svelte";
  import { accountsStore } from "$lib/stores/accounts.svelte";
  import { Button } from "$lib/components/ui/button";
  import { t, locale } from "svelte-i18n";
  import { appStore } from "$lib/stores/app.svelte";
  import { userProfileStore } from "$lib/stores/user-profile.svelte";
  import { tradesStore } from "$lib/stores/trades.svelte";
  import { evolutionStore } from "$lib/stores/evolutionStore.svelte";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
  } from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { Separator } from "$lib/components/ui/separator";
  import * as Dialog from "$lib/components/ui/dialog";
  import NewTradeWizard from "$lib/components/trades/NewTradeWizard.svelte";
  import QuickLog from "$lib/components/trades/QuickLog.svelte";
  import CurrencyTicker from "$lib/components/finance/CurrencyTicker.svelte";
  import OnboardingWizard from "$lib/components/dashboard/OnboardingWizard.svelte";
  import SystemCard from "$lib/components/ui/system/SystemCard.svelte";
  import SystemMetric from "$lib/components/ui/system/SystemMetric.svelte";
  import SystemHeader from "$lib/components/ui/system/SystemHeader.svelte";
  import SystemAICard from "$lib/components/ui/system/SystemAICard.svelte";
  import MindsetSummaryCard from "$lib/components/dashboard/MindsetSummaryCard.svelte";
  import DailyReviewSheet from "$lib/components/trades/DailyReviewSheet.svelte";
  import ScoreBreakdownSheet from "$lib/components/gamification/ScoreBreakdownSheet.svelte";
  import { dailyReviewsStore } from "$lib/stores/daily-reviews.svelte";
  import { gamificationStore } from "$lib/stores/gamification.svelte";
  import {
    Calendar,
    BarChart3,
    ShieldCheck,
    Zap,
    Trophy,
    ArrowUpRight,
    Target,
    BookOpen,
    Wallet,
    Plus,
    Timer,
    Brain,
    AlertTriangle,
    ShieldAlert,
    Flame,
    Info,
    ChevronRight,
    Globe
  } from "lucide-svelte";
  import { cn, parseSafeDate } from "$lib/utils";
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger
  } from "$lib/components/ui/select";
  import { getDashboardStats } from "$lib/domain/stats/stats-engine";


  // --- State ---
  let selectedAccountId = $state<string>("all");
  let isNewTradeOpen = $state(false);
  let isReviewOpen = $state(false);
  let isScoreBreakdownOpen = $state(false);

  const filteredTrades = $derived.by(() => {
    let trades = tradesStore.trades || [];
    if (selectedAccountId !== "all") {
      trades = trades.filter((t: any) => t.account_id === selectedAccountId);
    }
    return trades;
  });

  const selectedAccount = $derived(
    accountsStore.accounts.find((a) => a.id === selectedAccountId),
  );

  const activeProfile = $derived(
    riskSettingsStore.riskProfiles.find(p => p.active) || riskSettingsStore.riskProfiles[0],
  );

  const lastPrice = $derived.by(() => {
    if (!filteredTrades || filteredTrades.length === 0) return 0;
    const sorted = [...filteredTrades].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    return Number(sorted[0].entry_price) || 0;
  });

  const activePlan = $derived(
    activeProfile?.growth_plan_id ? riskSettingsStore.getGrowthPlanForProfile(activeProfile.id) : null
  );

  const activePhase = $derived.by(() => {
    const plan = activePlan;
    if (
      !plan ||
      !plan.phases ||
      plan.current_phase_index === undefined
    )
      return null;
    return plan.phases[plan.current_phase_index] || null;
  });

  // --- Mastery Stats Engine ---
  const totalBalanceBRL = $derived(
    tradesStore.getTotalBalanceBRL(
      accountsStore.accounts,
      currenciesStore.currencies,
    ),
  );

  const stats = $derived.by(() => {
    const start = performance.now();
    const result = getDashboardStats(
      filteredTrades,
      new Date(),
      (t: any) => t.processed_result_brl || 0
    );
    const end = performance.now();
    if (end - start > 16) {
      console.warn(`[Dashboard] Slow stats calculation: ${(end - start).toFixed(2)}ms`);
    }
    return result;
  });

  const growthProgress = $derived.by(() => {
    if (!activePhase) return 0;
    const rule = (activePhase as any).progression_rules?.find(
      (r: any) => r.condition === "profit_target",
    );
    if (!rule) return 0;
    const target = rule.value;
    return Math.min(Math.max((stats.net / (target || 1)) * 100, 0), 100);
  });

  function formatCurrency(val: number) {
    const mainCurrency = userProfileStore.userProfile.main_currency || "BRL";
    return new Intl.NumberFormat($locale || "pt-BR", {
      style: "currency",
      currency: mainCurrency,
    }).format(val);
  }

  const todayStr = $derived(new Date().toISOString().split('T')[0]);
  const hasReviewedToday = $derived(!!dailyReviewsStore.getReviewForDate(todayStr));
  const shouldShowReviewCta = $derived(stats.tradesToday >= 2 || Math.abs(stats.dayResult) > 0);
</script>

{#if appStore.isLoadingData}
  <div class="flex items-center justify-center p-20 min-h-[60vh] w-full">
    <div class="flex flex-col items-center gap-4 text-center">
      <div
        class="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"
      ></div>
      <div class="space-y-1">
        <p
          class="text-sm font-bold text-foreground uppercase tracking-widest animate-pulse"
        >
          {$t("dashboard.syncingTerminal") || "Sincronizando Terminal"}
        </p>
        <p
          class="text-xs text-muted-foreground uppercase font-medium tracking-tighter opacity-70"
        >
          {$t("dashboard.waitingSurvivorData") ||
            "Aguardando dados do Survivor Hub..."}
        </p>
      </div>
    </div>
  </div>
{:else}
  <div class="space-y-4">
    <div class="px-4 pt-2">
      <CurrencyTicker />
    </div>

    {#if !tradesStore.isInitialLoading && tradesStore.trades.length === 0}
      <OnboardingWizard />
    {:else if tradesStore.isInitialLoading}
      <!-- HYDRA V4: LIGHTWEIGHT STRUCTURAL SKELETON -->
      <div class="flex-1 flex flex-col space-y-8 p-4 md:p-8 min-h-screen animate-pulse">
          <div class="h-8 w-64 bg-muted rounded-md mb-2"></div>
          <div class="h-4 w-96 bg-muted/60 rounded-md"></div>
          
          <div class="h-32 w-full bg-card/40 rounded-xl border border-border/40"></div>
          
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div class="h-40 bg-card/60 rounded-xl border border-border/40"></div>
              <div class="h-40 bg-card/60 rounded-xl border border-border/40"></div>
              <div class="h-40 bg-card/60 rounded-xl border border-border/40"></div>
          </div>
          
          <div class="h-24 w-full bg-card/40 rounded-xl border border-border/40"></div>
      </div>
    {:else}
      <div class="flex-1 flex flex-col space-y-3 p-3 md:p-4 min-h-screen">
        <Dialog.Root bind:open={isNewTradeOpen}>
        <Dialog.Content
          class="max-w-3xl max-h-[85vh] p-0 border-0 bg-transparent shadow-none"
        >
          <NewTradeWizard close={() => (isNewTradeOpen = false)} />
        </Dialog.Content>
      </Dialog.Root>

      <DailyReviewSheet bind:open={isReviewOpen} date={todayStr} />

      <!-- TOP Navigation & Survivor Hub (ULTRA COMPACT COCKPIT) -->
      {#snippet dashboardActions()}
        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" onclick={() => isNewTradeOpen = true} class="text-[9px] font-black h-7 uppercase tracking-widest text-muted-foreground hover:text-foreground border-dashed bg-background/20 px-3">
            {$t('dashboard.actions.detailedRegister')}
          </Button>
          <Button size="sm" href="/evolution" class="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 text-[9px] font-black h-7 uppercase tracking-widest shadow-none gap-2 px-3">
            <Brain class="w-3 h-3 shrink-0" />
            {$t('dashboard.actions.evolutionJournal')}
          </Button>
          <Button size="sm" href="/risk-control" class="bg-indigo-600/10 text-indigo-500 hover:bg-indigo-600/20 border border-indigo-500/20 text-[9px] font-black h-7 uppercase tracking-widest shadow-none gap-2 px-3">
            <ShieldCheck class="w-3 h-3 shrink-0" />
            {$t('dashboard.actions.riskControlShort')}
          </Button>
          <Button onclick={() => (isNewTradeOpen = true)} size="sm" class="bg-emerald-600 hover:bg-emerald-700 shadow-lg text-[9px] font-black h-7 uppercase tracking-widest px-4 gap-1.5">
            <Plus class="w-3 h-3" />
            {$t("dashboard.newTrade")}
          </Button>
        </div>
      {/snippet}

      {#snippet dashboardLeading()}
        <div class="flex items-center gap-3">
          <Select type="single" bind:value={selectedAccountId}>
            <SelectTrigger class="w-[140px] h-8 text-[10px] font-bold bg-background/50 border-border/30">
              <div class="flex items-center gap-2">
                <Wallet class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span class="truncate uppercase tracking-tight">
                  {selectedAccountId === "all"
                    ? $t("general.all")
                    : accountsStore.accounts.find((a) => a.id === selectedAccountId)?.nickname || $t("common.account")}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{$t("common.all")}</SelectItem>
              {#each accountsStore.accounts as acc}
                <SelectItem value={acc.id}>{acc.nickname}</SelectItem>
              {/each}
            </SelectContent>
          </Select>
          <Separator orientation="vertical" class="h-7 opacity-20" />
        </div>
      {/snippet}

      <SystemCard status="primary" class="p-2.5 mb-4 bg-primary/5">
        <SystemHeader 
          title={$t("dashboard.title")}
          subtitle={$t("dashboard.terminalHub")}
          icon={Zap}
          variant="page"
          class="mb-0"
          actions={dashboardActions}
          leading={dashboardLeading}
        />
      </SystemCard>

      <!-- OPERATIONAL COCKPIT STATUS (Dense Grid - Assistant + Radar) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-4">
        <!-- Quick Log (5 cols) -->
        <div class="lg:col-span-5 bg-card/60 rounded-xl p-3 border border-border/60 shadow-sm flex flex-col justify-center overflow-hidden">
          <QuickLog />
        </div>

        <!-- AI Assistant & Radar (7 cols) -->
        <div class="lg:col-span-7 flex flex-col gap-3">
           <!-- AI ASSISTANT (Institutional Standard) -->
           <SystemAICard 
              title={$t('dashboard.sections.assistantLabel')}
              status={gamificationStore.proactiveSignals.length > 0 ? "success" : "idle"}
              class="flex-1"
           >
              {#snippet content()}
                {#if gamificationStore.proactiveSignals.length > 0}
                  {@const signal = gamificationStore.proactiveSignals[0]}
                   <div class="flex items-center gap-3">
                      <div class={cn(
                          "w-8 h-8 rounded-full shrink-0 flex items-center justify-center border",
                          signal.type === 'warning' ? "bg-rose-500/20 text-rose-500 border-rose-500/30" : 
                          signal.type === 'reminder' ? "bg-amber-500/20 text-amber-500 border-amber-500/30" : 
                          "bg-emerald-500/20 text-emerald-500 border-emerald-500/30"
                      )}>
                         {#if signal.type === 'warning'} <ShieldAlert class="w-4 h-4" />
                         {:else if signal.type === 'reminder'} <AlertTriangle class="w-4 h-4" />
                         {:else} <Zap class="w-4 h-4" /> {/if}
                      </div>
                      <div class="min-w-0">
                        <h5 class="text-[10px] font-black uppercase text-foreground/90 leading-tight truncate">{signal.title}</h5>
                        <p class="text-[10px] font-bold text-muted-foreground leading-tight line-clamp-1">{signal.message}</p>
                      </div>
                   </div>
                {:else}
                    <div class="flex items-center gap-3">
                       <ShieldCheck class="w-4 h-4 text-emerald-500" />
                       <span class="text-[10px] font-black uppercase text-emerald-500/80">{$t('dashboard.sections.allClear')}</span>
                    </div>
                {/if}
              {/snippet}

              {#snippet matrix()}
                 <div class="flex flex-col gap-2">
                    <SystemHeader 
                      title={$t('dashboard.sections.behavioralRadarLabel')}
                      icon={Brain}
                      variant="compact"
                      class="mb-0 text-indigo-500"
                    />
                    <div class="flex gap-2">
                      {#if stats.insights.length > 0}
                        {#each stats.insights.slice(0, 2) as insight}
                          <div class={cn(
                              "flex-1 p-1.5 rounded-lg border flex items-center gap-2 bg-background/40",
                              insight.type === 'danger' ? "border-rose-500/20 text-rose-500" : 
                              insight.type === 'warning' ? "border-amber-500/20 text-amber-500" : 
                              "border-emerald-500/20 text-emerald-500"
                          )} title={insight.description}>
                            <span class="text-[8px] font-black uppercase tracking-tight truncate">{insight.title}</span>
                          </div>
                        {/each}
                      {:else}
                        <div class="w-full text-center py-1 opacity-40">
                           <span class="text-[8px] font-bold text-muted-foreground tracking-widest uppercase">{$t('dashboard.sections.noAnomalies')}</span>
                        </div>
                      {/if}
                    </div>
                 </div>
              {/snippet}
           </SystemAICard>
        </div>
      </div>

      <!-- EXECSummary Layout (Mindset + Multi-Metrics) -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Mindset Summary (Reintegrated) -->
        <MindsetSummaryCard />

        <!-- Rezult Cards -->
        <SystemCard status={stats.dayResult >= 0 ? 'success' : 'danger'} class="transition-all hover:border-l-8">
           <div class="p-2.5">
              <SystemMetric 
                label={$t('dashboard.stats.todayPnLShort')}
                value={formatCurrency(stats.dayResult)} 
                status={stats.dayResult >= 0 ? 'success' : 'danger'}
                weight="black"
                class="mt-1"
              />
              <div class="mt-3 flex items-center justify-between border-t border-border/20 pt-2">
                <p class="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{$t('dashboard.stats.tradeFrequency')}</p>
                <Badge variant="outline" class="font-mono text-[9px] h-4 bg-background/50 px-1 border-0">{stats.tradesToday}</Badge>
              </div>
           </div>
        </SystemCard>

        <SystemCard status={stats.weekResult >= 0 ? 'success' : 'danger'} class="transition-all hover:border-l-8">
           <div class="p-2.5">
              <SystemMetric 
                label={$t('dashboard.stats.weekPnLShort')}
                value={formatCurrency(stats.weekResult)}
                status={stats.weekResult >= 0 ? 'success' : 'danger'}
                weight="black"
                class="mt-1"
              />
              <div class="flex gap-1.5 mt-3 relative w-full h-5">
                 <div class="flex-1 flex flex-col justify-center items-center rounded-sm bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
                    <div class="flex items-center gap-1">
                       <span class="text-[7px] uppercase font-black tracking-widest">{$t('dashboard.stats.gainLabel')}</span>
                       <span class="text-[9px] font-mono font-bold">{stats.weekPositiveDays}d</span>
                    </div>
                 </div>
                 <div class="flex-1 flex flex-col justify-center items-center rounded-sm bg-rose-500/10 border border-rose-500/20 text-rose-600">
                    <div class="flex items-center gap-1">
                       <span class="text-[7px] uppercase font-black tracking-widest">{$t('dashboard.stats.lossLabel')}</span>
                       <span class="text-[9px] font-mono font-bold">{stats.weekNegativeDays}d</span>
                    </div>
                 </div>
              </div>
           </div>
        </SystemCard>

        <SystemCard status="warning" class="relative overflow-hidden transition-all hover:border-l-8">
           <div class="p-2.5 relative z-10">
               <SystemHeader 
                 title={$t('dashboard.stats.streaks')}
                 icon={Flame}
                 variant="compact"
                 class="mb-2 text-amber-500"
               />
              <div class="mt-2 space-y-1.5">
                <button 
                  class="w-full flex items-center justify-between bg-background/40 p-1 rounded-md border border-border/20 backdrop-blur-sm hover:bg-amber-500/5 transition-colors group"
                  onclick={() => isScoreBreakdownOpen = true}
                >
                  <span class="text-[8px] font-black tracking-widest text-muted-foreground uppercase group-hover:text-amber-500">{$t('dashboard.stats.rollingScore')}</span>
                  <div class="flex items-center gap-1.5">
                      <span class="font-mono font-bold text-amber-400 text-[9px] bg-amber-500/10 px-1.5 rounded border border-amber-500/20">{gamificationStore.scoreStats.score.toFixed(0)}</span>
                  </div>
                </button>
                <div class="flex items-center justify-between bg-background/40 p-1 rounded-md border border-border/20">
                  <span class="text-[8px] font-black tracking-widest text-muted-foreground uppercase">{$t('dashboard.stats.emotionalControl')}</span>
                  <span class="font-mono font-bold {gamificationStore.streaks.emotionalControlStreak > 0 ? 'text-indigo-400' : 'text-muted-foreground/40'} text-[9px]">{gamificationStore.streaks.emotionalControlStreak}d</span>
                </div>
                <div class="flex items-center justify-between bg-background/40 p-1 rounded-md border border-border/20">
                  <span class="text-[8px] font-black tracking-widest text-muted-foreground uppercase">{$t('dashboard.stats.unbreakableDiscipline')}</span>
                  <span class="font-mono font-bold {gamificationStore.streaks.disciplineStreak > 0 ? 'text-emerald-400' : 'text-muted-foreground/40'} text-[9px]">{gamificationStore.streaks.disciplineStreak}d</span>
                </div>
              </div>
           </div>
        </SystemCard>
      </div>
      </div>
    {/if}
  </div>
{/if}

<ScoreBreakdownSheet bind:open={isScoreBreakdownOpen} />
