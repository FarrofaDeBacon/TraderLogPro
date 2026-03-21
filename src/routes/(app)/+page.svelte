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
  import DailyReviewSheet from "$lib/components/trades/DailyReviewSheet.svelte";
  import ScoreBreakdownSheet from "$lib/components/gamification/ScoreBreakdownSheet.svelte";
  import { dailyReviewsStore } from "$lib/stores/daily-reviews.svelte";
  import { gamificationStore } from "$lib/stores/gamification.svelte";
  import {
    TrendingUp,
    TrendingDown,
    Activity,
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
    Info
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
    return getDashboardStats(
      filteredTrades,
      new Date(),
      (t: any) => tradesStore.getConvertedTradeResult(
          t,
          accountsStore.accounts,
          currenciesStore.currencies
      )
    );
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
  <div class="space-y-6">
    <div class="px-4 pt-4 -mb-8">
      <CurrencyTicker />
    </div>

    {#if tradesStore.trades.length === 0}
      <OnboardingWizard />
    {:else}
      <div class="flex-1 flex flex-col space-y-8 p-4 md:p-8 min-h-screen">
        <Dialog.Root bind:open={isNewTradeOpen}>
        <Dialog.Content
          class="max-w-3xl max-h-[85vh] p-0 border-0 bg-transparent shadow-none"
        >
          <NewTradeWizard close={() => (isNewTradeOpen = false)} />
        </Dialog.Content>
      </Dialog.Root>

      <DailyReviewSheet bind:open={isReviewOpen} date={todayStr} />

      <!-- TOP Navigation & Survivor Hub (Compact Header) -->
      <div
        class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
      >
        <div class="space-y-0.5">
          <h1 class="text-3xl font-bold tracking-tight text-foreground">
            {$t("dashboard.title")}
          </h1>
          <div class="flex items-center gap-3">
            <p class="text-sm text-muted-foreground">
              {$t("dashboard.subtitle")}
            </p>
            <Separator orientation="vertical" class="h-4" />
            <div class="flex items-center gap-2">
              <p class="text-xs font-medium text-muted-foreground/80">
                {$t("dashboard.terminalHub")}
              </p>
              <Select type="single" bind:value={selectedAccountId}>
                <SelectTrigger class="w-[180px] h-8 text-xs font-medium">
                  <div class="flex items-center gap-2">
                    <Wallet class="w-3 h-3 text-muted-foreground shrink-0" />
                    <span class="truncate">
                      {selectedAccountId === "all"
                        ? $t("general.all")
                        : accountsStore.accounts.find(
                            (a) => a.id === selectedAccountId,
                          )?.nickname || $t("trades.filters.account")}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{$t("general.all")}</SelectItem>
                  {#each accountsStore.accounts as acc}
                    <SelectItem value={acc.id}>{acc.nickname}</SelectItem>
                  {/each}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <Button
            onclick={() => (isNewTradeOpen = true)}
            class="bg-emerald-600 hover:bg-emerald-700 shadow-md gap-2 font-semibold px-6"
          >
            <Plus class="w-4 h-4" />
            {$t("dashboard.newTrade")}
          </Button>
        </div>
      </div>

      <!-- BLOCO 5 - Ações Rápidas & Quick Log -->
      <div class="mb-4 bg-card/60 rounded-xl p-5 border border-border/60 shadow-sm">
        <QuickLog />
        <div class="mt-5 flex flex-col sm:flex-row gap-3 justify-end items-center border-t border-border/40 pt-4">
          <Button variant="outline" size="sm" onclick={() => isNewTradeOpen = true} class="w-full sm:w-auto text-[10px] font-bold h-8 uppercase tracking-widest text-muted-foreground hover:text-foreground border-dashed">
            Registro Detalhado (Wizard)
          </Button>
          <Button size="sm" href="/evolution" class="w-full sm:w-auto bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 text-[10px] font-black h-8 uppercase tracking-widest shadow-none gap-2">
            <Brain class="w-3.5 h-3.5 shrink-0" />
            Diário de Evolução
          </Button>
          <Button size="sm" href="/risk-control" class="w-full sm:w-auto bg-indigo-600/10 text-indigo-500 hover:bg-indigo-600/20 border border-indigo-500/20 text-[10px] font-black h-8 uppercase tracking-widest shadow-none gap-2">
            <ShieldCheck class="w-3.5 h-3.5 shrink-0" />
            Cockpit Operacional
          </Button>
          {#if shouldShowReviewCta}
            <Button size="sm" onclick={() => isReviewOpen = true} class="w-full sm:w-auto text-[10px] font-black h-8 uppercase tracking-widest shadow-none gap-2 border {hasReviewedToday ? 'bg-zinc-900 text-muted-foreground border-white/5 hover:bg-zinc-800' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/30 shadow-sm animate-pulse'}">
                <BookOpen class="w-3.5 h-3.5 shrink-0" />
                {hasReviewedToday ? "Revisão Concluída" : "Finalizar Pregão"}
            </Button>
          {/if}
        </div>
      </div>

      <!-- BLOCO PROATIVO: ASSISTENTE DO TRADER -->
      {#if gamificationStore.proactiveSignals.length > 0}
      <div class="mb-4 space-y-3">
        <h3 class="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2 pl-1">
          <Brain class="w-3.5 h-3.5" />
          Assistente do Trader
        </h3>
        <div class="grid grid-cols-1 gap-3">
          {#each gamificationStore.proactiveSignals.slice(0, 1) as signal}
            <div class={cn(
                "p-4 border border-border/50 rounded-xl flex items-start gap-4 transition-colors relative overflow-hidden",
                signal.type === 'warning' ? "bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/30" : 
                signal.type === 'reminder' ? "bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/30" : 
                "bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/30"
            )}>
              <div class={cn(
                  "p-2.5 rounded-full shrink-0 flex items-center justify-center",
                  signal.type === 'warning' ? "bg-rose-500/20 text-rose-500" : 
                  signal.type === 'reminder' ? "bg-amber-500/20 text-amber-500" : 
                  "bg-emerald-500/20 text-emerald-500"
              )}>
                 {#if signal.type === 'warning'} <ShieldAlert class="w-5 h-5" />
                 {:else if signal.type === 'reminder'} <AlertTriangle class="w-5 h-5" />
                 {:else} <Zap class="w-5 h-5" /> {/if}
              </div>
              
              <div class="flex-1 pt-0.5">
                <div class="flex items-center justify-between mb-1.5">
                  <span class={cn(
                      "text-xs font-black uppercase tracking-widest",
                      signal.type === 'warning' ? "text-rose-500" : signal.type === 'reminder' ? "text-amber-500" : "text-emerald-500"
                  )}>
                    {signal.title}
                  </span>
                  <Badge variant="outline" class="text-[8px] uppercase tracking-wider bg-background/50 border-border/40">{signal.type}</Badge>
                </div>
                <p class="text-xs font-medium text-foreground/80 leading-relaxed pr-6">
                  {signal.message}
                </p>
              </div>
            </div>
          {/each}
        </div>
      </div>
      {/if}

      <!-- BLOCO 3: INSIGHT AUTOMÁTICO (Radar Comportamental Fase 5) -->
      <div class="mb-4 space-y-3">
        <h3 class="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 pl-1">
          <Brain class="w-3.5 h-3.5 text-indigo-500" />
          Radar Comportamental (IA Heurística)
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          {#each stats.insights as insight}
            <div class={cn(
                "p-4 border-l-4 border-y border-r border-border/50 rounded-r-xl rounded-l-sm flex flex-col gap-2 transition-colors",
                insight.type === 'danger' ? "bg-rose-500/10 border-l-rose-500 hover:bg-rose-500/20" : 
                insight.type === 'warning' ? "bg-amber-500/10 border-l-amber-500 hover:bg-amber-500/20" : 
                "bg-emerald-500/10 border-l-emerald-500 hover:bg-emerald-500/20"
            )}>
              <div class="flex items-center gap-2">
                {#if insight.type === 'danger'} <ShieldAlert class="w-4 h-4 text-rose-500 shrink-0" />
                {:else if insight.type === 'warning'} <AlertTriangle class="w-4 h-4 text-amber-500 shrink-0" />
                {:else} <Zap class="w-4 h-4 text-emerald-500 shrink-0" /> {/if}
                <span class={cn(
                    "text-[10px] font-black uppercase tracking-widest drop-shadow-sm",
                    insight.type === 'danger' ? "text-rose-500" : insight.type === 'warning' ? "text-amber-500" : "text-emerald-500"
                )}>
                  {insight.title}
                </span>
              </div>
              <p class="text-[11px] font-medium text-foreground/90 leading-snug">
                {insight.description}
              </p>
            </div>
          {/each}
        </div>
      </div>

      <!-- BLOCOS 1, 2 e 4: Resumos Executivos de 3 segundos -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <!-- Bloco 1: Resultado do Dia -->
        <Card class={cn("card-glass border-l-4 transition-all hover:border-l-8", stats.dayResult >= 0 ? "border-l-emerald-500" : "border-l-rose-500")}>
           <CardContent class="p-5">
              <div class="flex items-center justify-between">
                <h3 class="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Calendar class="w-3.5 h-3.5" />
                  P&L de Hoje
                </h3>
              </div>
              <p class={cn("text-4xl lg:text-5xl font-mono font-black mt-3 tracking-tighter truncate", stats.dayResult >= 0 ? "text-emerald-500" : "text-rose-500")}>
                {formatCurrency(stats.dayResult)}
              </p>
              <div class="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
                <p class="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                  Frequência (Trades)
                </p>
                <Badge variant="outline" class="font-mono text-[10px] bg-background/50">{stats.tradesToday}</Badge>
              </div>
           </CardContent>
        </Card>

        <!-- Bloco 4: Resumo da Semana -->
        <Card class={cn("card-glass border-l-4 transition-all hover:border-l-8", stats.weekResult >= 0 ? "border-l-emerald-500" : "border-l-rose-500")}>
           <CardContent class="p-5">
              <div class="flex items-center justify-between">
                <h3 class="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <BarChart3 class="w-3.5 h-3.5" />
                  P&L da Semana
                </h3>
              </div>
              <p class={cn("text-3xl lg:text-4xl font-mono font-black mt-4 tracking-tighter truncate", stats.weekResult >= 0 ? "text-emerald-500" : "text-rose-500")}>
                {formatCurrency(stats.weekResult)}
              </p>
              <div class="flex gap-2 mt-4 relative w-full h-7">
                 <div class="flex-1 flex flex-col justify-center items-center rounded-sm bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 transition-colors hover:bg-emerald-500/20">
                    <div class="flex items-center gap-1">
                       <span class="text-[8px] uppercase font-black tracking-widest">Gain</span>
                       <span class="text-[10px] font-mono font-bold">{stats.weekPositiveDays}d</span>
                    </div>
                 </div>
                 <div class="flex-1 flex flex-col justify-center items-center rounded-sm bg-rose-500/10 border border-rose-500/20 text-rose-600 transition-colors hover:bg-rose-500/20">
                    <div class="flex items-center gap-1">
                       <span class="text-[8px] uppercase font-black tracking-widest">Loss</span>
                       <span class="text-[10px] font-mono font-bold">{stats.weekNegativeDays}d</span>
                    </div>
                 </div>
              </div>
           </CardContent>
        </Card>

        <!-- Bloco 2: Trader Streaks & Score -->
        <Card class="card-glass border-l-4 border-l-amber-500 relative overflow-hidden transition-all hover:border-l-8">
           <div class="absolute -right-4 -top-8 rotate-12 opacity-5 pointer-events-none">
             <Trophy class="w-32 h-32" />
           </div>
           <CardContent class="p-5 relative z-10">
              <h3 class="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                <Flame class="w-4 h-4" />
                Evolution & Streaks
              </h3>
              <div class="mt-4 space-y-3">
                <button 
                  class="w-full flex items-center justify-between bg-background/40 p-2.5 rounded-md border border-border/40 backdrop-blur-sm hover:bg-amber-500/5 hover:border-amber-500/30 transition-colors group cursor-pointer"
                  onclick={() => isScoreBreakdownOpen = true}
                >
                  <span class="flex items-center gap-2 text-[9px] font-black tracking-widest text-muted-foreground uppercase group-hover:text-amber-500 transition-colors">
                    Rolling Score (30T)
                  </span>
                  <div class="flex items-center gap-2">
                      <span class="font-mono font-bold text-amber-400 text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{gamificationStore.scoreStats.score.toFixed(0)}</span>
                      <Info class="w-3 h-3 text-muted-foreground/50 group-hover:text-amber-500 transition-colors" />
                  </div>
                </button>
                <div class="flex items-center justify-between bg-background/40 p-2.5 rounded-md border border-border/40 backdrop-blur-sm">
                  <span class="flex items-center gap-2 text-[9px] font-black tracking-widest text-muted-foreground uppercase">
                    Controle Emocional
                  </span>
                  <span class="font-mono font-bold {gamificationStore.streaks.emotionalControlStreak > 0 ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' : 'text-muted-foreground bg-muted border-muted-foreground/20'} text-xs px-2 py-0.5 rounded border">{gamificationStore.streaks.emotionalControlStreak}d</span>
                </div>
                <div class="flex items-center justify-between bg-background/40 p-2.5 rounded-md border border-border/40 backdrop-blur-sm">
                  <span class="flex items-center gap-2 text-[9px] font-black tracking-widest text-muted-foreground uppercase">
                    Disciplina Inquebrável
                  </span>
                  <span class="font-mono font-bold {gamificationStore.streaks.disciplineStreak > 0 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-muted-foreground bg-muted border-muted-foreground/20'} text-xs px-2 py-0.5 rounded border">{gamificationStore.streaks.disciplineStreak}d</span>
                </div>
                <!-- Secondary Streak -->
                <div class="flex items-center justify-between bg-background/40 p-2 opacity-70 rounded-md border border-border/40 backdrop-blur-sm">
                  <span class="flex items-center gap-2 text-[8px] font-black tracking-widest text-muted-foreground uppercase">
                    Dias de Lucro (Secundário)
                  </span>
                  <span class="font-mono font-bold {gamificationStore.streaks.greenStreak > 0 ? 'text-emerald-400/80 bg-emerald-500/5' : 'text-muted-foreground/50'} text-[10px] px-1.5 py-0.5 rounded border border-transparent">{gamificationStore.streaks.greenStreak}d</span>
                </div>
              </div>
           </CardContent>
        </Card>
      </div>
      </div>
    {/if}
  </div>
{/if}

<ScoreBreakdownSheet bind:open={isScoreBreakdownOpen} />
